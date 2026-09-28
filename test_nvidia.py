import asyncio
import os
import time
import httpx
from dotenv import load_dotenv

load_dotenv('backend/.env')

NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY', '').strip()

async def test_embeddings():
    url = 'https://integrate.api.nvidia.com/v1/embeddings'
    headers = {
        'Authorization': f'Bearer {NVIDIA_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    models = ['nvidia/nv-embedqa-e5-v5', 'nvidia/nemotron-3-embed-1b']
    
    for model in models:
        for input_type in ['passage', 'query']:
            payload = {
                'input': ['This is a test document.'],
                'input_type': input_type,
                'model': model,
                'encoding_format': 'float',
                'truncate': 'END'
            }
            start_time = time.time()
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, json=payload, timeout=30.0)
            latency = time.time() - start_time
            if resp.status_code == 200:
                data = resp.json()
                dim = len(data['data'][0]['embedding'])
                print(f"Embedding {model} {input_type}: SUCCESS, Dim: {dim}, Latency: {latency:.3f}s")
                return model, dim
            else:
                print(f"Embedding {model} {input_type}: FAILED ({resp.status_code}) - {resp.text}")

async def test_chat(model):
    url = 'https://integrate.api.nvidia.com/v1/chat/completions'
    headers = {
        'Authorization': f'Bearer {NVIDIA_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': 'meta/llama-3.1-70b-instruct',
        'messages': [{'role': 'user', 'content': 'Say hello world'}],
        'stream': True
    }
    # find which chat model works
    chat_models = ['meta/llama-3.1-70b-instruct', 'meta/llama-3.1-8b-instruct', 'meta/llama3-70b-instruct']
    for c_model in chat_models:
        payload['model'] = c_model
        print(f"Testing chat {c_model}...")
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream('POST', url, headers=headers, json=payload) as resp:
                    if resp.status_code == 200:
                        print(f"Chat {c_model}: SUCCESS streaming")
                        async for chunk in resp.aiter_text():
                            print(repr(chunk))
                            break
                        return True
                    else:
                        print(f"Chat {c_model}: FAILED ({resp.status_code})")
        except Exception as e:
            print(f"Exception on {c_model}: {e}")

async def test_rerank():
    url = 'https://integrate.api.nvidia.com/v1/ranking'
    headers = {
        'Authorization': f'Bearer {NVIDIA_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        "model": "nvidia/nv-rerankqa-mistral-4b-v3",
        "query": "hello",
        "passages": [{"text": "hello world"}]
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload, timeout=10.0)
        print(f"Reranking endpoint: {'SUCCESS' if resp.status_code == 200 else f'FAILED ({resp.status_code})'}")

async def main():
    print('Testing NVIDIA API Key:', NVIDIA_API_KEY[:5] + '...' if NVIDIA_API_KEY else 'NONE')
    model, dim = await test_embeddings()
    if model:
        await test_chat(model)
        await test_rerank()

asyncio.run(main())
