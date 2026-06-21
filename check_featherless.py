import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://api.featherless.ai/v1",
    api_key=os.getenv("FEATHERLESS_API_KEY")
)

# List available models
try:
    models = client.models.list()
    print("Available models:")
    for model in models.data[:20]:  # Show first 20
        print(f"  - {model.id}")
except Exception as e:
    print(f"Error: {e}")