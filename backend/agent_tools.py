import os
import re
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Tool Definitions in OpenAI / Groq standard JSON Schema format
AGENT_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "search_by_time_range",
            "description": "Find items saved by the user within a specific time or date range (e.g. 'this week', 'today', 'yesterday', 'past 7 days', 'last month', 'September 2026'). Always compute the exact start and end ISO dates based on the current date provided in the system prompt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "ISO 8601 start date (e.g. '2026-10-29T00:00:00Z' for 7 days ago)"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "ISO 8601 end date (e.g. '2026-11-05T23:59:59Z' for today)"
                    },
                    "description_hint": {
                        "type": "string",
                        "description": "Optional human label for the time window (e.g. 'this week', 'yesterday')"
                    }
                },
                "required": ["start_date", "end_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "semantic_hybrid_search",
            "description": "Search the user's saved items by concept, topic, meaning, keywords, or fuzzy recollection (e.g. 'a book like a vip or something', 'meeting with sidharth', 'AI coding tools', 'marketing ideas').",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query keywords or conceptual description"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of items to return (default 8)"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "inspect_memory",
            "description": "Inspect the complete text, full transcript, notes, or specific details of an item by its ID, URL, or title substring. Use this when the user asks for deep details ('explain the 2nd one', 'what date was the meeting?', 'read full note', or pastes a link/summary like 'ownerbook.com').",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {
                        "type": "string",
                        "description": "The ID of the item if known"
                    },
                    "url_or_title": {
                        "type": "string",
                        "description": "The URL or title substring of the item to inspect (e.g. 'ownerbook.com')"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_memories",
            "description": "Get the user's most recently saved items in chronological order. Use when the user asks 'what did I save recently?', 'my recent saves', or when other searches return nothing and you want to offer recent items as helpful candidates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of recent items to retrieve (default 8)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_memory_card",
            "description": "Display an interactive memory card in the user's interface. Call this tool ONLY when the user explicitly requests to show, view, see, display, or open a specific note or item (e.g. 'show me that note', 'display the note from Mehul', 'can you show me the saved note', 'let me see the card'). NEVER call this tool during casual chat, general questions, or summaries.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {
                        "type": "string",
                        "description": "The exact ID of the memory item to display."
                    }
                },
                "required": ["item_id"]
            }
        }
    }
]


def clean_item_for_agent(doc: dict) -> dict:
    """Format an item cleanly for the agent prompt without raw database clutter."""
    if not doc:
        return {}
    raw_url = (doc.get("source_url") or doc.get("url") or "").strip()
    user_note_val = (doc.get("user_note") or "").strip()
    why_saved_val = (doc.get("why_saved") or "").strip()
    return {
        "id": str(doc.get("id")),
        "title": doc.get("title") or doc.get("source_title") or "Untitled",
        "url": raw_url if raw_url else None,
        "content_type": doc.get("content_type", "text"),
        "category": doc.get("category", "General"),
        "summary": doc.get("summary", ""),
        "user_note": user_note_val if user_note_val else None,
        "why_saved": why_saved_val if why_saved_val else None,
        "saved_at": doc.get("created_at", ""),
        "keywords": doc.get("keywords") or [],
        "text_preview": (doc.get("extracted_text") or doc.get("original_text") or doc.get("searchable_text") or "")[:500]
    }


async def tool_search_by_time_range(db, lib: str, start_date: str, end_date: str, description_hint: str = "") -> dict:
    """Deterministic timestamp filter against database created_at using clean PostgREST syntax."""
    try:
        query = db.supabase.table("items").select("*") \
            .eq("library_id", lib) \
            .eq("status", "ready")

        if start_date:
            query = query.gte("created_at", start_date)
        if end_date:
            query = query.lte("created_at", end_date)

        res = query.order("created_at", desc=True).limit(20).execute()
        items = res.data or []

        cleaned = [clean_item_for_agent(i) for i in items]
        return {
            "status": "success",
            "time_window": f"{start_date} to {end_date} ({description_hint or 'custom range'})",
            "total_found": len(cleaned),
            "items": cleaned
        }
    except Exception as e:
        logger.error(f"tool_search_by_time_range error: {e}")
        return {"status": "error", "message": str(e), "items": []}


async def tool_semantic_hybrid_search(retrieve_func, lib: str, query: str, limit: int = 8) -> dict:
    """Semantic vector and keyword search across user library."""
    try:
        results, _ = await retrieve_func(query, lib, limit=limit)
        cleaned = [clean_item_for_agent(r) for r in results]
        return {
            "status": "success",
            "query": query,
            "total_found": len(cleaned),
            "items": cleaned
        }
    except Exception as e:
        logger.error(f"tool_semantic_hybrid_search error: {e}")
        return {"status": "error", "message": str(e), "items": []}


async def tool_inspect_memory(db, lib: str, item_id: Optional[str] = None, url_or_title: Optional[str] = None) -> dict:
    """Fetch complete text and all fields of a specific memory."""
    try:
        doc = None
        if item_id:
            doc = await db.items.find_one({"id": item_id, "library_id": lib})
        
        if not doc and url_or_title:
            target = url_or_title.strip()
            # Clean URL domain if URL passed
            clean_target = re.sub(r'^https?://', '', target).rstrip('/')
            domain_part = clean_target.split('/')[0]
            
            # 1. Search by exact source_url regex
            doc = await db.items.find_one({
                "library_id": lib,
                "source_url": {"$regex": domain_part, "$options": "i"}
            })
            # 2. Or search by title regex
            if not doc:
                doc = await db.items.find_one({
                    "library_id": lib,
                    "title": {"$regex": target[:30], "$options": "i"}
                })

        if doc:
            full_item = clean_item_for_agent(doc)
            # Include complete un-truncated text for in-depth questions
            full_item["full_extracted_text"] = doc.get("extracted_text") or doc.get("original_text") or doc.get("searchable_text") or ""
            return {"status": "success", "found": True, "item": full_item}
        
        return {"status": "success", "found": False, "message": "No matching item found."}
    except Exception as e:
        logger.error(f"tool_inspect_memory error: {e}")
        return {"status": "error", "message": str(e)}


async def tool_get_recent_memories(db, lib: str, limit: int = 8) -> dict:
    """Fetch most recently saved items."""
    try:
        res = db.supabase.table("items").select("*") \
            .eq("library_id", lib) \
            .eq("status", "ready") \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        items = res.data or []
        if not items:
            items = await db.items.find({"library_id": lib, "status": "ready"}).sort("created_at", -1).to_list(limit)

        cleaned = [clean_item_for_agent(i) for i in items]
        return {
            "status": "success",
            "total_found": len(cleaned),
            "items": cleaned
        }
    except Exception as e:
        logger.error(f"tool_get_recent_memories error: {e}")
        return {"status": "error", "message": str(e), "items": []}


async def tool_show_memory_card(db, lib: str, item_id: str) -> dict:
    """Fetch and prepare a single memory card to be presented in the user UI."""
    try:
        res = db.supabase.table("items").select("*").eq("id", item_id).eq("library_id", lib).execute()
        item = res.data[0] if res.data else None
        if not item and hasattr(db, "items"):
            item = await db.items.find_one({"id": item_id, "library_id": lib})
        
        if item:
            return {"status": "success", "presented_item": item}
        return {"status": "error", "message": f"Item {item_id} not found."}
    except Exception as e:
        logger.error(f"tool_show_memory_card error: {e}")
        return {"status": "error", "message": str(e)}
