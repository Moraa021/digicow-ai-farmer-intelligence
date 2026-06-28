from flask import Flask, jsonify, request
from flask_cors import CORS
from neo4j import GraphDatabase
import sqlite3
import requests
import json
import time
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Initialize as a clean, lightweight standalone API server
app = Flask(__name__)
CORS(app)  # Allows your separate frontend domain to freely make API requests

# Neo4j connection
driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI", "bolt://localhost:7687"),
    auth=(os.getenv("NEO4J_USER", "neo4j"), 
          os.getenv("NEO4J_PASSWORD"))
)

# ---------- SQLite fallback (offline mode) ----------
SQLITE_PATH = os.path.join(os.path.dirname(__file__), "digicow_offline.db")

def ensure_sqlite():
    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS farmers (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE,
        location TEXT,
        phone TEXT,
        income REAL,
        acreage REAL,
        priority_score REAL,
        milk_production REAL,
        cow_count INTEGER,
        priority_override_score REAL,
        priority_override_reason TEXT,
        priority_override_updated_at INTEGER
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS cows (
        id TEXT PRIMARY KEY,
        farmer_name TEXT,
        breed TEXT,
        milk_yield REAL
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS diseases (
        id TEXT PRIMARY KEY,
        farmer_name TEXT,
        name TEXT
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS advisories (
        id TEXT PRIMARY KEY,
        farmer_name TEXT,
        topic TEXT,
        note TEXT,
        created_at INTEGER
    )
    """)
    conn.commit()
    conn.close()

ensure_sqlite()


def ensure_sqlite_columns():
    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(farmers)")
    columns = {row[1] for row in cur.fetchall()}
    for name, definition in [
        ("priority_override_score", "REAL"),
        ("priority_override_reason", "TEXT"),
        ("priority_override_updated_at", "INTEGER"),
    ]:
        if name not in columns:
            cur.execute(f"ALTER TABLE farmers ADD COLUMN {name} {definition}")
    conn.commit()
    conn.close()


ensure_sqlite_columns()


def get_priority_override_from_store(name):
    try:
        with driver.session() as session:
            record = session.run(
                """
                MATCH (f:Farm {name: $name})
                RETURN f.priority_override_score as score,
                       f.priority_override_reason as reason,
                       f.priority_override_updated_at as updatedAt
                """,
                {"name": name},
            ).single()
            if record and (record.get("score") is not None or record.get("reason") is not None):
                return {
                    "score": record.get("score"),
                    "reason": record.get("reason") or "",
                    "updatedAt": record.get("updatedAt") or 0,
                }
    except Exception as e:
        print(f"api.py: get_priority_override_from_store Neo4j exception for {name}: {e}")

    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT priority_override_score, priority_override_reason, priority_override_updated_at FROM farmers WHERE name = ?",
        (name,),
    )
    row = cur.fetchone()
    conn.close()
    if row and (row[0] is not None or row[1] is not None):
        return {
            "score": row[0],
            "reason": row[1] or "",
            "updatedAt": row[2] or 0,
        }
    return None


def set_priority_override_in_store(name, score, reason):
    updated_at = int(time.time() * 1000)
    override = {"score": round(float(score)), "reason": reason or "", "updatedAt": updated_at}
    try:
        with driver.session() as session:
            session.run(
                """
                MATCH (f:Farm {name: $name})
                SET f.priority_override_score = $score,
                    f.priority_override_reason = $reason,
                    f.priority_override_updated_at = $updatedAt
                """,
                {"name": name, "score": override["score"], "reason": override["reason"], "updatedAt": override["updatedAt"]},
            )
        return override
    except Exception as e:
        print(f"api.py: set_priority_override_in_store Neo4j exception for {name}: {e}")

    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT 1 FROM farmers WHERE name = ?",
        (name,),
    )
    exists = cur.fetchone()
    if exists:
        cur.execute(
            "UPDATE farmers SET priority_override_score = ?, priority_override_reason = ?, priority_override_updated_at = ? WHERE name = ?",
            (override["score"], override["reason"], override["updatedAt"], name),
        )
    else:
        cur.execute(
            "INSERT INTO farmers (id, name, location, phone, income, acreage, priority_score, milk_production, cow_count, priority_override_score, priority_override_reason, priority_override_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (name, name, "", "", 0, 0, 0, 0, 0, override["score"], override["reason"], override["updatedAt"]),
        )
    conn.commit()
    conn.close()
    return override


def clear_priority_override_in_store(name):
    try:
        with driver.session() as session:
            session.run(
                """
                MATCH (f:Farm {name: $name})
                REMOVE f.priority_override_score,
                       f.priority_override_reason,
                       f.priority_override_updated_at
                """,
                {"name": name},
            )
    except Exception as e:
        print(f"api.py: clear_priority_override_in_store Neo4j exception for {name}: {e}")

    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    cur.execute(
        "UPDATE farmers SET priority_override_score = NULL, priority_override_reason = NULL, priority_override_updated_at = NULL WHERE name = ?",
        (name,),
    )
    conn.commit()
    conn.close()
    return None


def get_effective_priority(name, fallback_score):
    override = get_priority_override_from_store(name)
    if override:
        return override.get("score", fallback_score or 0)
    return fallback_score or 0


def compute_priority_score(farmer_props, cows, diseases):
    # Base score starts at 50
    score = 50.0
    # Fewer income -> higher priority
    try:
        income = float(farmer_props.get("income", 0) or 0)
        if income <= 0:
            score += 20
        else:
            score += max(0, 15 - (income / 10000))
    except Exception:
        score += 10

    # More diseases -> higher priority
    score += len(diseases) * 12

    # Low milk production -> higher priority
    try:
        milk = float(farmer_props.get("milk_production", 0) or 0)
        if milk <= 5:
            score += 15
        else:
            score += max(0, 5 - (milk / 10))
    except Exception:
        pass

    # Number of cows affects priority slightly
    try:
        counted_cows = int(farmer_props.get("cow_count", len(cows)))
    except Exception:
        counted_cows = len(cows)
    score += max(0, 5 - counted_cows)

    # Clamp
    return max(0, min(100, round(score)))

def sqlite_get_farmers():
    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    cur.execute("SELECT name, location, phone, income, priority_score, cow_count FROM farmers ORDER BY priority_score DESC")
    rows = cur.fetchall()
    farmers = []
    for r in rows:
        farmers.append({
            "name": r[0],
            "location": r[1] or 'N/A',
            "phone": r[2] or 'N/A',
            "income": r[3] or 0,
            "priority": r[4] or 0,
            "cow_count": r[5] or 0,
            "cows": [],
            "diseases": []
        })
    conn.close()
    return farmers

def sqlite_get_farmer(name):
    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    cur.execute("SELECT name, location, phone, income, priority_score, milk_production, cow_count FROM farmers WHERE name = ?", (name,))
    r = cur.fetchone()
    if not r:
        conn.close()
        return None
    cur.execute("SELECT breed FROM cows WHERE farmer_name = ?", (name,))
    cows = [row[0] for row in cur.fetchall()]
    cur.execute("SELECT name FROM diseases WHERE farmer_name = ?", (name,))
    diseases = [row[0] for row in cur.fetchall()]
    conn.close()
    return {
        "name": r[0],
        "location": r[1] or 'N/A',
        "phone": r[2] or 'N/A',
        "income": r[3] or 0,
        "priority": r[4] or 0,
        "milk_production": r[5] or 0,
        "cow_count": r[6] or 0,
        "cows": cows,
        "diseases": diseases,
    }

def sqlite_add_farmer(data):
    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    fid = data.get('id') or str(data.get('name'))
    cur.execute("INSERT OR IGNORE INTO farmers (id, name, location, phone, income, acreage, priority_score, milk_production, cow_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", (
        fid,
        data.get('name'),
        data.get('location', ''),
        data.get('phone', ''),
        data.get('income', 0),
        data.get('acreage', 0),
        data.get('priority_score', 25),
        data.get('milk_production', 0),
        data.get('cow_count', len(data.get('cows', []))),
    ))
    for breed in data.get('cows', []):
        if breed:
            cid = f"{fid}-{breed}"
            cur.execute("INSERT OR IGNORE INTO cows (id, farmer_name, breed, milk_yield) VALUES (?, ?, ?, ?)", (cid, data.get('name'), breed, data.get('milk_production', 0)))
    for d in data.get('diseases', []):
        did = f"{fid}-d-{d}"
        cur.execute("INSERT OR IGNORE INTO diseases (id, farmer_name, name) VALUES (?, ?, ?)", (did, data.get('name'), d))
    conn.commit()
    conn.close()

def sqlite_edit_farmer(name, data):
    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    cur.execute("UPDATE farmers SET location = ?, phone = ?, income = ?, acreage = ?, milk_production = ?, cow_count = ? WHERE name = ?", (
        data.get('location', ''),
        data.get('phone', ''),
        data.get('income', 0),
        data.get('acreage', 0),
        data.get('milk_production', 0),
        data.get('cow_count', len(data.get('cows', []))),
        name,
    ))
    # Replace cows
    cur.execute("DELETE FROM cows WHERE farmer_name = ?", (name,))
    for breed in data.get('cows', []):
        if breed:
            cid = f"{name}-{breed}"
            cur.execute("INSERT OR IGNORE INTO cows (id, farmer_name, breed, milk_yield) VALUES (?, ?, ?, ?)", (cid, name, breed, data.get('milk_production', 0)))
    # Replace diseases
    cur.execute("DELETE FROM diseases WHERE farmer_name = ?", (name,))
    for d in data.get('diseases', []):
        did = f"{name}-d-{d}"
        cur.execute("INSERT OR IGNORE INTO diseases (id, farmer_name, name) VALUES (?, ?, ?)", (did, name, d))
    conn.commit()
    conn.close()


def sqlite_delete_farmer(name):
    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM cows WHERE farmer_name = ?", (name,))
    cur.execute("DELETE FROM diseases WHERE farmer_name = ?", (name,))
    cur.execute("DELETE FROM farmers WHERE name = ?", (name,))
    conn.commit()
    conn.close()


# Featherless AI
client = OpenAI(
    base_url="https://api.featherless.ai/v1",
    api_key=os.getenv("FEATHERLESS_API_KEY")
)

# ---------- SERVICE CORE & HEALTH ENDPOINTS ----------

@app.route('/', methods=['GET'])
@app.route('/api/status', methods=['GET'])
def api_status():
    """Simple healthcheck endpoint indicating backend availability"""
    return jsonify({"message": "🐄 DigiCow AI API is running independently!", "status": "online"})


# ---------- FARMER ENDPOINTS ----------

@app.route('/farmers', methods=['GET'])
def get_farmers():
    """Get all farmers"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (f:Farm)
                OPTIONAL MATCH (f)-[:OWNS]->(c:Cow)
                OPTIONAL MATCH (f)-[:AFFECTED_BY]->(d:Disease)
                RETURN f.name as name, f.location as location, f.phone as phone,
                       f.income as income, f.priority_score as priority,
                       f.milk_production as milk_production, f.cow_count as cow_count,
                       COLLECT(DISTINCT c.breed) as cows,
                       COLLECT(DISTINCT d.name) as diseases
                ORDER BY f.priority_score DESC
            """)
            farmers = []
            for record in result:
                farmers.append({
                    "name": record.get('name'),
                    "location": record.get('location') or 'N/A',
                    "phone": record.get('phone') or 'N/A',
                    "income": record.get('income') or 0,
                    "priority": get_effective_priority(record.get('name'), record.get('priority') or 0),
                    "milk_production": record.get('milk_production') or 0,
                    "cow_count": record.get('cow_count') if record.get('cow_count') is not None else len(record.get('cows') or []),
                    "cows": record.get('cows') or [],
                    "diseases": record.get('diseases') or []
                })
        if farmers:
            print('api.py: get_farmers served from Neo4j, count=', len(farmers))
            return jsonify(farmers)
        print('api.py: get_farmers falling back to SQLite because Neo4j returned no records')
        return jsonify(sqlite_get_farmers())
    except Exception as e:
        print('api.py: get_farmers exception, falling back to SQLite:', str(e))
        return jsonify(sqlite_get_farmers())

@app.route('/farmers/<name>', methods=['GET'])
def get_farmer(name):
    """Get single farmer details"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (f:Farm {name: $name})
                OPTIONAL MATCH (f)-[:OWNS]->(c:Cow)
                OPTIONAL MATCH (f)-[:AFFECTED_BY]->(d:Disease)
                OPTIONAL MATCH (f)-[:HAS_SOIL]->(s:Soil)
                RETURN f.name as name, f.location as location, f.phone as phone,
                       f.income as income, f.priority_score as priority,
                       f.milk_production as milk_production, f.cow_count as cow_count,
                       COLLECT(DISTINCT c.breed) as cows,
                       COLLECT(DISTINCT d.name) as diseases,
                       COLLECT(DISTINCT s.type) as soil_types
            """, {"name": name})
            data = result.single()
            if data:
                print(f'api.py: get_farmer served from Neo4j for {name}')
                return jsonify({
                    "name": data.get('name'),
                    "location": data.get('location') or 'N/A',
                    "phone": data.get('phone') or 'N/A',
                    "income": data.get('income') or 0,
                    "priority": get_effective_priority(data.get('name'), data.get('priority') or 0),
                    "milk_production": data.get('milk_production') or 0,
                    "cow_count": data.get('cow_count') if data.get('cow_count') is not None else len(data.get('cows') or []),
                    "cows": data.get('cows') or [],
                    "diseases": data.get('diseases') or [],
                    "soil_types": data.get('soil_types') or []
                })
            print(f'api.py: get_farmer no Neo4j record found for {name}, falling back to SQLite')
    except Exception as e:
        print(f'api.py: get_farmer Neo4j exception for {name}, falling back to SQLite: {e}')
    f = sqlite_get_farmer(name)
    if f:
        print(f'api.py: get_farmer served from SQLite for {name}')
        return jsonify(f)
    print(f'api.py: get_farmer no record found for {name}')
    return jsonify({"error": "Farmer not found"}), 404

@app.route('/farmers/add', methods=['POST'])
def add_farmer():
    """Add a new farmer"""
    data = request.json
    name = data.get('name')
    
    if not name:
        return jsonify({"error": "name is required"}), 400
    
    # Prepare values and compute priority
    cows = data.get('cows', []) or []
    diseases = data.get('diseases', []) or []
    milk = data.get('milk_production', 0)
    priority = compute_priority_score(data, cows, diseases)
    try:
        with driver.session() as session:
            # Check if exists
            check = session.run("MATCH (f:Farm {name: $name}) RETURN f", {"name": name})
            if check.single():
                return jsonify({"error": "Farmer already exists"}), 409

            # Create farmer
            session.run("""
                CREATE (f:Farm {
                    id: randomUUID(),
                    name: $name,
                    location: $location,
                    phone: $phone,
                    income: $income,
                    acreage: $acreage,
                    priority_score: $priority,
                    milk_production: $milk,
                    cow_count: $cow_count
                })
            """, {
                "name": name,
                "location": data.get('location', ''),
                "phone": data.get('phone', ''),
                "income": data.get('income', 0),
                "acreage": data.get('acreage', 0),
                "priority": priority,
                "milk": milk,
                "cow_count": data.get('cow_count', len(cows)),
            })

            # Add cows if provided
            for breed in cows:
                if breed:
                    session.run("""
                        MATCH (f:Farm {name: $name})
                        CREATE (c:Cow {id: randomUUID(), breed: $breed, milk_yield: $milk})
                        CREATE (f)-[:OWNS]->(c)
                    """, {"name": name, "breed": breed, "milk": milk})

            # Add diseases if provided
            for d in diseases:
                if d:
                    session.run("""
                        MATCH (f:Farm {name: $name})
                        MERGE (d:Disease {name: $dname})
                        ON CREATE SET d.id = randomUUID()
                        MERGE (f)-[:AFFECTED_BY]->(d)
                    """, {"name": name, "dname": d})
        # Return created farmer object
        farmer_obj = {
            "name": name,
            "location": data.get('location', ''),
            "phone": data.get('phone', ''),
            "income": data.get('income', 0),
            "priority": priority,
            "cow_count": data.get('cow_count', len(cows)),
            "cows": cows,
            "diseases": diseases,
            "milk_production": milk,
        }
        return jsonify(farmer_obj)
    except Exception:
        # Fallback to sqlite
        sqlite_add_farmer({
            "name": name,
            "location": data.get('location', ''),
            "phone": data.get('phone', ''),
            "income": data.get('income', 0),
            "acreage": data.get('acreage', 0),
            "cows": cows,
            "diseases": diseases,
            "priority_score": priority,
            "milk_production": milk,
            "cow_count": data.get('cow_count', len(cows)),
        })
        farmer_obj = {
            "name": name,
            "location": data.get('location', ''),
            "phone": data.get('phone', ''),
            "income": data.get('income', 0),
            "priority": priority,
            "cow_count": data.get('cow_count', len(cows)),
            "cows": cows,
            "diseases": diseases,
            "milk_production": milk,
        }
        return jsonify(farmer_obj)

@app.route('/farmers/<name>', methods=['PUT'])
def edit_farmer(name):
    """Edit an existing farmer's details"""
    try:
        data = request.json
        
        cows = data.get('cows', []) or []
        diseases = data.get('diseases', []) or []
        milk = data.get('milk_production', 0)
        priority = compute_priority_score(data, cows, diseases)
        try:
            with driver.session() as session:
                # Check if farmer exists
                check = session.run("MATCH (f:Farm {name: $name}) RETURN f", {"name": name})
                if not check.single():
                    return jsonify({"error": f"Farmer '{name}' not found"}), 404

                # Update basic farmer properties
                session.run("""
                    MATCH (f:Farm {name: $name})
                    SET f.location = $location,
                        f.phone = $phone,
                        f.income = $income,
                        f.acreage = $acreage,
                        f.priority_score = $priority,
                        f.milk_production = $milk,
                        f.cow_count = $cow_count
                """, {
                    "name": name,
                    "location": data.get('location', ''),
                    "phone": data.get('phone', ''),
                    "income": data.get('income', 0),
                    "acreage": data.get('acreage', 0),
                    "priority": priority,
                    "milk": milk,
                    "cow_count": data.get('cow_count', len(cows)),
                })

                # Remove existing cows and recreate
                session.run("""
                    MATCH (f:Farm {name: $name})-[r:OWNS]->(c:Cow)
                    DELETE r, c
                """, {"name": name})
                for breed in cows:
                    if breed:
                        session.run("""
                            MATCH (f:Farm {name: $name})
                            CREATE (c:Cow {id: randomUUID(), breed: $breed, milk_yield: $milk})
                            CREATE (f)-[:OWNS]->(c)
                        """, {"name": name, "breed": breed, "milk": milk})

                # Remove existing disease relationships and recreate with MERGE so we keep shared disease nodes
                session.run("""
                    MATCH (f:Farm {name: $name})-[r:AFFECTED_BY]->(d:Disease)
                    DELETE r
                """, {"name": name})
                for d in diseases:
                    if d:
                        session.run("""
                            MATCH (f:Farm {name: $name})
                            MERGE (d:Disease {name: $dname})
                            ON CREATE SET d.id = randomUUID()
                            MERGE (f)-[:AFFECTED_BY]->(d)
                        """, {"name": name, "dname": d})

            # Return updated farmer object
            farmer_obj = {
                "name": name,
                "location": data.get('location', ''),
                "phone": data.get('phone', ''),
                "income": data.get('income', 0),
                "priority": priority,
                "cow_count": data.get('cow_count', len(cows)),
                "cows": cows,
                "diseases": diseases,
                "milk_production": milk,
            }
            return jsonify(farmer_obj)
        except Exception:
            # Fallback to sqlite
            sqlite_edit_farmer(name, {
                "location": data.get('location', ''),
                "phone": data.get('phone', ''),
                "income": data.get('income', 0),
                "acreage": data.get('acreage', 0),
                "cows": cows,
                "diseases": diseases,
                "milk_production": milk,
                "cow_count": data.get('cow_count', len(cows)),
            })
            farmer_obj = {
                "name": name,
                "location": data.get('location', ''),
                "phone": data.get('phone', ''),
                "income": data.get('income', 0),
                "priority": priority,
                "cow_count": data.get('cow_count', len(cows)),
                "cows": cows,
                "diseases": diseases,
                "milk_production": milk,
            }
            return jsonify(farmer_obj)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- PRIORITY OVERRIDE ENDPOINTS ----------

@app.route('/priority-override/<name>', methods=['GET'])
def get_priority_override_route(name):
    override = get_priority_override_from_store(name)
    return jsonify(override)


@app.route('/priority-override/<name>', methods=['PUT'])
def save_priority_override_route(name):
    data = request.json or {}
    score = data.get('score')
    reason = data.get('reason', '')
    if score is None:
        return jsonify({"error": "score is required"}), 400
    override = set_priority_override_in_store(name, score, reason)
    return jsonify(override)


@app.route('/priority-override/<name>', methods=['DELETE'])
def delete_priority_override_route(name):
    clear_priority_override_in_store(name)
    return jsonify(None)


# ---------- AI RECOMENDATION ENDPOINT ----------

@app.route('/recommend', methods=['POST'])
def recommend():
    """Generate AI recommendation for a farmer"""
    data = request.json
    farmer_name = data.get('farmer_name')
    
    if not farmer_name:
        return jsonify({"error": "farmer_name is required"}), 400
    
    # Get farmer context
    with driver.session() as session:
        result = session.run("""
            MATCH (f:Farm {name: $name})
            OPTIONAL MATCH (f)-[:OWNS]->(c:Cow)
            OPTIONAL MATCH (f)-[:AFFECTED_BY]->(d:Disease)
            OPTIONAL MATCH (d)<-[:TREATS]-(a:Advisory)
            RETURN f.name as name, f.location as location, f.income as income,
                   COLLECT(DISTINCT c.breed) as cows,
                   COLLECT(DISTINCT d.name) as diseases,
                   COLLECT(DISTINCT a.title) as treatments
        """, {"name": farmer_name})
        farmer = result.single()
        
        if not farmer:
            return jsonify({"error": "Farmer not found"}), 404
    
    # Build prompt
    prompt = f"""
    You are an agricultural extension advisor for DigiCow Africa Ltd in Kenya.

    Farmer: {farmer['name']}
    Location: {farmer['location']}
    Cows: {', '.join(farmer['cows']) if farmer['cows'] else 'None'}
    Diseases: {', '.join(farmer['diseases']) if farmer['diseases'] else 'None reported'}
    Treatments: {', '.join(farmer['treatments']) if farmer['treatments'] else 'General advisory'}

    IMPORTANT:

    Respond in EXACTLY the following format:

    ENGLISH:
    <recommendation in English>

    SWAHILI:
    <same recommendation translated into Swahili>

    Requirements:
    - 4-5 sentences in English
    - Translate the same advice into Swahili
    - Mention practical next steps
    - Reference KALRO or ILRI
    - Do not omit either language
    """
    
    try:
        response = client.chat.completions.create(
            model="moonshotai/Kimi-K2-Instruct-0905",
            messages=[
              {
                "role": "system",
                "content": """
                You are an agricultural extension expert in Kenya.

                Every response MUST contain:
                1. ENGLISH section
                2. SWAHILI section

                Never respond in only one language.
                 """
             },
             {
             "role": "user",
             "content": prompt
             }
           ],
            temperature=0.7,
            max_tokens=400
        )
        return jsonify({
            "recommendation": response.choices[0].message.content,
            "farmer": farmer['name']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/farmers/delete/<name>', methods=['DELETE'])
def delete_farmer(name):
    """Delete a farmer from Neo4j or SQLite fallback."""
    try:
        with driver.session() as session:
            # Delete farmer and owned cow nodes cleanly while keeping shared disease nodes.
            session.run("""
                MATCH (f:Farm {name: $name})
                OPTIONAL MATCH (f)-[:OWNS]->(c:Cow)
                DETACH DELETE f, c
            """, {"name": name})
        return jsonify({"message": "Farmer deleted"})
    except Exception as e:
        print(f'api.py: delete_farmer Neo4j exception for {name}: {e}')
        sqlite_delete_farmer(name)
        return jsonify({"message": "Farmer deleted (SQLite fallback)"})


# ---------- SMS sending (Africastaking) ----------
def normalize_phone_number(phone):
    if not phone:
        return phone

    value = str(phone).strip()
    if not value:
        return value

    value = value.replace(' ', '').replace('-', '')
    if value.startswith('+'):
        return value
    if value.startswith('00'):
        return '+' + value[2:]
    if value.startswith('0') and len(value) == 10:
        return '+254' + value[1:]
    return value


@app.route('/send-sms', methods=['POST'])
def send_sms():
    """Send SMS via Africastaking. Expects JSON: {to, message} """
    data = request.get_json(silent=True) or {}
    to = data.get('to')
    message = data.get('message')
    if not to or not message:
        return jsonify({"error": "to and message are required"}), 400

    api_key = os.getenv('AFRICASTAKING_API_KEY')
    username = os.getenv('AFRICASTAKING_USERNAME')
    if not api_key:
        return jsonify({"error": "AFRICASTAKING_API_KEY is not configured"}), 500
    if not username:
        return jsonify({"error": "AFRICASTAKING_USERNAME is not configured"}), 500

    normalized_to = normalize_phone_number(to)
    url = os.getenv('AFRICASTAKING_URL', 'https://api.africastalking.com/version1/messaging')
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'apiKey': api_key,
    }
    payload = {
        'username': username,
        'to': normalized_to,
        'message': message,
    }
    try:
        resp = requests.post(url, data=payload, headers=headers, timeout=10)
        print('api.py: send_sms request', url, payload, 'status', resp.status_code, 'body', resp.text)
        if resp.status_code >= 200 and resp.status_code < 300:
            return jsonify({"message": "SMS sent", "response": resp.text})
        return jsonify({"error": "SMS provider error", "detail": resp.text}), 502
    except Exception as e:
        print('api.py: send_sms exception', str(e))
        return jsonify({"error": "Failed to send SMS", "detail": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv("PORT", 5000)))
