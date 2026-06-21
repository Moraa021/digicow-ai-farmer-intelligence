from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

class Neo4jConnection:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            os.getenv("NEO4J_URI", "bolt://localhost:7687"),
            auth=(os.getenv("NEO4J_USER", "neo4j"), 
                  os.getenv("NEO4J_PASSWORD"))
        )
    
    def close(self):
        self.driver.close()
    
    def run(self, query, parameters=None):
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]

def init_database():
    conn = Neo4jConnection()
    
    try:
        # Clear existing data
        conn.run("MATCH (n) DETACH DELETE n")
        print("✅ Cleared existing data")
        
        # Create farmers
        farmers = [
            {"id": "F001", "name": "Mercy Naliaka", "location": "Uasin Gishu", "income": 45000, "acreage": 3, "phone": "0712345678"},
            {"id": "F002", "name": "Michael Ochieng", "location": "Kisumu", "income": 32000, "acreage": 2, "phone": "0723456789"},
            {"id": "F003", "name": "Grace Nyaboke", "location": "Nakuru", "income": 52000, "acreage": 5, "phone": "0734567890"},
            {"id": "F004", "name": "Taheera Mohamed", "location": "Mombasa", "income": 28000, "acreage": 1.5, "phone": "0745678901"},
            {"id": "F005", "name": "Millicent Odhiambo", "location": "Nakuru", "income": 23000, "acreage": 2, "phone": "0756786543"},
        ]
        
        for farmer in farmers:
            query = """
            CREATE (f:Farm {
                id: $id,
                name: $name,
                location: $location,
                income: $income,
                acreage: $acreage,
                phone: $phone
            })
            """
            conn.run(query, farmer)
        print(f"✅ Created {len(farmers)} farmers")
        
        # Create cows
        cows = [
            {"id": "C001", "breed": "Friesian", "milk_yield": 25, "farmer": "Mercy Naliaka"},
            {"id": "C002", "breed": "Ayrshire", "milk_yield": 18, "farmer": "Michael Ochieng"},
            {"id": "C003", "breed": "Friesian", "milk_yield": 30, "farmer": "Grace Nyaboke"},
            {"id": "C004", "breed": "Guernsey", "milk_yield": 15, "farmer": "Taheera Mohamed"},
            {"id": "C005", "breed": "Freshian", "milk_yield": 22, "farmer": "Millicent Odhiambo"},
        ]
        
        for cow in cows:
            query = """
            MATCH (f:Farm {name: $farmer})
            CREATE (c:Cow {id: $id, breed: $breed, milk_yield: $milk_yield})
            CREATE (f)-[:OWNS]->(c)
            """
            conn.run(query, cow)
        print(f"✅ Created {len(cows)} cows")
        
        # Create diseases
        diseases = [
            {"name": "Mastitis", "severity": "High", "treatment": "Antibiotics, improved hygiene"},
            {"name": "East Coast Fever", "severity": "Critical", "treatment": "Vaccination, acaricides"},
            {"name": "Foot and Mouth", "severity": "High", "treatment": "Vaccination, quarantine"},
            {"name": "Milk fever", "severity": "Medium", "treatment": "Calcium supplement, balanced diet"},
        ]
        
        for disease in diseases:
            query = """
            CREATE (d:Disease {
                name: $name,
                severity: $severity,
                treatment: $treatment
            })
            """
            conn.run(query, disease)
        print(f"✅ Created {len(diseases)} diseases")
        
        # Create advisories
        advisories = [
            {"title": "Mastitis Prevention", "source": "ILRI Dairy Manual", "content": "Regular milking hygiene, dry cow therapy, proper nutrition"},
            {"title": "ECF Control", "source": "KALRO Dairy TIMPs", "content": "Regular spraying, vaccination, grazing management"},
            {"title": "Feed Optimization", "source": "ILRI Feeding Manual", "content": "High quality silage, mineral supplements, balanced rations"},
        ]
        
        for advisory in advisories:
            query = """
            CREATE (a:Advisory {
                title: $title,
                source: $source,
                content: $content
            })
            """
            conn.run(query, advisory)
        print(f"✅ Created {len(advisories)} advisories")
        
        # Create soil types
        soils = [
            {"type": "Clay", "ph": 6.2, "nutrients": "High Nitrogen"},
            {"type": "Sandy", "ph": 5.8, "nutrients": "Low Phosphorus"},
            {"type": "Loam", "ph": 6.8, "nutrients": "Balanced"},
        ]
        
        for soil in soils:
            query = """
            CREATE (s:Soil {
                type: $type,
                ph: $ph,
                nutrients: $nutrients
            })
            """
            conn.run(query, soil)
        print(f"✅ Created {len(soils)} soil types")
        
        # Create soil relationships
        soil_rels = [
            {"farmer": "Mercy Naliaka", "soil": "Clay"},
            {"farmer": "Michael Ochieng", "soil": "Sandy"},
            {"farmer": "Grace Nyaboke", "soil": "Loam"},
        ]
        
        for rel in soil_rels:
            query = """
            MATCH (f:Farm {name: $farmer})
            MATCH (s:Soil {type: $soil})
            CREATE (f)-[:HAS_SOIL]->(s)
            """
            conn.run(query, rel)
        print(f"✅ Created {len(soil_rels)} soil relationships")
        
        # Create disease-farmer relationships
        disease_rels = [
            {"farmer": "Mercy Naliaka", "disease": "Mastitis"},
            {"farmer": "Michael Ochieng", "disease": "East Coast Fever"},
            {"farmer": "Millicent Odhiambo", "disease": "Milk fever"},
        ]
        
        for rel in disease_rels:
            query = """
            MATCH (f:Farm {name: $farmer})
            MATCH (d:Disease {name: $disease})
            CREATE (f)-[:AFFECTED_BY]->(d)
            """
            conn.run(query, rel)
        print("✅ Created disease relationships")
        
        # Create advisory-disease relationships
        advisory_rels = [
            {"advisory": "Mastitis Prevention", "disease": "Mastitis"},
            {"advisory": "ECF Control", "disease": "East Coast Fever"},
        ]
        
        for rel in advisory_rels:
            query = """
            MATCH (a:Advisory {title: $advisory})
            MATCH (d:Disease {name: $disease})
            CREATE (a)-[:TREATS]->(d)
            """
            conn.run(query, rel)
        print("✅ Created advisory-disease relationships")
        
        # Calculate priority scores
        query = """
        MATCH (f:Farm)
        OPTIONAL MATCH (f)-[:AFFECTED_BY]->(d:Disease)
        WITH f, COUNT(DISTINCT d) as disease_count
        SET f.priority_score = 
          CASE 
            WHEN disease_count >= 2 THEN 100
            WHEN disease_count = 1 THEN 75
            ELSE 25
          END
        RETURN f.name as name, f.priority_score as priority
        """
        results = conn.run(query)
        print("✅ Priority scores calculated:")
        for r in results:
            print(f"   {r['name']}: {r['priority']}")
        
        conn.close()
        print("\n🎉 Database initialization complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        conn.close()

if __name__ == "__main__":
    init_database()