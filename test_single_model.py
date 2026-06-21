import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://api.featherless.ai/v1",
    api_key=os.getenv("FEATHERLESS_API_KEY")
)

# Change this to test different models
model_to_test = "Qwen/Qwen3-VL-8B-Thinking"

print(f"Testing model: {model_to_test}")
print("=" * 50)

try:
    response = client.chat.completions.create(
        model=model_to_test,
        messages=[
            {"role": "system", "content": "You are an agricultural expert."},
            {"role": "user", "content": "Give a short recommendation for a dairy farmer with mastitis."}
        ],
        temperature=0.7,
        max_tokens=100
    )
    print(" Model works!")
    print("\nResponse:")
    print(response.choices[0].message.content)
except Exception as e:
    print(f" Model failed: {e}")