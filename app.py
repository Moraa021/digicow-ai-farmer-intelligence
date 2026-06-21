import os
import time
import random
from neo4j import GraphDatabase
from openai import OpenAI
from dotenv import load_dotenv
import streamlit as st
import pandas as pd
from datetime import datetime
import base64
from io import BytesIO

# Page config - MUST BE FIRST
st.set_page_config(
    page_title="DigiCow AI - Farmer Intelligence System",
    page_icon="🐄",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Load environment
load_dotenv()

# --- Custom CSS for Premium UI ---
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(135deg, #1a472a 0%, #2d7d3a 100%);
        padding: 1.5rem 2rem;
        border-radius: 15px;
        color: white;
        margin-bottom: 2rem;
        box-shadow: 0 4px 20px rgba(26, 71, 42, 0.3);
    }
    .main-header h1 {
        font-size: 2.5rem;
        font-weight: 700;
        margin: 0;
        color: white;
    }
    .main-header p {
        margin: 0;
        opacity: 0.9;
        font-size: 1.1rem;
    }
    .priority-critical { background: #dc3545; color: white; padding: 4px 14px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; display: inline-block; }
    .priority-high { background: #ff6b35; color: white; padding: 4px 14px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; display: inline-block; }
    .priority-medium { background: #f7c948; color: #333; padding: 4px 14px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; display: inline-block; }
    .priority-low { background: #4caf50; color: white; padding: 4px 14px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; display: inline-block; }
    .stat-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border-left: 4px solid #2d7d3a; transition: transform 0.2s; height: 100%; }
    .stat-card:hover { transform: translateY(-3px); box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
    .stat-card .label { font-size: 0.85rem; color: #666; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-card .value { font-size: 2rem; font-weight: 700; color: #1a472a; margin-top: 4px; }
    .disease-card { background: #fef3f2; border-left: 4px solid #dc3545; border-radius: 8px; padding: 0.8rem 1.2rem; margin-bottom: 0.5rem; }
    .disease-card.critical { background: #fee2e2; border-left-color: #991b1b; }
    .rec-box { background: linear-gradient(135deg, #f8fafc 0%, #e8f5e9 100%); border-radius: 12px; padding: 1.5rem; border: 1px solid #c8e6c9; margin-top: 0.5rem; }
    .stButton > button { background: linear-gradient(135deg, #1a472a 0%, #2d7d3a 100%); color: white; font-weight: 600; border: none; padding: 0.6rem 2rem; border-radius: 8px; transition: all 0.3s; width: 100%; }
    .stButton > button:hover { transform: scale(1.02); box-shadow: 0 4px 16px rgba(45, 125, 58, 0.4); color: white; }
    .footer { text-align: center; padding: 2rem 0 0.5rem 0; color: #888; font-size: 0.85rem; border-top: 1px solid #e8e8e8; margin-top: 2rem; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeInUp 0.6s ease-out; }
    .success-message { background: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px; padding: 1rem; color: #1a472a; margin: 1rem 0; }
    .export-box { background: #f0f4f0; border: 1px dashed #2d7d3a; border-radius: 10px; padding: 1.5rem; margin: 1rem 0; }
    .export-box h4 { color: #1a472a; margin-top: 0; }
</style>
""", unsafe_allow_html=True)

# --- PDF Generation Functions ---
def generate_pdf_html(df, title="DigiCow Farmers Report"):
    """Generate HTML for PDF conversion"""
    html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; padding: 30px; }}
            h1 {{ color: #1a472a; border-bottom: 3px solid #2d7d3a; padding-bottom: 10px; }}
            h2 {{ color: #1a472a; margin-top: 20px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            th {{ background: #1a472a; color: white; padding: 10px; text-align: left; }}
            td {{ padding: 8px 10px; border-bottom: 1px solid #ddd; }}
            tr:nth-child(even) {{ background: #f5f7f5; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; }}
            .priority-high {{ color: #dc3545; font-weight: bold; }}
            .priority-medium {{ color: #ff6b35; font-weight: bold; }}
            .priority-low {{ color: #4caf50; font-weight: bold; }}
            .meta {{ color: #666; font-size: 14px; margin: 5px 0; }}
        </style>
    </head>
    <body>
        <h1>🐄 DigiCow AI - Farmers Report</h1>
        <p class="meta">📅 Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        <p class="meta">📊 Total Farmers: {len(df)}</p>
        <hr>
        <h2>Farmer Details</h2>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Farmer Name</th>
                    <th>Location</th>
                    <th>Phone</th>
                    <th>Income (KES)</th>
                    <th>Priority</th>
                    <th>Cows</th>
                    <th>Diseases</th>
                    <th>Soil</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for idx, row in df.iterrows():
        # Priority styling
        priority = row.get('Priority', 0)
        priority_class = "priority-high" if priority >= 75 else "priority-medium" if priority >= 25 else "priority-low"
        
        html += f"""
        <tr>
            <td>{idx + 1}</td>
            <td><strong>{row['Name']}</strong></td>
            <td>{row['Location']}</td>
            <td>{row['Phone']}</td>
            <td>{row['Income']}</td>
            <td class="{priority_class}">{row['Priority']}/100</td>
            <td>{row['Cows']}</td>
            <td>{row['Diseases']}</td>
            <td>{row['Soil']}</td>
        </tr>
        """
    
    html += f"""
            </tbody>
        </table>
        
        <h2>📊 Summary Statistics</h2>
        <ul>
            <li><strong>Total Farmers:</strong> {len(df)}</li>
            <li><strong>Average Priority Score:</strong> {df['Priority'].mean():.1f}/100</li>
            <li><strong>Farmers with Diseases:</strong> {len(df[df['Diseases'] != '✅ Healthy'])}</li>
            <li><strong>Farmers with Cows:</strong> {len(df[df['Cows'] != 'None'])}</li>
        </ul>
        
        <div class="footer">
            <p>🐄 DigiCow Africa Ltd | 🤖 Powered by Featherless AI | 📊 Neo4j Graph Database</p>
            <p>Kenya AI Challenge 2026 | AgriFin Track</p>
        </div>
    </body>
    </html>
    """
    return html

# --- Neo4j Connection ---
class Neo4jConnection:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            os.getenv("NEO4J_URI", "bolt://localhost:7687"),
            auth=(os.getenv("NEO4J_USER", "neo4j"), 
                  os.getenv("NEO4J_PASSWORD"))
        )
    
    def close(self):
        self.driver.close()
    
    def query(self, query, parameters=None):
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]

# --- Featherless AI ---
@st.cache_resource
def get_featherless():
    return OpenAI(
        base_url="https://api.featherless.ai/v1",
        api_key=os.getenv("FEATHERLESS_API_KEY")
    )

@st.cache_resource
def get_neo4j():
    return Neo4jConnection()

# --- Initialize ---
try:
    neo4j = get_neo4j()
    featherless = get_featherless()
except Exception as e:
    st.error(f"⚠️ Connection error: {e}")
    st.stop()

# --- Sidebar ---
with st.sidebar:
    st.markdown("### 🌾 DigiCow AI")
    st.markdown("---")
    
    st.markdown("**👨‍🌾 Extension Agent Dashboard**")
    st.caption("Welcome back, Agent!")
    
    st.markdown("---")
    
    farmers = neo4j.query("MATCH (f:Farm) RETURN count(f) as count")
    total_farmers = farmers[0]['count'] if farmers else 0
    
    st.markdown(f"**📋 Total Farmers:** `{total_farmers}`")
    
    priority_data = neo4j.query("""
        MATCH (f:Farm)
        WITH f.priority_score as score,
             CASE 
                WHEN f.priority_score >= 75 THEN 'Critical'
                WHEN f.priority_score >= 50 THEN 'High'
                WHEN f.priority_score >= 25 THEN 'Medium'
                ELSE 'Low'
             END as level
        RETURN level, COUNT(*) as count
        ORDER BY count DESC
    """)
    
    if priority_data:
        st.markdown("**📊 Priority Breakdown**")
        for item in priority_data:
            st.progress(item['count'] / max(total_farmers, 1), text=f"{item['level']}: {item['count']} farmers")
    
    st.markdown("---")
    
    disease_count = neo4j.query("MATCH (d:Disease) RETURN count(d) as count")[0]['count']
    advisory_count = neo4j.query("MATCH (a:Advisory) RETURN count(a) as count")[0]['count']
    
    col1, col2 = st.columns(2)
    with col1:
        st.metric("🦠 Diseases", disease_count)
    with col2:
        st.metric("📚 Advisories", advisory_count)
    
    st.markdown("---")
    st.caption("🐄 DigiCow AI v2.0")
    st.caption("🔗 Neo4j + Featherless AI")
    st.caption("📅 Kenya AI Challenge 2026")

# --- Main Content ---
st.markdown("""
<div class="main-header fade-in">
    <h1>🐄 DigiCow AI</h1>
    <p>AI-Powered Decision Support for Youth Extension Agents</p>
</div>
""", unsafe_allow_html=True)

# --- Tabs ---
tab1, tab2, tab3 = st.tabs(["👨‍🌾 Farmer Dashboard", "➕ Add Farmer", "📊 All Farmers"])

# ============================================================
# TAB 1: FARMER DASHBOARD
# ============================================================
with tab1:
    farmers = neo4j.query("MATCH (f:Farm) RETURN f.name as name, f.id as id ORDER BY f.priority_score DESC")
    farmer_names = [f['name'] for f in farmers]

    if not farmer_names:
        st.warning("⚠️ No farmers found. Please add farmers using the 'Add Farmer' tab.")
        st.stop()

    col_select, col_metrics = st.columns([1, 2])

    with col_select:
        selected_farmer = st.selectbox(
            "👨‍🌾 Select a farmer to assist",
            farmer_names,
            index=0,
            help="Choose a farmer to view their profile and get AI recommendations"
        )

    query = """
    MATCH (f:Farm {name: $name})
    OPTIONAL MATCH (f)-[:OWNS]->(c:Cow)
    OPTIONAL MATCH (f)-[:AFFECTED_BY]->(d:Disease)
    OPTIONAL MATCH (f)-[:HAS_SOIL]->(s:Soil)
    OPTIONAL MATCH (f)-[:RECEIVED_ADVISORY]->(a:Advisory)
    RETURN f.name as name, f.location as location, f.income as income, 
           f.phone as phone, f.priority_score as priority, f.id as id,
           COLLECT(DISTINCT c.breed) as cows,
           COLLECT(DISTINCT c.id) as cow_ids,
           COLLECT(DISTINCT d.name) as diseases,
           COLLECT(DISTINCT d.severity) as disease_severities,
           s.type as soil_type,
           COLLECT(DISTINCT a.title) as advisories
    """

    farmer_data = neo4j.query(query, {"name": selected_farmer})

    if not farmer_data:
        st.warning("No data found for this farmer")
        st.stop()

    data = farmer_data[0]

    priority = data['priority'] or 0
    if priority >= 75:
        priority_label = "Critical"
        priority_badge = "priority-critical"
        priority_emoji = "🔴"
    elif priority >= 50:
        priority_label = "High"
        priority_badge = "priority-high"
        priority_emoji = "🟠"
    elif priority >= 25:
        priority_label = "Medium"
        priority_badge = "priority-medium"
        priority_emoji = "🟡"
    else:
        priority_label = "Low"
        priority_badge = "priority-low"
        priority_emoji = "🟢"

    income_display = f"KES {data['income']:,}" if data['income'] and isinstance(data['income'], (int, float)) else 'N/A'

    st.markdown(f"""
    <div class="fade-in">
        <h2 style="margin-bottom: 0.5rem;">👤 {data['name']}</h2>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
            <span class="{priority_badge}">{priority_emoji} {priority_label} Priority - {priority}/100</span>
            <span style="background: #e8e8e8; padding: 4px 14px; border-radius: 20px; font-size: 0.85rem;">📍 {data['location'] or 'N/A'}</span>
            <span style="background: #e8e8e8; padding: 4px 14px; border-radius: 20px; font-size: 0.85rem;">📱 {data['phone'] or 'N/A'}</span>
            <span style="background: #e8e8e8; padding: 4px 14px; border-radius: 20px; font-size: 0.85rem;">💰 {income_display}</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    cows = [c for c in data['cows'] if c]
    diseases = [d for d in data['diseases'] if d]
    advisories = [a for a in data['advisories'] if a]

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.markdown(f"""
        <div class="stat-card">
            <div class="label">🐮 Livestock</div>
            <div class="value">{len(cows)}</div>
            <div style="font-size: 0.8rem; color: #888;">{', '.join(cows) if cows else 'No livestock'}</div>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown(f"""
        <div class="stat-card">
            <div class="label">🦠 Diseases</div>
            <div class="value">{len(diseases)}</div>
            <div style="font-size: 0.8rem; color: #888;">{', '.join(diseases) if diseases else '✅ Healthy'}</div>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        st.markdown(f"""
        <div class="stat-card">
            <div class="label">🌱 Soil</div>
            <div class="value">{data['soil_type'] or 'N/A'}</div>
            <div style="font-size: 0.8rem; color: #888;">{data['soil_type'] or 'No data'}</div>
        </div>
        """, unsafe_allow_html=True)

    with col4:
        st.markdown(f"""
        <div class="stat-card">
            <div class="label">📋 Advisories</div>
            <div class="value">{len(advisories)}</div>
            <div style="font-size: 0.8rem; color: #888;">{len(advisories)} received</div>
        </div>
        """, unsafe_allow_html=True)

    if diseases:
        st.markdown("#### ⚠️ Active Disease Issues")
        disease_cols = st.columns(min(len(diseases), 3))
        for i, disease in enumerate(diseases):
            severity = data['disease_severities'][i] if i < len(data['disease_severities']) else 'Unknown'
            is_critical = severity.lower() in ['critical', 'high']
            with disease_cols[i % 3]:
                st.markdown(f"""
                <div class="disease-card {'critical' if is_critical else ''}">
                    <strong>{disease}</strong><br>
                    <span style="font-size: 0.85rem; color: #666;">Severity: {severity}</span>
                </div>
                """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("#### 🤖 AI-Powered Recommendation")

    col_rec_button, col_rec_status = st.columns([1, 3])

    with col_rec_button:
        generate = st.button("✨ Generate Recommendation", type="primary", use_container_width=True)

    if generate:
        with st.spinner("🧠 Analyzing farmer data and generating personalized advice..."):
            context = f"""
            Farmer: {data['name']}
            Location: {data['location']}
            Income Level: KES {data['income']:,} if data['income'] else 'N/A'
            Cows: {', '.join(cows) if cows else 'None'}
            Diseases: {', '.join(diseases) if diseases else 'None reported'}
            Soil Type: {data['soil_type'] or 'Unknown'}
            Priority Score: {priority}/100
            """
            
            treatment_query = """
            MATCH (f:Farm {name: $name})
            MATCH (f)-[:AFFECTED_BY]->(d:Disease)
            OPTIONAL MATCH (d)<-[:TREATS]-(a:Advisory)
            RETURN d.name as disease, COLLECT(DISTINCT a.title) as treatments
            """
            treatment_data = neo4j.query(treatment_query, {"name": data['name']})
            
            treatment_context = ""
            if treatment_data:
                for t in treatment_data:
                    treatments = ', '.join(t['treatments']) if t['treatments'] else 'Seek veterinary advice'
                    treatment_context += f"\n{t['disease']}: {treatments}"
            else:
                treatment_context = "No specific treatments found. General advisory recommended."
            
            prompt = f"""
            You are an agricultural extension advisor for DigiCow Africa Ltd in Kenya. 
            Help youth extension agents provide personalized advice to smallholder dairy farmers.
            
            FARMER CONTEXT:
            {context}
            
            RECOMMENDED TREATMENTS:
            {treatment_context}
            
            Provide a clear, practical recommendation in 4-5 sentences:
            - Start with a greeting using the farmer's name
            - Address the specific disease issues if any
            - Include actionable steps the extension agent should take
            - Mention the source of the advice (KALRO, ILRI)
            - End with a follow-up suggestion
            """
            
            models_to_try = [
                "moonshotai/Kimi-K2-Instruct-0905",
                "AIdenU/SOLAR-10.7b-ko-Y24_v0.1",
                "AIFT/PACK-13b-v1.1"
            ]
            
            response = None
            for model in models_to_try:
                try:
                    response = featherless.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": "You are an agricultural extension expert in Kenya. Provide practical, actionable advice for dairy farmers."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.7,
                        max_tokens=400
                    )
                    if response:
                        break
                except:
                    continue
            
            if response:
                recommendation = response.choices[0].message.content
                
                st.markdown("""
                <div class="rec-box fade-in">
                    <h4 style="color: #1a472a; margin-top: 0;">✅ Recommendation Generated</h4>
                    <hr style="border-color: #c8e6c9;">
                    <div style="font-size: 1.05rem; line-height: 1.7;">
                """, unsafe_allow_html=True)
                
                st.markdown(recommendation)
                
                st.markdown("""
                    </div>
                    <hr style="border-color: #c8e6c9;">
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem; color: #555;">
                        <span>📚 Sources: ILRI Dairy Manual, KALRO Dairy TIMPs</span>
                        <span>⚠️ Always verify with local extension guidelines</span>
                    </div>
                </div>
                """, unsafe_allow_html=True)
                
                st.balloons()
            else:
                st.error("⚠️ AI service busy. Please try again in a moment.")

    st.markdown("---")
    st.markdown("#### 📝 Log Follow-Up Action")

    with st.form("followup_form", clear_on_submit=True):
        col_action, col_submit = st.columns([4, 1])
        
        with col_action:
            action = st.text_area(
                "What action did you take with this farmer?",
                placeholder="e.g., Visited farm, recommended vaccination, scheduled follow-up...",
                height=80,
                label_visibility="collapsed"
            )
        
        with col_submit:
            st.write("")
            st.write("")
            submitted = st.form_submit_button("✅ Log Action", use_container_width=True)
        
        if submitted and action:
            st.markdown(f"""
            <div class="success-message">
                ✅ Action logged for {data['name']} at {datetime.now().strftime('%H:%M')}!
            </div>
            """, unsafe_allow_html=True)
            st.balloons()
        elif submitted and not action:
            st.warning("Please describe the action taken.")

# ============================================================
# TAB 2: ADD FARMER
# ============================================================
with tab2:
    st.markdown("### ➕ Add New Farmer")
    st.caption("Add a new farmer to the system. All fields are optional except farmer name.")
    
    with st.form("add_farmer_form", clear_on_submit=True):
        col1, col2 = st.columns(2)
        
        with col1:
            name = st.text_input("👤 Farmer Name *", placeholder="e.g., John Kamau")
            location = st.text_input("📍 Location", placeholder="e.g., Uasin Gishu")
            phone = st.text_input("📱 Phone Number", placeholder="e.g., 0712345678")
            income = st.number_input("💰 Annual Income (KES)", min_value=0, step=1000, value=0)
        
        with col2:
            acreage = st.number_input("📏 Acreage", min_value=0.0, step=0.5, value=0.0)
            cows_breed = st.text_input("🐮 Cow Breeds (comma separated)", placeholder="e.g., Friesian, Ayrshire")
            soil_type = st.selectbox("🌱 Soil Type", ["", "Clay", "Sandy", "Loam", "Laterite", "Black Cotton"])
            disease = st.text_input("🦠 Disease (optional)", placeholder="e.g., Mastitis")
        
        submitted_add = st.form_submit_button("➕ Add Farmer", type="primary", use_container_width=True)
        
        if submitted_add:
            if not name:
                st.error("⚠️ Farmer name is required!")
            else:
                try:
                    existing = neo4j.query("MATCH (f:Farm {name: $name}) RETURN f", {"name": name})
                    if existing:
                        st.error(f"⚠️ Farmer '{name}' already exists!")
                    else:
                        query = """
                        CREATE (f:Farm {
                            id: randomUUID(),
                            name: $name,
                            location: $location,
                            phone: $phone,
                            income: $income,
                            acreage: $acreage,
                            priority_score: 25
                        })
                        RETURN f.name
                        """
                        neo4j.query(query, {
                            "name": name,
                            "location": location or "",
                            "phone": phone or "",
                            "income": income or 0,
                            "acreage": acreage or 0
                        })
                        
                        if cows_breed:
                            for breed in [b.strip() for b in cows_breed.split(',') if b.strip()]:
                                query = """
                                MATCH (f:Farm {name: $name})
                                CREATE (c:Cow {id: randomUUID(), breed: $breed, milk_yield: 20})
                                CREATE (f)-[:OWNS]->(c)
                                """
                                neo4j.query(query, {"name": name, "breed": breed})
                        
                        if soil_type:
                            soil_check = neo4j.query("MATCH (s:Soil {type: $type}) RETURN s", {"type": soil_type})
                            if soil_check:
                                query = """
                                MATCH (f:Farm {name: $name})
                                MATCH (s:Soil {type: $soil_type})
                                CREATE (f)-[:HAS_SOIL]->(s)
                                """
                                neo4j.query(query, {"name": name, "soil_type": soil_type})
                            else:
                                query = "CREATE (s:Soil {type: $type, ph: 6.5, nutrients: 'Balanced'})"
                                neo4j.query(query, {"type": soil_type})
                                query = """
                                MATCH (f:Farm {name: $name})
                                MATCH (s:Soil {type: $soil_type})
                                CREATE (f)-[:HAS_SOIL]->(s)
                                """
                                neo4j.query(query, {"name": name, "soil_type": soil_type})
                        
                        if disease:
                            disease_check = neo4j.query("MATCH (d:Disease {name: $name}) RETURN d", {"name": disease})
                            if disease_check:
                                query = """
                                MATCH (f:Farm {name: $name})
                                MATCH (d:Disease {name: $disease})
                                CREATE (f)-[:AFFECTED_BY]->(d)
                                SET f.priority_score = 75
                                """
                                neo4j.query(query, {"name": name, "disease": disease})
                            else:
                                query = "CREATE (d:Disease {name: $name, severity: 'Medium', treatment: 'Consult veterinary'})"
                                neo4j.query(query, {"name": disease})
                                query = """
                                MATCH (f:Farm {name: $name})
                                MATCH (d:Disease {name: $disease})
                                CREATE (f)-[:AFFECTED_BY]->(d)
                                SET f.priority_score = 75
                                """
                                neo4j.query(query, {"name": name, "disease": disease})
                        
                        st.markdown(f"""
                        <div class="success-message">
                            ✅ Farmer <strong>{name}</strong> added successfully!
                        </div>
                        """, unsafe_allow_html=True)
                        st.balloons()
                        time.sleep(1)
                        st.rerun()
                        
                except Exception as e:
                    st.error(f"⚠️ Error adding farmer: {e}")

# ============================================================
# TAB 3: ALL FARMERS WITH EXPORT
# ============================================================
with tab3:
    st.markdown("### 📊 All Farmers")
    
    all_farmers = neo4j.query("""
        MATCH (f:Farm)
        OPTIONAL MATCH (f)-[:OWNS]->(c:Cow)
        OPTIONAL MATCH (f)-[:AFFECTED_BY]->(d:Disease)
        OPTIONAL MATCH (f)-[:HAS_SOIL]->(s:Soil)
        RETURN f.name as name, f.location as location, f.phone as phone,
               f.income as income, f.priority_score as priority,
               COLLECT(DISTINCT c.breed) as cows,
               COLLECT(DISTINCT d.name) as diseases,
               s.type as soil_type
        ORDER BY f.priority_score DESC
    """)
    
    if all_farmers:
        df_data = []
        for farmer in all_farmers:
            df_data.append({
                "Name": farmer['name'],
                "Location": farmer['location'] or 'N/A',
                "Phone": farmer['phone'] or 'N/A',
                "Income": f"KES {farmer['income']:,}" if farmer['income'] and isinstance(farmer['income'], (int, float)) else 'N/A',
                "Priority": farmer['priority'] or 0,
                "Cows": ', '.join(farmer['cows']) if farmer['cows'] else 'None',
                "Diseases": ', '.join(farmer['diseases']) if farmer['diseases'] else '✅ Healthy',
                "Soil": farmer['soil_type'] or 'N/A'
            })
        
        df = pd.DataFrame(df_data)
        
        # Display the dataframe
        st.dataframe(df, use_container_width=True, hide_index=True)
        
        # --- EXPORT SECTION ---
        st.markdown("---")
        st.markdown("### 📤 Export Data")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("""
            <div class="export-box">
                <h4>📄 Export as CSV</h4>
                <p style="font-size: 0.9rem; color: #555;">Download farmer data as a CSV file for Excel or other tools.</p>
            </div>
            """, unsafe_allow_html=True)
            
            csv = df.to_csv(index=False)
            st.download_button(
                label="📥 Download CSV",
                data=csv,
                file_name=f"digicow_farmers_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                mime="text/csv",
                use_container_width=True
            )
        
        with col2:
            st.markdown("""
            <div class="export-box">
                <h4>📄 Export as PDF</h4>
                <p style="font-size: 0.9rem; color: #555;">Download a formatted PDF report with all farmer details.</p>
            </div>
            """, unsafe_allow_html=True)
            
            # Generate PDF HTML
            pdf_html = generate_pdf_html(df)
            
            # Create download button for PDF
            st.download_button(
                label="📥 Download PDF",
                data=pdf_html,
                file_name=f"digicow_farmers_{datetime.now().strftime('%Y%m%d_%H%M')}.html",
                mime="text/html",
                use_container_width=True,
                help="Download as HTML (open in browser and print as PDF)"
            )
            
            # Alternative: Instructions for PDF
            st.caption("💡 Tip: Open the HTML file in your browser and use 'Print → Save as PDF'")
        
        # --- Summary Statistics ---
        st.markdown("---")
        st.markdown("### 📈 Summary Statistics")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("👨‍🌾 Total Farmers", len(df))
        
        with col2:
            avg_priority = df['Priority'].mean()
            st.metric("📊 Avg Priority", f"{avg_priority:.1f}/100")
        
        with col3:
            disease_count = len(df[df['Diseases'] != '✅ Healthy'])
            st.metric("🦠 With Diseases", disease_count)
        
        with col4:
            cow_count = len(df[df['Cows'] != 'None'])
            st.metric("🐮 With Cows", cow_count)
        
        # Priority distribution chart
        st.markdown("#### Priority Distribution")
        priority_counts = df['Priority'].value_counts().sort_index()
        st.bar_chart(priority_counts)
        
    else:
        st.info("No farmers found. Add farmers using the 'Add Farmer' tab.")

# --- Footer ---
st.markdown("""
<div class="footer">
    <div style="display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap;">
        <span>🐄 DigiCow Africa Ltd</span>
        <span>🤖 Powered by Featherless AI</span>
        <span>📊 Neo4j Graph Database</span>
        <span>🏆 Kenya AI Challenge 2026 | AgriFin Track</span>
    </div>
    <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #aaa;">
        v2.0 | Z01Techies
    </div>
</div>
""", unsafe_allow_html=True)