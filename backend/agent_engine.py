import os
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, AsyncGenerator

from ai_provider import get_chat_config, get_httpx_client, strip_reasoning
from agent_tools import (
    AGENT_TOOLS_SCHEMA,
    tool_search_by_time_range,
    tool_semantic_hybrid_search,
    tool_inspect_memory,
    tool_get_recent_memories,
    clean_item_for_agent
)

logger = logging.getLogger(__name__)


def build_agent_system_prompt(today: datetime, active_memories: Optional[List[dict]] = None) -> str:
    today_str = today.strftime("%Y-%m-%d (%A)")
    
    prompt = (
        f"You are Forgot AI, an intelligent, personal memory assistant. Today's date is {today_str} (UTC).\n\n"
        "YOUR ROLE:\n"
        "You help users recall, search, summarize, and understand what they have saved across web pages, articles, screenshots, and text notes.\n\n"
        "AVAILABLE TOOLS:\n"
        "You have access to 4 deterministic tools:\n"
        "1. `search_by_time_range(start_date, end_date)`: Use when the user asks about time (e.g. 'this week', 'today', 'yesterday', 'past 7 days', 'last month', 'September 2026'). ALWAYS compute accurate start and end ISO dates based on today's date ({today_str})!\n"
        "2. `semantic_hybrid_search(query)`: Use when searching for topics, concepts, vague recollections ('a book like a vip or something'), meetings, people, or keywords.\n"
        "3. `inspect_memory(item_id, url_or_title)`: Use when the user asks for deep details on an item ('explain the 2nd one', 'what date was it?'), or pastes a link/summary (e.g. 'ownerbook.com').\n"
        "4. `get_recent_memories(limit)`: Use when user asks for recent saves, or as a helpful fallback.\n\n"
        "CRITICAL RULES:\n"
        "- CASUAL CONVERSATION: If the user says 'hi', 'how are you', 'thanks', etc., reply warmly, naturally, and concisely WITHOUT calling any tools.\n"
        "- MULTI-TURN MEMORY: If the user refers to something previously discussed (e.g. 'that second one', 'tell me more about the VIP ticket'), inspect or reference that specific memory directly.\n"
        "- CITATIONS & LINKS: When mentioning saved items with URLs, format them as clickable Markdown links: [Title](URL). If an item has NO URL (URL is null or note/image), format as bold text: **Title** (Note/Image).\n"
        "- ANTI-GASLIGHTING: NEVER claim an item does not exist if it was cited earlier in conversation or returned by your tools. If a tool returns results, explain them accurately."
    )

    if active_memories:
        prompt += "\n\nACTIVE MEMORIES CURRENTLY IN CONVERSATION CONTEXT:\n"
        for idx, m in enumerate(active_memories, 1):
            url_part = f"URL: {m.get('source_url') or m.get('url') or 'None'}"
            prompt += f"[{idx}] Title: {m.get('title')} | {url_part}\nSummary: {m.get('summary', '')[:200]}\n"

    return prompt


async def execute_agent_tool(tool_name: str, tool_args: dict, db, lib: str, retrieve_func) -> dict:
    """Execute the tool requested by the agent."""
    logger.info(f"Agent executing tool: {tool_name} with args: {tool_args}")
    try:
        if tool_name == "search_by_time_range":
            return await tool_search_by_time_range(
                db=db,
                lib=lib,
                start_date=tool_args.get("start_date", ""),
                end_date=tool_args.get("end_date", ""),
                description_hint=tool_args.get("description_hint", "")
            )
        elif tool_name == "semantic_hybrid_search":
            return await tool_semantic_hybrid_search(
                retrieve_func=retrieve_func,
                lib=lib,
                query=tool_args.get("query", ""),
                limit=tool_args.get("limit", 8)
            )
        elif tool_name == "inspect_memory":
            return await tool_inspect_memory(
                db=db,
                lib=lib,
                item_id=tool_args.get("item_id"),
                url_or_title=tool_args.get("url_or_title")
            )
        elif tool_name == "get_recent_memories":
            return await tool_get_recent_memories(
                db=db,
                lib=lib,
                limit=tool_args.get("limit", 8)
            )
        else:
            return {"status": "error", "message": f"Unknown tool: {tool_name}"}
    except Exception as e:
        logger.error(f"Error executing agent tool {tool_name}: {e}")
        return {"status": "error", "message": str(e)}


async def run_agent_stream(
    query: str,
    history: List[Dict[str, str]],
    db,
    lib: str,
    retrieve_func,
    active_memory_docs: Optional[List[dict]] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Orchestrates the Agentic Tool-Calling loop and yields streaming tokens & final payload.
    Yields dicts with:
      {"type": "token", "text": "..."}
      {"type": "tool_start", "name": "...", "args": ...}
      {"type": "final", "answer": "...", "cited_items": [...], "cited_ids": [...]}
    """
    base_url, api_key, model = get_chat_config()
    now_utc = datetime.now(timezone.utc)
    system_prompt = build_agent_system_prompt(now_utc, active_memory_docs)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    url = f"{base_url}/chat/completions"

    # Prepare message history
    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": query})

    # Step 1: Call LLM with tool definitions to see if it wants to use tools
    step1_payload = {
        "model": model,
        "messages": messages,
        "tools": AGENT_TOOLS_SCHEMA,
        "tool_choice": "auto",
        "stream": False
    }

    tool_calls = []
    direct_content = ""
    try:
        async with await get_httpx_client() as client:
            resp = await client.post(url, headers=headers, json=step1_payload)
            if resp.status_code == 200:
                data = resp.json()
                msg = data["choices"][0]["message"]
                tool_calls = msg.get("tool_calls") or []
                direct_content = msg.get("content") or ""
            else:
                logger.warning(f"Agent tool planning call returned {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Agent tool planning call failed: {e}")

    cited_items = []
    cited_ids = set()

    # If active memories exist in context, keep their IDs available
    if active_memory_docs:
        for it in active_memory_docs:
            if it.get("id"):
                cited_ids.add(str(it["id"]))

    # Step 2: Execute tools if requested
    if tool_calls:
        # Append assistant tool call message
        messages.append({
            "role": "assistant",
            "content": direct_content or None,
            "tool_calls": tool_calls
        })

        for tc in tool_calls:
            fn_name = tc.get("function", {}).get("name", "")
            raw_args = tc.get("function", {}).get("arguments", "{}")
            try:
                fn_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
            except Exception:
                fn_args = {}

            yield {"type": "tool_start", "name": fn_name, "args": fn_args}

            tool_result = await execute_agent_tool(fn_name, fn_args, db, lib, retrieve_func)

            # Collect items from tool result
            if isinstance(tool_result, dict):
                items = tool_result.get("items") or []
                single_item = tool_result.get("item")
                if single_item:
                    items.append(single_item)
                for itm in items:
                    if itm.get("id"):
                        cited_ids.add(str(itm["id"]))
                        cited_items.append(itm)

            messages.append({
                "role": "tool",
                "tool_call_id": tc.get("id", ""),
                "name": fn_name,
                "content": json.dumps(tool_result)
            })

    # Step 3: Stream the final answer (either direct or after tool execution)
    step2_payload = {
        "model": model,
        "messages": messages,
        "stream": True
    }

    full_answer_chunks = []
    try:
        async with await get_httpx_client() as client:
            async with client.stream("POST", url, headers=headers, json=step2_payload) as resp:
                resp.raise_for_status()
                inside_think = False
                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk_json = json.loads(data_str)
                        delta = chunk_json["choices"][0].get("delta", {})
                        text_delta = delta.get("content", "")
                        
                        # Handle thinking tags if model outputs them
                        if "<think>" in text_delta:
                            inside_think = True
                        if "</think>" in text_delta:
                            inside_think = False
                            continue
                        if inside_think:
                            continue

                        if text_delta:
                            full_answer_chunks.append(text_delta)
                            yield {"type": "token", "text": text_delta}
                    except Exception:
                        continue
    except Exception as e:
        logger.error(f"Agent streaming synthesis failed: {e}")
        # Fallback to direct content if streaming choked
        if direct_content and not full_answer_chunks:
            full_answer_chunks.append(direct_content)
            yield {"type": "token", "text": direct_content}
        else:
            yield {"type": "token", "text": " (An error occurred while streaming response.)"}

    final_answer = "".join(full_answer_chunks)

    # Clean cited items (deduplicated)
    seen = set()
    unique_cited_items = []
    for it in cited_items:
        if it.get("id") and it["id"] not in seen:
            seen.add(it["id"])
            unique_cited_items.append(it)

    yield {
        "type": "final",
        "answer": final_answer,
        "results": unique_cited_items,
        "context_ids": list(cited_ids)
    }
