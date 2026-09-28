import asyncio
import os
import sys
import logging
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from server import db, logger

async def sweep_stuck_items():
    logger.info("Running stuck-item sweeper...")
    try:
        # Fetch processing items
        processing = await db.items.find({"status": "processing"}).to_list(100)
        
        now = datetime.now(timezone.utc)
        for doc in processing:
            created_str = doc.get("created_at")
            if not created_str:
                continue
                
            try:
                # Parse ISO format string
                created_dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            except ValueError:
                continue
                
            age = (now - created_dt).total_seconds()
            
            # If older than 10 minutes (600 seconds), mark as failed
            if age > 600:
                logger.warning(f"Item {doc['id']} stuck in processing for {age/60:.1f} mins. Marking as failed.")
                await db.items.update_one({"id": doc["id"]}, {"": {"status": "failed"}})
                
    except Exception as e:
        logger.error(f"Sweeper error: {e}")

if __name__ == '__main__':
    asyncio.run(sweep_stuck_items())
