import os
import json
import httpx
import asyncio
import logging
from typing import List, Dict, Any, AsyncGenerator

logger = logging.getLogger(__name__)

# Config from Env (Fallback to what might exist)
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY") or os.environ.get("OLLAMA_API_KEY", "").strip()
NVIDIA_BASE_URL = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/")
NVIDIA_CHAT_MODEL = os.environ.get("NVIDIA_CHAT_MODEL", "meta/llama-3.2-11b-vision-instruct")
NVIDIA_EMBED_MODEL = os.environ.get("NVIDIA_EMBED_MODEL", "nvidia/nemotron-3-embed-1b")

async def get_httpx_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=120.0)

def strip_reasoning(content: str) -> str:
    """Strip reasoning blocks like <think>...</think> from the output."""
    import re
    return re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()

async def embed_texts(texts: List[str], input_type: str = "passage") -> List[List[float]]:
    """
    Generate embeddings for a list of texts. 
    input_type should be 'passage' for saved items and 'query' for search queries.
    """
    if not NVIDIA_API_KEY:
        logger.warning("NVIDIA_API_KEY not set. Embedding failed.")
        return [None] * len(texts)

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    url = f"{NVIDIA_BASE_URL}/embeddings"
    
    for attempt in range(3):
        try:
            payload = {
                "input": texts,
                "input_type": input_type,
                "model": NVIDIA_EMBED_MODEL,
                "encoding_format": "float",
                "truncate": "END"
            }
            async with await get_httpx_client() as client:
                resp = await client.post(url, headers=headers, json=payload)
                
                if resp.status_code in (429, 500, 502, 503, 504):
                    await asyncio.sleep(2 ** attempt)
                    continue
                    
                resp.raise_for_status()
                data = resp.json()
                return [item["embedding"] for item in data["data"]]
                
        except Exception as e:
            logger.error(f"Embedding error (attempt {attempt+1}): {str(e)}")
            if attempt == 2:
                logger.error("All embedding attempts failed.")
                return [None] * len(texts)
            await asyncio.sleep(2 ** attempt)
            
    return [None] * len(texts)

async def llm_chat(system: str, messages: List[Dict[str, str]]) -> str:
    """Standard non-streaming chat with history."""
    if not NVIDIA_API_KEY:
        return "AI is not configured."
        
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    url = f"{NVIDIA_BASE_URL}/chat/completions"
    
    payload_messages = [{"role": "system", "content": system}]
    payload_messages.extend(messages)
    
    payload = {
        "model": NVIDIA_CHAT_MODEL,
        "messages": payload_messages,
        "stream": False
    }
    
    for attempt in range(3):
        try:
            async with await get_httpx_client() as client:
                resp = await client.post(url, headers=headers, json=payload)
                
                if resp.status_code in (429, 500, 502, 503, 504):
                    await asyncio.sleep(2 ** attempt)
                    continue
                    
                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return strip_reasoning(content)
                
        except Exception as e:
            logger.error(f"Chat error (attempt {attempt+1}): {str(e)}")
            if attempt == 2:
                return "I'm having trouble connecting right now. Please try again later."
            await asyncio.sleep(2 ** attempt)
            
    return "Error generating response."

async def llm_chat_stream(system: str, messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
    """Streaming chat returning text deltas."""
    if not NVIDIA_API_KEY:
        yield "AI is not configured."
        return
        
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    url = f"{NVIDIA_BASE_URL}/chat/completions"
    
    payload_messages = [{"role": "system", "content": system}]
    payload_messages.extend(messages)
    
    payload = {
        "model": NVIDIA_CHAT_MODEL,
        "messages": payload_messages,
        "stream": True
    }
    
    try:
        async with await get_httpx_client() as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_text():
                    for line in chunk.splitlines():
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                delta = data["choices"][0]["delta"]
                                if "content" in delta:
                                    yield strip_reasoning(delta["content"])
                            except json.JSONDecodeError:
                                continue
    except Exception as e:
        logger.error(f"Stream error: {str(e)}")
        yield "\n\n(Connection interrupted)"
