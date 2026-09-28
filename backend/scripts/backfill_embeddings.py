import asyncio
import os
import sys
import logging
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from server import db, logger
from ai_provider import embed_texts

BATCH_SIZE = 10

async def generate_item_text(doc) -> str:
    content_type_str = f"Type: {doc.get('content_type', 'unknown')}"
    if doc.get("content_type") == "image":
        content_type_str += " (image screenshot picture)"
        
    ext_text = doc.get("extracted_text", "")[:1500]
    search_text = doc.get("searchable_text", "")[:1500]
    
    keywords = doc.get('keywords', [])
    kw_str = ' '.join(keywords) if isinstance(keywords, list) else ''
    
    return f"{doc.get('title', '')}\n{doc.get('summary', '')}\nKeywords: {kw_str}\nCategory: {doc.get('category', '')}\n{content_type_str}\n{ext_text}\n{search_text}"

async def backfill():
    print("Starting backfill for missing embeddings...")
    # Find items that are ready but have no embedding
    # We query directly via supabase_db wrapper
    try:
        # Since SupabaseWrapper doesn't easily support IS NULL, we'll fetch all ready items 
        # and filter locally (or use custom raw SQL if needed, but local is fine for a personal app).
        all_ready = await db.items.find({"status": "ready"}).to_list(10000)
        
        missing = [d for d in all_ready if not d.get("embedding")]
        print(f"Found {len(missing)} items missing embeddings.")
        
        if not missing:
            print("Everything is up to date!")
            return
            
        for i in range(0, len(missing), BATCH_SIZE):
            batch = missing[i:i+BATCH_SIZE]
            print(f"Processing batch {i//BATCH_SIZE + 1} of {(len(missing)-1)//BATCH_SIZE + 1}...")
            
            texts = [await generate_item_text(d) for d in batch]
            
            # Using our robust ai_provider embedder
            embeddings = await embed_texts(texts, input_type="passage")
            
            for doc, emb in zip(batch, embeddings):
                if emb:
                    await db.items.update_one({"id": doc["id"]}, {"": {"embedding": emb}})
                    print(f"  [+] Embedded item: {doc['id']} - {doc.get('title')[:30]}...")
                else:
                    print(f"  [-] Failed to embed item: {doc['id']}")
                    
            await asyncio.sleep(1) # Rate limit protection
            
    except Exception as e:
        logger.error(f"Backfill error: {e}")

if __name__ == '__main__':
    asyncio.run(backfill())
