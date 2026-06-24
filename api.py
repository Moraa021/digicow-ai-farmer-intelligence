from flask import Flask, jsonify, request
from flask_cors import CORS
from neo4j import GraphDatabase
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # Allows Lovable to call this API

# Neo4j connection
driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI", "bolt://localhost:7687"),
    auth=(os.getenv("NEO4J_USER", "neo4j"), 
          os.getenv("NEO4J_PASSWORD"))
)

# Featherless AI
client = OpenAI(
    base_url="https://api.featherless.ai/v1",
    api_key=os.getenv("FEATHERLESS_API_KEY")
)

# ---------- API ENDPOINTS ----------

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "🐄 DigiCow AI API is running!", "status": "online"})

@app.route('/farmers', methods=['GET'])
def get_farmers():
    """Get all farmers"""
    with driver.session() as session:
        result = session.run("""
            MATCH (f:Farm)
            OPTIONAL MATCH (f)-[:OWNS]->(c:Cow)
            OPTIONAL MATCH (f)-[:AFFECTED_BY]->(d:Disease)
            RETURN f.name as name, f.location as location, f.phone as phone,
                   f.income as income, f.priority_score as priority,
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
                "priority": record.get('priority') or 0,
                "cows": record.get('cows') or [],
                "diseases": record.get('diseases') or []
            })
    return jsonify(farmers)

@app.route('/farmers/<name>', methods=['GET'])
def get_farmer(name):
    """Get single farmer details"""
    with driver.session() as session:
        result = session.run("""
            MATCH (f:Farm {name: $name})
            OPTIONAL MATCH (f)-[:OWNS]->(c:Cow)
            OPTIONAL MATCH (f)-[:AFFECTED_BY]->(d:Disease)
            OPTIONAL MATCH (f)-[:HAS_SOIL]->(s:Soil)
            RETURN f.name as name, f.location as location, f.phone as phone,
                   f.income as income, f.priority_score as priority,
                   COLLECT(DISTINCT c.breed) as cows,
                   COLLECT(DISTINCT d.name) as diseases,
                   COLLECT(DISTINCT s.type) as soil_types
        """, {"name": name})
        data = result.single()
        if data:
            return jsonify({
                "name": data.get('name'),
                "location": data.get('location') or 'N/A',
                "phone": data.get('phone') or 'N/A',
                "income": data.get('income') or 0,
                "priority": data.get('priority') or 0,
                "cows": data.get('cows') or [],
                "diseases": data.get('diseases') or [],
                "soil_types": data.get('soil_types') or []
            })
    return jsonify({"error": "Farmer not found"}), 404

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

@app.route('/farmers/add', methods=['POST'])
def add_farmer():
    """Add a new farmer"""
    data = request.json
    name = data.get('name')
    
    if not name:
        return jsonify({"error": "name is required"}), 400
    
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
                priority_score: 25
            })
        """, {
            "name": name,
            "location": data.get('location', ''),
            "phone": data.get('phone', ''),
            "income": data.get('income', 0),
            "acreage": data.get('acreage', 0)
        })
        
        # Add cows if provided
        for breed in data.get('cows', []):
            if breed:
                session.run("""
                    MATCH (f:Farm {name: $name})
                    CREATE (c:Cow {id: randomUUID(), breed: $breed, milk_yield: 20})
                    CREATE (f)-[:OWNS]->(c)
                """, {"name": name, "breed": breed})
    
    return jsonify({"message": f"Farmer {name} added successfully!"})

@app.route('/farmers/<name>', methods=['PUT'])
def edit_farmer(name):
    """Edit an existing farmer's details"""
    data = request.json
    
    with driver.session() as session:
        # Check if the farmer exists first
        check = session.run("MATCH (f:Farm {name: $name}) RETURN f", {"name": name})
        if not check.single():
            return jsonify({"error": "Farmer not found"}), 404
        
        # Update properties dynamically using the SET clause
        session.run("""
            MATCH (f:Farm {name: $name})
            SET f.location = $location,
                f.phone = $phone,
                f.income = $income,
                f.acreage = $acreage
        """, {
            "name": name,
            "location": data.get('location', ''),
            "phone": data.get('phone', ''),
            "income": data.get('income', 0),
            "acreage": data.get('acreage', 0)
        })
        
    return jsonify({"message": f"Farmer {name} updated successfully!"})


@app.route('/farmers/<name>', methods=['DELETE'])
def delete_farmer(name):
    """Delete a farmer and detach all related nodes/relationships"""
    with driver.session() as session:
        # Check if the farmer exists
        check = session.run("MATCH (f:Farm {name: $name}) RETURN f", {"name": name})
        if not check.single():
            return jsonify({"error": "Farmer not found"}), 404
        
        # DETACH DELETE removes the farm node and any connected lines (OWNS, AFFECTED_BY, etc.)
        session.run("""
            MATCH (f:Farm {name: $name})
            DETACH DELETE f
        """, {"name": name})
        
    return jsonify({"message": f"Farmer {name} deleted successfully!"})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)