import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from supabase_db import create_supabase_client, SupabaseDatabase

async def main():
    try:
        client = create_supabase_client()
        db = SupabaseDatabase(client)
        
        print("Testing update_many with None filter on owner_user_id...")
        res = await db.items.update_many(
            {"library_id": "test_lib_123", "owner_user_id": None},
            {"$set": {"owner_user_id": "test_user_456"}}
        )
        print("Success! Modified count:", res.modified_count)
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    asyncio.run(main())
