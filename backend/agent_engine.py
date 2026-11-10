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
    tool_show_memory_card,
    clean_item_for_agent
)
from agent_sanitizer import sanitize_agent_text, StreamSanitizer

logger = logging.getLogger(__name__)


def build_agent_system_prompt(today: datetime, active_memories: Optional[List[dict]] = None) -> str:
    today_str = today.strftime("%Y-%m-%d (%A)")
    
    prompt = (
        f"You are Forgot AI, a warm, intelligent personal memory assistant. Today's date is {today_str} (UTC).\n\n"
        "YOUR ROLE:\n"
        "You help users recall, search, summarize, and understand what they have saved across web pages, articles, screenshots, and text notes.\n\n"
        "CONVERSATIONAL STYLE & BEHAVIOR:\n"
        "- Speak naturally, concisely, and warmly as a knowledgeable human companion.\n"
        "- SILENT TOOLS: Your internal tools and database mechanics are strictly silent and invisible. Never mention tool names, function signatures (such as inspect_memory or search_by_time_range), or technical query operations in your responses. Talk like a human helper, not an API.\n"
        "- CASUAL CONVERSATION: If the user says 'hi', 'how are you', 'thanks', etc., reply warmly and concisely without executing any tools.\n"
        "- CITATIONS & LINKS: When mentioning saved items that have URLs, format them as clickable Markdown links: [Title](URL). If an item has NO URL (note or screenshot), format as bold text: **Title** (Note/Image).\n"
        "- MULTI-TURN MEMORY: If the user refers to something previously discussed (e.g. 'that second one', 'tell me more about the VIP ticket'), reference or look into that specific item seamlessly.\n"
        "- ANTI-GASLIGHTING: NEVER claim an item does not exist if it was cited earlier in conversation or returned by your tools. If tools return items, present them clearly and accurately.\n"
        "- ANSWERING \"WHY DID I SAVE THIS?\": When the user asks why they saved something, explain the reason directly, naturally, and concisely in plain English. If no personal note was left when saving, simply say: \"You didn't add a personal note when saving this, but the page is about [topic].\"\n"
        "- CLEAN MARKDOWN FORMATTING: Always use clean, standard Markdown. Ensure Markdown headers have a space after hashes (e.g. '### Header', never '###Header'). When outputting tables, ensure every row is on its own separate line with proper '|' borders so it renders cleanly as a table.\n"
        "- UI MEMORY CARDS: Do NOT show memory cards during general conversation, questions, answers, or summaries. Answer normally with clear text. ONLY when the user explicitly requests to show, view, see, display, or open a specific saved note (e.g. 'show me that note', 'display the note from Mehul', 'let me see the note for X', 'open that card'), call the `show_memory_card` tool with the item ID."
    )

    if active_memories:
        prompt += "\n\nACTIVE MEMORIES CURRENTLY IN CONVERSATION CONTEXT:\n"
        for m in active_memories:
            url_part = f"URL: {m.get('source_url') or m.get('url') or 'None'}"
            user_intent = m.get('why_saved') or m.get('user_note')
            intent_str = f"User Note/Reason: {user_intent}" if user_intent else "User Note/Reason: None provided when saved"
            prompt += f"- ID: {m.get('id')} | Title: {m.get('title')} | {url_part}\n  {intent_str}\n  Summary: {m.get('summary', '')[:250]}\n"

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
        elif tool_name == "show_memory_card":
            return await tool_show_memory_card(
                db=db,
                lib=lib,
                item_id=tool_args.get("item_id", "")
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
    presented_items = []

    # Step 2A: If no tools were called, stream direct conversational answer immediately (zero cards)
    if not tool_calls:
        clean_direct = sanitize_agent_text(direct_content)
        if clean_direct:
            words = clean_direct.split(" ")
            for i, word in enumerate(words):
                chunk = word if i == len(words) - 1 else word + " "
                yield {"type": "token", "text": chunk}
                await asyncio.sleep(0.008)

            yield {
                "type": "final",
                "answer": clean_direct,
                "results": [],
                "context_ids": []
            }
            return

    # Step 2B: Execute tools if requested
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
            presented_item = tool_result.get("presented_item")
            if presented_item:
                presented_items.append(presented_item)
                if presented_item.get("id"):
                    cited_ids.add(str(presented_item["id"]))

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

    # Step 3: Stream the final synthesized answer with the Zero-Leak Sanitizer
    step2_payload = {
        "model": model,
        "messages": messages,
        "stream": True
    }

    sanitizer = StreamSanitizer()
    full_answer_chunks = []
    try:
        async with await get_httpx_client() as client:
            async with client.stream("POST", url, headers=headers, json=step2_payload) as resp:
                resp.raise_for_status()
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
                        
                        if text_delta:
                            clean_chunk = sanitizer.push(text_delta)
                            if clean_chunk:
                                full_answer_chunks.append(clean_chunk)
                                yield {"type": "token", "text": clean_chunk}
                    except Exception:
                        continue
                
                # Flush any remaining buffer in sanitizer
                flushed = sanitizer.flush()
                if flushed:
                    full_answer_chunks.append(flushed)
                    yield {"type": "token", "text": flushed}
    except Exception as e:
        logger.error(f"Agent streaming synthesis failed: {e}")
        # Fallback to direct content if streaming choked
        fallback_text = sanitize_agent_text(direct_content) if direct_content else "I encountered an issue processing that. Could you try asking again?"
        full_answer_chunks.append(fallback_text)
        yield {"type": "token", "text": fallback_text}

    final_answer = sanitize_agent_text("".join(full_answer_chunks))

    # Clean presented items (strictly only items explicitly requested via show_memory_card)
    seen = set()
    unique_presented_items = []
    for it in presented_items:
        if it.get("id") and it["id"] not in seen:
            seen.add(it["id"])
            unique_presented_items.append(it)

    yield {
        "type": "final",
        "answer": final_answer,
        "results": unique_presented_items,
        "context_ids": list(seen)
    }
