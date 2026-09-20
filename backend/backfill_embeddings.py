import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from server import db, get_embedding

async def backfill():
    print("Starting embedding backfill...")
    
    # Fetch all items that don't have an embedding
    # Assuming 'embedding' field doesn't exist or is null for old items
    # In Supabase/PostgREST, we can query items where embedding is null
    
    try:
        # We fetch all items to be safe since we don't have a direct 'embedding is null' query
        # set up in the custom SupabaseCollection wrapper easily without adding methods.
        items = await db.items.find({}).to_list(10000)
    except Exception as e:
        print(f"Error fetching items: {e}")
        return
        
    count = 0
    for item in items:
        # Only process if embedding is missing
        if "embedding" not in item or not item["embedding"]:
            print(f"Processing item: {item.get('title', 'Untitled')} ({item['id']})")
            
            title = item.get("title", "")
            summary = item.get("summary", "")
            keywords = item.get("keywords", [])
            
            # Combine into the same format used in server.py
            embedding_text = f"{title}\n{summary}\n{' '.join(keywords)}"
            
            embedding = await get_embedding(embedding_text)
            
            if embedding:
                await db.items.update_one({"id": item["id"]}, {"$set": {"embedding": embedding}})
                print(f"  -> Successfully added embedding")
                count += 1
            else:
                print(f"  -> Failed to generate embedding")
                
    print(f"Finished! Backfilled {count} items.")

if __name__ == "__main__":
    asyncio.run(backfill())
