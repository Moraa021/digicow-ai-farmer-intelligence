import os
from neo4j import GraphDatabase
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Test Neo4j
print("🔍 Testing Neo4j Connection...")
driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI", "bolt://localhost:7687"),
    auth=(os.getenv("NEO4J_USER", "neo4j"), 
          os.getenv("NEO4J_PASSWORD"))
)

with driver.session() as session:
    result = session.run("MATCH (f:Farm) RETURN count(f) as count")
    count = result.single()['count']
    print(f"✅ Neo4j: Found {count} farmers")

    # Test priority query
    result = session.run("""
        MATCH (f:Farm) 
        RETURN f.name, f.priority_score 
        ORDER BY f.priority_score DESC
    """)
    print("\n📊 Priority Scores:")
    for record in result:
        print(f"   {record['f.name']}: {record['f.priority_score']}")
driver.close()

# Test Featherless
print("\n🔍 Testing Featherless AI...")
client = OpenAI(
    base_url="https://api.featherless.ai/v1",
    api_key=os.getenv("FEATHERLESS_API_KEY")
)

try:
    response = client.chat.completions.create(
        model="moonshotai/Kimi-K2-Instruct-0905",
        messages=[
            {"role": "user", "content": "Say 'Hello Kenya!'"}
        ],
        max_tokens=20
    )
    print(f"✅ Featherless: {response.choices[0].message.content}")
except Exception as e:
    print(f"⚠️ Featherless: {e}")

print("\n🎉 Backend verification complete!")