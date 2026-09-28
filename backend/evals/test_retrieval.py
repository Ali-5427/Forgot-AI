import asyncio
import uuid
import sys
import os
from datetime import datetime, timezone, timedelta

# Add backend dir to path so we can import server
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from server import db, retrieve, chat

SYNTHETIC_ITEMS = [
    {
        "title": "Machine Learning for Beginners",
        "summary": "An intro to ML concepts like gradient descent and neural networks.",
        "content_type": "text",
        "status": "ready",
        "keywords": ["ai", "ml", "neural networks", "gradient descent", "python"],
        "searchable_text": "Machine Learning for Beginners. An intro to ML concepts like gradient descent and neural networks.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    },
    {
        "title": "Best Pizza Recipes",
        "summary": "How to make Neapolitan pizza at home.",
        "content_type": "text",
        "status": "ready",
        "keywords": ["food", "pizza", "baking", "recipe"],
        "searchable_text": "Best Pizza Recipes. How to make Neapolitan pizza at home with high hydration dough and san marzano tomatoes.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
    },
    {
        "title": "Quarterly Financial Report Q3",
        "summary": "Company revenue is up 15% this quarter.",
        "content_type": "text",
        "status": "ready",
        "keywords": ["finance", "report", "revenue", "q3", "business"],
        "searchable_text": "Quarterly Financial Report Q3. Company revenue is up 15% this quarter driven by enterprise sales.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
    },
    {
        "title": "React vs Vue in 2024",
        "summary": "Comparing frontend frameworks for web development.",
        "content_type": "text",
        "status": "ready",
        "keywords": ["react", "vue", "javascript", "webdev", "frontend"],
        "searchable_text": "React vs Vue in 2024. Comparing frontend frameworks. React still dominates but Vue's composition API is loved by many.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    },
    {
        "title": "How to fix a leaky faucet",
        "summary": "DIY guide to replacing the O-ring in your bathroom sink.",
        "content_type": "text",
        "status": "ready",
        "keywords": ["diy", "home", "plumbing", "repair"],
        "searchable_text": "How to fix a leaky faucet. DIY guide to replacing the O-ring in your bathroom sink.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    },
    {
        "title": "Top 10 sci-fi movies of the decade",
        "summary": "A list of the best science fiction films including Dune and Interstellar.",
        "content_type": "text",
        "status": "ready",
        "keywords": ["movies", "scifi", "cinema", "entertainment", "dune", "interstellar"],
        "searchable_text": "Top 10 sci-fi movies of the decade. A list of the best science fiction films including Dune and Interstellar.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat()
    },
    {
        "title": "Python Asyncio Tutorial",
        "summary": "Understanding the event loop, async, and await in Python.",
        "content_type": "text",
        "status": "ready",
        "keywords": ["python", "asyncio", "programming", "concurrency"],
        "searchable_text": "Python Asyncio Tutorial. Understanding the event loop, async, and await in Python for non-blocking code.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    },
    {
        "title": "Trip itinerary to Japan",
        "summary": "Planning a 14-day trip to Tokyo, Kyoto, and Osaka.",
        "content_type": "text",
        "status": "ready",
        "keywords": ["travel", "japan", "tokyo", "kyoto", "osaka", "itinerary"],
        "searchable_text": "Trip itinerary to Japan. Planning a 14-day trip to Tokyo, Kyoto, and Osaka, including JR pass tips.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    },
    {
        "title": "The history of the Roman Empire",
        "summary": "From the fall of the Republic to the split of the Empire.",
        "content_type": "text",
        "status": "ready",
        "keywords": ["history", "rome", "empire", "antiquity"],
        "searchable_text": "The history of the Roman Empire. From the fall of the Republic to the split of the Empire and the rise of Byzantium.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=45)).isoformat()
    },
    {
        "title": "Workout routine for beginners",
        "summary": "A simple full-body workout split for building muscle.",
        "content_type": "text",
        "status": "ready",
        "keywords": ["fitness", "workout", "health", "gym", "muscle"],
        "searchable_text": "Workout routine for beginners. A simple full-body workout split for building muscle using progressive overload.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat()
    }
]

QUESTIONS = [
    # Direct Lookups (Keyword)
    {"q": "show me the pizza recipe", "target": "Best Pizza Recipes"},
    {"q": "react vs vue article", "target": "React vs Vue in 2024"},
    
    # Semantic (No direct keyword matches)
    {"q": "i need to repair my bathroom sink", "target": "How to fix a leaky faucet"},
    {"q": "how is the company doing financially", "target": "Quarterly Financial Report Q3"},
    {"q": "where should i go in asia", "target": "Trip itinerary to Japan"},
    
    # Time-based
    {"q": "what did i save yesterday?", "target": "React vs Vue in 2024"}, # 1 day ago
    {"q": "articles from last week about code", "target": "Python Asyncio Tutorial"}, # 7 days ago
    
    # Multi-turn Follow-ups (CURRENT SYSTEM WILL FAIL THESE)
    {"q": "when did i save that second one?", "target": None}, # Requires chat history context
    {"q": "summarize the frontend framework one", "target": "React vs Vue in 2024"}, # Requires semantic/context linking
    
    # Negative / No Answer
    {"q": "how do i bake a chocolate cake?", "target": None}, # Not in library
    {"q": "list my favorite songs", "target": None}, # Not in library
]

async def run_eval():
    print("?? Starting Baseline Eval against CURRENT retrieval system...")
    lib_id = f"eval_lib_{uuid.uuid4()}"
    print(f"Creating throwaway library: {lib_id}")
    
    # Insert synthetic items
    inserted_ids = {}
    for item in SYNTHETIC_ITEMS:
        item["library_id"] = lib_id
        item["id"] = str(uuid.uuid4())
        item["owner_user_id"] = None # Optional in schema if bypassing RLS via service role
        await db.items.insert_one(item)
        inserted_ids[item["title"]] = item["id"]
        
    print(f"Inserted {len(SYNTHETIC_ITEMS)} synthetic items.")
    print("-" * 50)
    
    passed = 0
    total = len(QUESTIONS)
    
    try:
        for idx, q_data in enumerate(QUESTIONS):
            q = q_data["q"]
            target_title = q_data["target"]
            target_id = inserted_ids.get(target_title) if target_title else None
            
            print(f"Q{idx+1}: {q}")
            
            # Using the CURRENT retrieval method (which fetches 50 and ranks with LLM)
            results, _ = await retrieve(q, lib_id)
            
            retrieved_ids = [r["id"] for r in results]
            
            # Eval Logic
            is_pass = False
            if target_id:
                if target_id in retrieved_ids:
                    is_pass = True
            else:
                # Expecting NO matching context or failure
                if not retrieved_ids:
                    is_pass = True
                else:
                    # It returned stuff, but was it a hallucination? We just check recall here.
                    # Since it's a negative question, returning empty is perfect. 
                    # If it returns irrelevant stuff, it's a fail.
                    is_pass = False
            
            if is_pass:
                passed += 1
                print(f"   ? PASS (Target found)" if target_title else f"   ? PASS (Correctly found nothing)")
            else:
                if target_title:
                    print(f"   ? FAIL (Missed target: {target_title})")
                else:
                    print(f"   ? FAIL (Hallucinated results for no-answer query)")
                    
    finally:
        print("-" * 50)
        print(f"Cleaning up throwaway library {lib_id}...")
        # Since we don't have delete_many, we delete one by one
        for title, iid in inserted_ids.items():
            await db.items.delete_one({"id": iid, "library_id": lib_id})
            
    print("=" * 50)
    print(f"BASELINE SCORE: {passed}/{total} ({(passed/total)*100:.1f}%)")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(run_eval())
