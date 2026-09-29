import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        # Test OPTIONS request
        resp = await client.options(
            'http://127.0.0.1:10000/api/feedback',
            headers={'Origin': 'https://forgot-ai.vercel.app', 'Access-Control-Request-Method': 'POST'}
        )
        print('Preflight status:', resp.status_code)
        print('Preflight headers:', resp.headers)
        
        resp2 = await client.options('http://127.0.0.1:10000/api/feedback')
        print('Direct OPTIONS status:', resp2.status_code)

asyncio.run(test())
