import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv('backend/.env')
NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY', '').strip()

async def test_embed():
    url = 'https://integrate.api.nvidia.com/v1/embeddings'
    headers = {
        'Authorization': f'Bearer {NVIDIA_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    for input_type in ['passage', 'query']:
        payload = {
            'input': ['This is a test.'],
            'input_type': input_type,
            'model': 'nvidia/nemotron-3-embed-1b',
            'encoding_format': 'float',
            'truncate': 'END'
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=payload)
            print(f"Embedding {input_type}: {resp.status_code}")
            
asyncio.run(test_embed())
