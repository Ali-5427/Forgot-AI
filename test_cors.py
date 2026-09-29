import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # 1. Allowed origin
        r1 = await client.options('http://127.0.0.1:10000/api/feedback', headers={
            'Origin': 'https://forgot-ai.vercel.app',
            'Access-Control-Request-Method': 'POST'
        })
        print("Allowed Origin status:", r1.status_code)
        print("Allowed Origin content:", r1.text)

asyncio.run(main())
