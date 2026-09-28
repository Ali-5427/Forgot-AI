import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv('backend/.env')
NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY', '').strip()

async def test_all():
    url = 'https://integrate.api.nvidia.com/v1/chat/completions'
    headers = {
        'Authorization': f'Bearer {NVIDIA_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Try a few models that were listed
    models = ['meta/llama-3.2-11b-vision-instruct', 'ibm/granite-3.0-8b-instruct', 'google/gemma-2b', 'nvidia/llama3-chatqa-1.5-70b']
    for m in models:
        payload = {
            'model': m,
            'messages': [{'role': 'user', 'content': 'hi'}],
            'stream': True
        }
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream('POST', url, headers=headers, json=payload, timeout=5.0) as resp:
                    print(f"Chat {m}: {resp.status_code}")
                    if resp.status_code == 200:
                        async for chunk in resp.aiter_text():
                            print(repr(chunk))
                            break
                        break
        except Exception as e:
            print(f"Chat {m}: Exception {e}")

asyncio.run(test_all())
