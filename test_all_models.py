import os
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://api.featherless.ai/v1",
    api_key=os.getenv("FEATHERLESS_API_KEY")
)

models = [
    "moonshotai/Kimi-K2-Instruct-0905",
    "Qwen/Qwen3-VL-8B-Thinking",
    "AIdenU/SOLAR-10.7b-ko-Y24_v0.1",
    "AIdenU/SOLAR-10.7b-ko-Y14_v1.0",
    "AIFT/PACK-13b-v1.1"
]

print("Testing models...\n")

working = []

for model in models:
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": "Say 'Hello'"}
            ],
            max_tokens=10
        )
        print(f" {model} - WORKING")
        working.append(model)
    except Exception as e:
        if "capacity" in str(e).lower():
            print(f" {model} - Capacity full")
        else:
            print(f" {model} - Error: {str(e)[:50]}")
    time.sleep(0.5)

print("\n" + "=" * 40)
if working:
    print(f"Working models: {working}")
else:
    print("No working models. Try again in 5 minutes.")