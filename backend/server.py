import os
import uuid
import json
import logging
import base64
import re
import hashlib
import socket
import ipaddress
from pathlib import Path
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse
from typing import List, Optional, Annotated
from collections import defaultdict
import asyncio
import aiohttp
import requests
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Header, Query, Request, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict, EmailStr
from supabase_db import SupabaseDatabase, create_supabase_client
from supabase import create_client as make_supabase_client

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

supabase = create_supabase_client()
db = SupabaseDatabase(supabase)

OLLAMA_API_KEY = os.environ.get('OLLAMA_API_KEY', '').strip()
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '').strip()
NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY', '').strip()
OLLAMA_BASE_URL = (os.environ.get('OLLAMA_BASE_URL') or "https://ollama.com/api/chat").rstrip('/')
AI_MODEL = ("ollama", "gpt-oss:20b")
APP_NAME = "forgot-ai"

# WebSocket Manager for real-time Live Sync
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, user_id: str):
        await ws.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(ws)

    def disconnect(self, ws: WebSocket, user_id: str):
        if user_id in self.active_connections and ws in self.active_connections[user_id]:
            self.active_connections[user_id].remove(ws)

    async def broadcast_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

ws_manager = ConnectionManager()
STORAGE_BUCKET = os.environ.get("STORAGE_BUCKET", "forgot-ai-assets")

app = FastAPI()
api_router = APIRouter(prefix="/api")

DEFAULT_LIB = "default"
MAX_FAILED = 5
LOCKOUT_MIN = 15


class SimpleRateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)
        self.cleanup_counter = 0

    def check(self, key: str, max_requests: int, window_seconds: int = 60):
        self.cleanup_counter += 1
        now = datetime.now(timezone.utc).timestamp()
        if self.cleanup_counter > 1000:
            self._prune(now, window_seconds)
            self.cleanup_counter = 0
        timestamps = [t for t in self.requests[key] if now - t < window_seconds]
        if len(timestamps) >= max_requests:
            raise HTTPException(429, "Too many requests. Please slow down.")
        timestamps.append(now)
        self.requests[key] = timestamps

    def _prune(self, now: float, window_seconds: int):
        empty_keys = []
        for k, v in self.requests.items():
            valid = [t for t in v if now - t < window_seconds]
            if not valid:
                empty_keys.append(k)
            else:
                self.requests[k] = valid
        for k in empty_keys:
            del self.requests[k]


limiter = SimpleRateLimiter()


async def put_object(path: str, data: bytes, content_type: str) -> dict:
    def _upload():
        supabase.storage.from_(STORAGE_BUCKET).upload(
            path, data, {"content-type": content_type, "upsert": "false"}
        )
    await asyncio.to_thread(_upload)
    return {"path": path}


async def get_object(path: str):
    def _download():
        return supabase.storage.from_(STORAGE_BUCKET).download(path)
    data = await asyncio.to_thread(_download)
    extension = path.rsplit(".", 1)[-1].lower() if "." in path else "octet-stream"
    content_types = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "gif": "image/gif"}
    return data, content_types.get(extension, "application/octet-stream")


def is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme.lower() not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        if hostname.lower() in ("localhost", "loopback", "metadata.google.internal"):
            return False
        addr_info = socket.getaddrinfo(hostname, None)
        for family, socktype, proto, canonname, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
                return False
            if str(ip) in ("169.254.169.254", "169.254.169.253"):
                return False
        return True
    except Exception as e:
        logger.warning(f"URL safety check failed for {url}: {e}")
        return False


def validate_image_bytes(data: bytes) -> str:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "gif"
    if data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
        return "webp"
    raise HTTPException(400, "Invalid image format")


# ---------------- Dedup / helpers ----------------
def normalize_url(u: str) -> str:
    u = (u or "").strip()
    if not u:
        return ""
    if not u.startswith("http"):
        u = "https://" + u
    p = urlparse(u)
    netloc = p.netloc.lower()
    path = (p.path or "").rstrip("/")
    return f"{p.scheme.lower()}://{netloc}{path}" + (f"?{p.query}" if p.query else "")


def domain_of(u: str) -> str:
    try:
        return urlparse(normalize_url(u)).netloc.replace("www.", "")
    except Exception:
        return ""


def text_hash(t: str) -> str:
    norm = re.sub(r"\s+", " ", (t or "").strip().lower())
    return "text:" + hashlib.sha256(norm.encode()).hexdigest()


# ---------------- Models ----------------
PyObjectId = Annotated[str, BeforeValidator(str)]


class SavedItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    library_id: str = DEFAULT_LIB
    content_type: str
    original_text: Optional[str] = None
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    source_domain: Optional[str] = None
    image_path: Optional[str] = None
    title: str = "Untitled"
    summary: str = ""
    why_saved: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    category: str = "Uncategorized"
    extracted_text: str = ""
    searchable_text: str = ""
    dedup_key: Optional[str] = None
    status: str = "processing"
    pinned: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TextSaveIn(BaseModel):
    text: str
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    user_note: Optional[str] = None


class UrlSaveIn(BaseModel):
    url: str
    context_text: Optional[str] = None
    source_title: Optional[str] = None
    user_note: Optional[str] = None


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    keywords: Optional[List[str]] = None


class SearchIn(BaseModel):
    query: str


class ChatIn(BaseModel):
    query: str
    stream: bool = False


class PinIn(BaseModel):
    pinned: bool


class AskIn(BaseModel):
    question: str


class CheckIn(BaseModel):
    content_type: str
    text: Optional[str] = None
    url: Optional[str] = None
    hash: Optional[str] = None


class AuthIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class ImportIn(BaseModel):
    library_id: str


# ---------------- Auth dependencies ----------------
def public_user(u: dict) -> dict:
    return {"id": u["id"], "email": u["email"], "name": u.get("name", ""), "created_at": u.get("created_at")}


def _bearer(request: Request) -> Optional[str]:
    h = request.headers.get("Authorization", "")
    return h[7:] if h.startswith("Bearer ") else None


async def _record_session(user_id: str, access_token: str, token_version: int):
    token_hash = hashlib.sha256(access_token.encode()).hexdigest()
    await db.sessions.insert_one({
        "user_id": user_id,
        "token_hash": token_hash,
        "token_version": token_version,
        "created_at": datetime.now(timezone.utc).isoformat()
    })


async def _user_from_token(token: str) -> Optional[dict]:
    try:
        auth_user = supabase.auth.get_user(token).user
    except Exception:
        return None
    user = await db.users.find_one({"id": str(auth_user.id)})
    if not user:
        return None
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    sess = await db.sessions.find_one({"token_hash": token_hash, "user_id": user["id"]})
    if not sess or sess.get("token_version") != user.get("token_version", 0):
        return None
    return user


async def resolve_library(request: Request) -> str:
    """Authenticated -> user's private library (=user id). Unauthenticated -> 401."""
    token = _bearer(request)
    if token:
        u = await _user_from_token(token)
        if u:
            return u["id"]
        raise HTTPException(401, "Invalid or expired session")
    raise HTTPException(401, "Please sign in to Forgot AI.")


async def get_current_user(request: Request) -> dict:
    token = _bearer(request)
    if not token:
        raise HTTPException(401, "Please sign in to Forgot AI.")
    u = await _user_from_token(token)
    if not u:
        raise HTTPException(401, "Invalid or expired session")
    return u


# ---------------- AI helpers ----------------
async def get_embedding(text: str) -> Optional[List[float]]:
    if not NVIDIA_API_KEY:
        logger.warning("NVIDIA_API_KEY not set. Cannot generate embeddings.")
        return None
    url = "https://integrate.api.nvidia.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "input": [text],
        "model": "nvidia/nemotron-3-embed-1b",
        "encoding_format": "float"
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload, timeout=30) as resp:
                resp.raise_for_status()
                data = await resp.json()
                return data["data"][0]["embedding"]
    except Exception as e:
        logger.error(f"NVIDIA Embedding API failed: {e}")
        return None

async def groq_vision_scan(image_b64: str) -> str:
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set. Cannot use Groq vision model.")
        return "No text extracted (Groq API Key missing)."
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "qwen/qwen3.8-27b",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe what this image shows in detail and extract any readable text. Output only the description and extracted text."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                ]
            }
        ],
        "temperature": 0.5,
        "max_tokens": 800
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload, timeout=60) as resp:
                resp.raise_for_status()
                data = await resp.json()
                return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Groq Vision API failed: {e}")
        return "No text extracted due to processing error."

async def llm_text(system: str, prompt: str, image_b64: Optional[str] = None) -> str:
    user_msg = {"role": "user", "content": prompt}
    if image_b64:
        user_msg["images"] = [image_b64]

    payload = {
        "model": AI_MODEL[1],
        "messages": [
            {"role": "system", "content": system},
            user_msg,
        ],
        "stream": False,
        "format": "json",
    }

    headers = {"Content-Type": "application/json"}
    if OLLAMA_API_KEY:
        headers["Authorization"] = f"Bearer {OLLAMA_API_KEY}"
        headers["X-API-Key"] = OLLAMA_API_KEY

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(OLLAMA_BASE_URL, headers=headers, json=payload, timeout=180) as response:
                response.raise_for_status()
                data = await response.json()

        if isinstance(data, dict):
            if isinstance(data.get("response"), str):
                return data["response"]
            if isinstance(data.get("content"), str):
                return data["content"]
            if isinstance(data.get("message"), str):
                return data["message"]
            if isinstance(data.get("message"), dict):
                content = data["message"].get("content")
                if isinstance(content, str):
                    return content
        return json.dumps(data)
    except Exception as e:
        logger.error(f"LLM request failed: {e}")
        return "{}"


async def llm_stream(system: str, prompt: str, image_b64: Optional[str] = None):
    user_msg = {"role": "user", "content": prompt}
    if image_b64:
        user_msg["images"] = [image_b64]

    payload = {
        "model": AI_MODEL[1],
        "messages": [
            {"role": "system", "content": system},
            user_msg,
        ],
        "stream": True,
    }

    headers = {"Content-Type": "application/json"}
    if OLLAMA_API_KEY:
        headers["Authorization"] = f"Bearer {OLLAMA_API_KEY}"
        headers["X-API-Key"] = OLLAMA_API_KEY

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(OLLAMA_BASE_URL, headers=headers, json=payload, timeout=180) as response:
                response.raise_for_status()
                async for line in response.content:
                    if line:
                        try:
                            data = json.loads(line.decode('utf-8'))
                            if "message" in data and "content" in data["message"]:
                                yield data["message"]["content"]
                            elif "response" in data:
                                yield data["response"]
                        except json.JSONDecodeError:
                            pass
    except Exception as e:
        logger.error(f"LLM stream request failed: {e}")
        yield "Error: Could not complete the response."


def parse_json_block(text: str) -> dict:
    if not text:
        return {}
    m = re.search(r"[\{\[].*[\}\]]", text, re.DOTALL)
    if not m:
        return {}
    try:
        parsed = json.loads(m.group(0))
        if isinstance(parsed, list):
            for item in parsed:
                if isinstance(item, dict):
                    return item
            return {}
        return parsed
    except Exception:
        return {}


ENRICH_SYSTEM = (
    "You are Forgot AI, a personal memory organizer. Given a saved item, produce concise, useful metadata "
    "so the user can find it later with natural language. Always respond with a single JSON object only, no prose."
)


def enrich_prompt(kind: str, body: str, user_note: Optional[str] = None) -> str:
    note_context = ""
    if user_note and user_note.strip():
        note_context = f'\nUSER NOTE (Context on why they saved this):\n"{user_note}"\n'

    return (
        f"The user saved this {kind}. Analyze it and return JSON with keys: "
        '"title" (short, specific, max 8 words), '
        '"summary" (1-2 plain sentences explaining what it is and why it may be useful), '
        '"why_saved" (1 short sentence starting with \'You likely saved this because...\' incorporating the USER NOTE if provided, or inferred from content if not), '
        '"keywords" (array of 4-8 lowercase topical keywords, include synonyms/related concepts, not just literal words), '
        '"category" (one short label like Ideas, AI Tools, Coding, Marketing, Productivity, Reference, Design, Finance, Personal), '
        '"extracted_text" (any readable text found in the content, or empty string), '
        '"searchable_text" (a rich paragraph combining literal content AND its meaning, topics, and likely search intents).\n\n'
        f"CONTENT:\n{body}{note_context}"
    )


async def fetch_url_content(url: str):
    if not is_safe_url(url):
        logger.warning(f"SSRF blocked URL fetch for {url}")
        return None, "", None, None
    title, text, og_image, og_desc = None, "", None, None
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0 (compatible; ForgotAI/1.0)"}) as r:
                html = await r.text()
        tm = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        if tm:
            title = re.sub(r"\s+", " ", tm.group(1)).strip()[:200]
            
        og_img_m = re.search(r"<meta\s+(?:property|name)=[\"']og:image[\"']\s+content=[\"'](.*?)[\"']", html, re.IGNORECASE)
        if og_img_m:
            og_image = og_img_m.group(1).strip()
            
        og_desc_m = re.search(r"<meta\s+(?:property|name)=[\"']og:description[\"']\s+content=[\"'](.*?)[\"']", html, re.IGNORECASE)
        if og_desc_m:
            og_desc = og_desc_m.group(1).strip()
            
        body = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.IGNORECASE | re.DOTALL)
        body = re.sub(r"<[^>]+>", " ", body)
        body = re.sub(r"\s+", " ", body).strip()
        text = body[:6000]
    except Exception as e:
        logger.warning(f"URL fetch failed for {url}: {e}")
    return title, text, og_image, og_desc


async def enrich_item(item_id: str, user_note: Optional[str] = None):
    doc = await db.items.find_one({"id": item_id})
    if not doc:
        return
    try:
        ct = doc["content_type"]
        if ct == "image":
            data, _ = await get_object(doc["image_path"])
            b64 = base64.b64encode(data).decode()
            
            # Use Groq to extract text and describe the image
            extracted_text = await groq_vision_scan(b64)
            
            # Save the extracted text back to the database as original_text
            await db.items.update_one({"id": item_id}, {"$set": {"original_text": extracted_text}})
            
            # Pass the extracted text to Ollama for categorization
            raw = await llm_text(ENRICH_SYSTEM,
                                 enrich_prompt("screenshot/image extracted text", extracted_text, user_note))
        elif ct == "url":
            title, text, og_image, og_desc = await fetch_url_content(doc["source_url"])
            update = {}
            if title and not doc.get("source_title"):
                update["source_title"] = title
            if og_image and not doc.get("image_path"):
                update["image_path"] = og_image
            if update:
                await db.items.update_one({"id": item_id}, {"$set": update})
            body = (f"URL: {doc['source_url']}\nDomain: {doc.get('source_domain')}\n"
                    f"Page title: {title or doc.get('source_title') or 'unknown'}\n"
                    f"Page description: {og_desc or doc.get('og_description') or 'none'}\n"
                    f"Extracted page content: {text or doc.get('original_text') or 'not accessible'}")
            raw = await llm_text(ENRICH_SYSTEM, enrich_prompt("web page / URL", body, user_note))
        else:
            raw = await llm_text(ENRICH_SYSTEM, enrich_prompt("text note", doc.get("original_text") or "", user_note))

        meta = parse_json_block(raw)
        if not meta.get("title"):
            raise ValueError("empty enrichment")
        kws = meta.get("keywords") or []
        if isinstance(kws, str):
            kws = [k.strip() for k in kws.split(",") if k.strip()]
        
        update = {
            "title": str(meta.get("title", "Untitled"))[:200],
            "summary": str(meta.get("summary", "")),
            "why_saved": str(meta.get("why_saved", "")),
            "keywords": [str(k) for k in kws][:12],
            "category": str(meta.get("category", "Uncategorized"))[:40],
            "extracted_text": str(meta.get("extracted_text", "")),
            "searchable_text": str(meta.get("searchable_text", "")),
            "status": "ready",
        }
        
        # Don't overwrite why_saved if it's empty but previously existed (though it should be a new insert usually)
        if not update["why_saved"]:
            del update["why_saved"]
            
        # Generate semantic embedding
        # Include content_type for image/screenshot searchability
        content_type_str = f"Type: {doc.get('content_type', 'unknown')}"
        if doc.get("content_type") == "image":
            content_type_str += " (image screenshot picture)"
            
        ext_text = update.get("extracted_text", "")[:1500]
        search_text = update.get("searchable_text", "")[:1500]
        
        embedding_text = f"{update.get('title', '')}\n{update.get('summary', '')}\nKeywords: {' '.join(update.get('keywords', []))}\nCategory: {update.get('category', '')}\n{content_type_str}\n{ext_text}\n{search_text}"
        embedding = await get_embedding(embedding_text)
        if embedding:
            update["embedding"] = embedding
        else:
            logger.warning(f"Embedding failed for item {item_id}, saving as ready anyway.")
            
        await db.items.update_one({"id": item_id}, {"$set": update})
        
        # Broadcast updated item to live sync
        updated_doc = await db.items.find_one({"id": item_id})
        if updated_doc:
            await ws_manager.broadcast_user(updated_doc["owner_user_id"], {"type": "ITEM_UPDATED", "item": clean(updated_doc)})
            
        logger.info(f"Enriched item {item_id}")
    except Exception as e:
        logger.error(f"Enrichment failed for {item_id}: {e}")
        await db.items.update_one({"id": item_id}, {"$set": {"status": "failed"}})
        
        updated_doc = await db.items.find_one({"id": item_id})
        if updated_doc:
            await ws_manager.broadcast_user(updated_doc["owner_user_id"], {"type": "ITEM_UPDATED", "item": clean(updated_doc)})


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def rel_age(iso: str) -> str:
    try:
        d = datetime.fromisoformat(iso)
        secs = (datetime.now(timezone.utc) - d).total_seconds()
        days = secs / 86400
        if days < 1:
            return "today"
        if days < 2:
            return "yesterday"
        if days < 7:
            return f"{int(days)} days ago"
        if days < 30:
            return f"{int(days // 7)} weeks ago"
        return f"{int(days // 30)} months ago"
    except Exception:
        return ""


async def retrieve(query: str, lib: str, limit: int = 30):
    q_lower = query.lower()
    time_filter = ""
    
    # 1. Recency path (NO embedding, NO hybrid RPC)
    recency_words = ["latest", "just saved", "most recent", "last save", "last saved", "last note"]
    if any(word in q_lower for word in recency_words):
        logger.info(f"Using pure recency path for query: {query}")
        docs = await db.items.find({"library_id": lib, "status": "ready"}).sort("created_at", -1).to_list(limit)
        results = [clean(d) for d in docs]
        return results, {d["id"]: d for d in results}

    # Time window path
    if "yesterday" in q_lower:
        time_filter = "yesterday"
    elif "today" in q_lower:
        time_filter = "today"
    elif any(word in q_lower for word in ["this week", "last week", "recent"]):
        time_filter = "week"
        
    query_embedding = await get_embedding(query)
    
    matches = []
    if query_embedding:
        try:
            logger.info(f"Using hybrid search RPC for query: {query}")
            response = supabase.rpc(
                'hybrid_search_items',
                {
                    'query_embedding': query_embedding,
                    'query_text': query,
                    'time_filter': time_filter,
                    'match_count': limit,
                    'p_library_id': lib
                }
            ).execute()
            
            matches = response.data or []
        except Exception as e:
            logger.error(f"Hybrid search RPC failed: {e}")
            matches = []
            
    # Fallback 1 & 2: If RPC failed or returned nothing (or if embedding failed)
    if not matches:
        logger.info("Hybrid search returned empty or failed. Trying keyword fallback.")
        # Keyword fallback
        regex = {"$regex": query, "$options": "i"}
        fb_docs = await db.items.find({
            "library_id": lib,
            "status": "ready",
            "$or": [
                {"title": regex},
                {"summary": regex},
                {"extracted_text": regex},
                {"searchable_text": regex},
            ]
        }).to_list(limit)
        
        if fb_docs:
            matches = fb_docs
        else:
            # Fallback 2: Recent items
            logger.info("Keyword fallback empty. Returning latest 10 items as fallback.")
            matches = await db.items.find({"library_id": lib, "status": "ready"}).sort("created_at", -1).to_list(min(limit, 10))

    if not matches:
        return [], {}

    # matches might be from RPC (which omits MongoDB _id but returns all cols) or from fallback.
    results = [clean(d) for d in matches]
    
    # Optional: re-fetch from db if the RPC didn't return all fields
    matched_ids = [m['id'] for m in results]
    full_docs = await db.items.find({"id": {"in": matched_ids}}).to_list(len(matched_ids))
    by_id = {d["id"]: clean(d) for d in full_docs}
    
    # Sort them back into the order matches provided
    final_results = []
    for m in results:
        if m['id'] in by_id:
            final_results.append(by_id[m['id']])

    return final_results, by_id


async def import_library(source_lib: str, user_id: str) -> int:
    source_lib = (source_lib or "").strip()
    if not source_lib or source_lib == DEFAULT_LIB or source_lib == user_id:
        return 0
    if await db.users.find_one({"id": source_lib}):
        return 0
    res = await db.items.update_many(
        {"library_id": source_lib, "owner_user_id": None},
        {"$set": {"library_id": user_id, "owner_user_id": user_id}},
    )
    return res.modified_count


# ---------------- WebSocket Sync ----------------
@api_router.websocket("/ws/sync")
async def websocket_sync(websocket: WebSocket, token: str = Query(...)):
    try:
        auth_user = supabase.auth.get_user(token).user
        user_id = str(auth_user.id)
    except Exception:
        await websocket.close(code=1008)
        return

    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text() # Keep alive
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)

# ---------------- Auth routes ----------------
@api_router.post("/auth/register")
async def register(payload: AuthIn, request: Request):
    email = payload.email.lower().strip()
    if len(payload.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    try:
        # --- THE FIX: Create a dedicated Admin Client ---
        supabase_url = os.environ.get("SUPABASE_URL")
        service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not service_key:
            raise HTTPException(500, "Server is missing SUPABASE_SERVICE_ROLE_KEY!")
            
        supabase_admin = make_supabase_client(supabase_url, service_key)
        
        # Use supabase_admin instead of supabase here!
        created = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {"name": email.split("@")[0]},
        })
        auth_user = created.user
        # ------------------------------------------------

    except Exception as e:
        if "already" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(400, "An account with this email already exists")
        raise HTTPException(400, f"Unable to create account: {str(e)}") from e
        
    user = {
        "id": str(auth_user.id),
        "email": email,
        "name": email.split("@")[0],
        "token_version": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    
    # Use the regular anon client to sign them in after creation
    session = supabase.auth.sign_in_with_password({"email": email, "password": payload.password})
    await _record_session(user["id"], session.session.access_token, user["token_version"])

    anon = (request.headers.get("X-Library-Id") or "").strip()
    imported = await import_library(anon, user["id"]) if anon else 0
    return {
        "token": session.session.access_token,
        "refresh_token": session.session.refresh_token,
        "user": public_user(user),
        "imported": imported,
    }


@api_router.post("/auth/login")
async def login(payload: AuthIn, request: Request):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    ident = f"{ip}:{email}"
    att = await db.login_attempts.find_one({"identifier": ident})
    if att and att.get("count", 0) >= MAX_FAILED:
        locked_until = datetime.fromisoformat(att["locked_until"]) if att.get("locked_until") else None
        if locked_until and locked_until > datetime.now(timezone.utc):
            raise HTTPException(429, "Too many attempts. Try again in a few minutes.")
    try:
        temp_client = make_supabase_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
        session = temp_client.auth.sign_in_with_password({"email": email, "password": payload.password})
        auth_user = session.user
    except Exception:
        count = (att.get("count", 0) if att else 0) + 1
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$set": {"count": count, "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MIN)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    user = await db.users.find_one({"id": str(auth_user.id)})
    if not user:
        user = {
            "id": str(auth_user.id),
            "email": email,
            "name": (auth_user.user_metadata or {}).get("name", email.split("@")[0]),
            "token_version": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    await _record_session(user["id"], session.session.access_token, user.get("token_version", 0))

    anon = (request.headers.get("X-Library-Id") or "").strip()
    count = await import_library(anon, user["id"]) if anon else 0
    return {
        "token": session.session.access_token,
        "refresh_token": session.session.refresh_token,
        "user": public_user(user),
        "importable_count": count,
    }


@api_router.post("/auth/refresh")
async def refresh_session(payload: RefreshIn):
    try:
        temp_client = make_supabase_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
        session = temp_client.auth.refresh_session(payload.refresh_token)
        auth_user = session.user
    except Exception:
        raise HTTPException(401, "Invalid or expired refresh token")
    user = await db.users.find_one({"id": str(auth_user.id)})
    if not user:
        raise HTTPException(401, "User profile not found")
    await _record_session(user["id"], session.session.access_token, user.get("token_version", 0))
    return {
        "token": session.session.access_token,
        "refresh_token": session.session.refresh_token,
        "user": public_user(user),
    }


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api_router.post("/auth/logout")
async def logout(request: Request, user: dict = Depends(get_current_user)):
    token = _bearer(request)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"token_version": 1}})
    await db.sessions.delete_one({"user_id": user["id"]})
    if token:
        try:
            supabase.auth.admin.sign_out(token)
        except Exception:
            pass
    return {"ok": True}


@api_router.post("/auth/import")
async def do_import(payload: ImportIn, request: Request, user: dict = Depends(get_current_user)):
    anon_hdr = (request.headers.get("X-Library-Id") or "").strip()
    if not anon_hdr or anon_hdr != payload.library_id:
        return {"imported": 0}
    imported = await import_library(anon_hdr, user["id"])
    return {"imported": imported}


# ---------------- Item routes ----------------
@api_router.get("/")
async def api_root():
    return {"message": "Forgot AI API"}


@api_router.post("/items/check")
async def check_duplicate(payload: CheckIn, lib: str = Depends(resolve_library)):
    key = None
    if payload.content_type == "url" and payload.url:
        key = normalize_url(payload.url)
    elif payload.content_type == "text" and payload.text:
        key = text_hash(payload.text)
    elif payload.content_type == "image" and payload.hash:
        key = "img:" + payload.hash
    if not key:
        return {"duplicate": False}
    doc = await db.items.find_one({"library_id": lib, "dedup_key": key})
    if doc:
        return {"duplicate": True, "item": clean(doc)}
    return {"duplicate": False}


@api_router.post("/items/text", response_model=SavedItem)
async def save_text(payload: TextSaveIn, background: BackgroundTasks, lib: str = Depends(resolve_library)):
    limiter.check(lib, 60, 60)
    if not payload.text.strip():
        raise HTTPException(400, "Text is empty")
    item = SavedItem(library_id=lib, content_type="text", original_text=payload.text,
                     source_url=payload.source_url, source_title=payload.source_title,
                     source_domain=domain_of(payload.source_url) if payload.source_url else None,
                     dedup_key=text_hash(payload.text), title=payload.text.strip()[:60])
    values = item.model_dump()
    values["owner_user_id"] = lib
    await db.items.insert_one(values)
    background.add_task(enrich_item, item.id, payload.user_note)
    await ws_manager.broadcast_user(lib, {"type": "NEW_ITEM", "item": clean(values)})
    return item


@api_router.post("/items/url", response_model=SavedItem)
async def save_url(payload: UrlSaveIn, background: BackgroundTasks, lib: str = Depends(resolve_library)):
    limiter.check(lib, 60, 60)
    url = payload.url.strip()
    if not url:
        raise HTTPException(400, "URL is empty")
    if not url.startswith("http"):
        url = "https://" + url
    item = SavedItem(library_id=lib, content_type="url", source_url=url,
                     original_text=payload.context_text, source_title=payload.source_title,
                     source_domain=domain_of(url), dedup_key=normalize_url(url), title=url[:60])
    values = item.model_dump()
    values["owner_user_id"] = lib
    await db.items.insert_one(values)
    background.add_task(enrich_item, item.id, payload.user_note)
    await ws_manager.broadcast_user(lib, {"type": "NEW_ITEM", "item": clean(values)})
    return item


@api_router.post("/items/image", response_model=SavedItem)
async def save_image(background: BackgroundTasks, file: UploadFile = File(...),
                     source_url: Optional[str] = Form(None), source_title: Optional[str] = Form(None),
                     user_note: Optional[str] = Form(None),
                     lib: str = Depends(resolve_library)):
    limiter.check(lib, 60, 60)
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty image")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "Image too large. Max 10MB.")
    ext = validate_image_bytes(data)
    path = f"{lib}/{uuid.uuid4()}.{ext}"
    ct = file.content_type or f"image/{ext}"
    try:
        result = await put_object(path, data, ct)
        stored_path = result["path"]
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(500, "Upload failed")

    item = SavedItem(library_id=lib, content_type="image", image_path=stored_path,
                     source_url=source_url, source_title=source_title,
                     source_domain=domain_of(source_url) if source_url else None,
                     title="Image")
    values = item.model_dump()
    values["owner_user_id"] = lib
    await db.items.insert_one(values)
    background.add_task(enrich_item, item.id, user_note)
    await ws_manager.broadcast_user(lib, {"type": "NEW_ITEM", "item": clean(values)})
    return item


@api_router.get("/items", response_model=List[SavedItem])
async def list_items(limit: int = 200, lib: str = Depends(resolve_library)):
    docs = await db.items.find({"library_id": lib}).sort("created_at", -1).to_list(limit)
    return [clean(d) for d in docs]


@api_router.get("/items/{item_id}/related", response_model=List[SavedItem])
async def related_items(item_id: str, lib: str = Depends(resolve_library)):
    target = await db.items.find_one({"id": item_id, "library_id": lib})
    if not target:
        raise HTTPException(404, "Not found")
    others = await db.items.find({"library_id": lib, "status": "ready", "id": {"$ne": item_id}}).to_list(300)
    tkw = set(k.lower() for k in (target.get("keywords") or []))
    tcat = target.get("category")
    scored = []
    for o in others:
        score = 0.0
        okw = set(k.lower() for k in (o.get("keywords") or []))
        score += len(tkw & okw) * 2
        if tcat and o.get("category") == tcat:
            score += 2
        if o.get("content_type") == target.get("content_type"):
            score += 0.5
        if o.get("source_domain") and o.get("source_domain") == target.get("source_domain"):
            score += 1
        if score > 0:
            scored.append((score, o))
    scored.sort(key=lambda x: -x[0])
    return [clean(o) for _, o in scored[:4]]


@api_router.get("/items/{item_id}", response_model=SavedItem)
async def get_item(item_id: str, lib: str = Depends(resolve_library)):
    doc = await db.items.find_one({"id": item_id, "library_id": lib})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)


@api_router.put("/items/{item_id}", response_model=SavedItem)
async def update_item(item_id: str, payload: ItemUpdate, lib: str = Depends(resolve_library)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update:
        await db.items.update_one({"id": item_id, "library_id": lib}, {"$set": update})
    doc = await db.items.find_one({"id": item_id, "library_id": lib})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)


@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, lib: str = Depends(resolve_library)):
    doc = await db.items.find_one({"id": item_id, "library_id": lib})
    if not doc:
        raise HTTPException(404, "Not found")
    res = await db.items.delete_one({"id": item_id, "library_id": lib})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    if doc.get("image_path"):
        try:
            supabase.storage.from_(STORAGE_BUCKET).remove([doc["image_path"]])
        except Exception as e:
            logger.warning(f"Failed to delete storage object {doc['image_path']}: {e}")
    return {"ok": True}


@api_router.post("/items/{item_id}/pin", response_model=SavedItem)
async def pin_item(item_id: str, payload: PinIn, lib: str = Depends(resolve_library)):
    await db.items.update_one({"id": item_id, "library_id": lib}, {"$set": {"pinned": payload.pinned}})
    doc = await db.items.find_one({"id": item_id, "library_id": lib})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)


@api_router.post("/items/{item_id}/retry", response_model=SavedItem)
async def retry_item(item_id: str, background: BackgroundTasks, lib: str = Depends(resolve_library)):
    limiter.check(lib, 30, 60)
    doc = await db.items.find_one({"id": item_id, "library_id": lib})
    if not doc:
        raise HTTPException(404, "Not found")
    await db.items.update_one({"id": item_id, "library_id": lib}, {"$set": {"status": "processing"}})
    background.add_task(enrich_item, item_id)
    doc["status"] = "processing"
    return clean(doc)


@api_router.post("/items/{item_id}/ask")
async def ask_item(item_id: str, payload: AskIn, lib: str = Depends(resolve_library)):
    limiter.check(lib, 30, 60)
    doc = await db.items.find_one({"id": item_id, "library_id": lib})
    if not doc:
        raise HTTPException(404, "Not found")
    context = (
        f"Title: {doc.get('title')}\nCategory: {doc.get('category')}\nSummary: {doc.get('summary')}\n"
        f"Keywords: {', '.join(doc.get('keywords', []))}\n"
        f"Original text: {doc.get('original_text') or ''}\n"
        f"Extracted text: {doc.get('extracted_text') or ''}\n"
        f"Source URL: {doc.get('source_url') or 'none'}\n"
    )
    system = (
        "You are Forgot AI, a highly intelligent, friendly, and conversational personal assistant. "
        "The user is viewing a specific saved item (content below) and is chatting with you about it. "
        "RULES: "
        "1. If the user asks a general question, says hello, asks how you are, or wants to chat casually, respond naturally and warmly just like a human friend! Do NOT mention the saved item or say 'I don't have a memory for this'. "
        "2. If the user asks a question about the item, answer it using the content below. "
        "3. If the item lacks the info, politely let them know, but feel free to offer general knowledge or brainstorm with them if helpful.\n\n"
        "SAVED ITEM CONTENT:\n" + context
    )
    return StreamingResponse(
        llm_stream(system, payload.question), 
        media_type="application/octet-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )


@api_router.post("/search")
async def search(payload: SearchIn, lib: str = Depends(resolve_library)):
    limiter.check(lib, 30, 60)
    q = payload.query.strip()
    if not q:
        return {"results": []}
    results, _ = await retrieve(q, lib)
    return {"results": results, "query": q}


@api_router.post("/chat")
async def chat(payload: ChatIn, lib: str = Depends(resolve_library)):
    limiter.check(lib, 30, 60)
    q = payload.query.strip()
    if not q:
        return {"answer": "Ask me anything about what you've saved, or just say hi!", "results": []}
    
    results, by_id = await retrieve(q, lib, limit=8)
    
    ctx_parts = []
    if results:
        for r in results:
            ctx_parts.append(f"Title: {r.get('title')}\nURL: {r.get('source_url')}\nSummary: {r.get('summary')}\nKeywords: {', '.join(r.get('keywords', []))}\nText: {r.get('extracted_text') or r.get('original_text') or ''}")
        memory_context = "SAVED MEMORIES:\n" + "\n\n---\n\n".join(ctx_parts)
    else:
        memory_context = "SAVED MEMORIES:\n(Empty - no relevant memories found)"

    system = (
        "You are Forgot AI, a highly intelligent, friendly, and conversational personal assistant. "
        "CRITICAL RULES:\n"
        "- Be friendly and helpful.\n"
        "- If the user is asking about THEIR saved items or notes, use ONLY the SAVED MEMORIES below. "
        "If none match or the memories are empty, say you couldn't find it — do NOT invent or hallucinate saves.\n"
        "- If they're asking general questions, how-to, or chitchat, answer normally without needing memories.\n"
        "- If the user asks for both, do both: answer the memory part from data, the rest normally.\n\n"
        + memory_context
    )
    
    async def _safe_llm_stream():
        try:
            async for chunk in llm_stream(system, q):
                yield chunk
        except Exception as e:
            logger.error(f"LLM stream failed: {e}")
            yield b" (Sorry, I'm having trouble connecting to my brain right now, but here are your search results!)"

    if payload.stream:
        return StreamingResponse(
            _safe_llm_stream(),
            media_type="application/octet-stream",
            headers={
                "X-Accel-Buffering": "no",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        )
        
    # Non-streaming with retry
    for attempt in range(2):
        try:
            answer = await llm_text(system, q)
            break
        except Exception as e:
            logger.error(f"LLM text failed (attempt {attempt+1}): {e}")
            if attempt == 1:
                answer = "Sorry, I couldn't process that right now, but I've attached your relevant search results below if any were found!"
    
    return {"answer": answer, "results": results, "query": q}


@api_router.get("/files/{path:path}")
async def download_file(path: str, request: Request, token: Optional[str] = Query(None)):
    tok = token or _bearer(request)
    if not tok:
        raise HTTPException(401, "Not authenticated")
    u = await _user_from_token(tok)
    if not u:
        raise HTTPException(401, "Invalid or expired session")
    doc = await db.items.find_one({"image_path": path, "library_id": u["id"]})
    if not doc:
        raise HTTPException(404, "File not found")
    data, content_type = await get_object(path)
    return Response(content=data, media_type=content_type)


# ---------------- Health check ----------------
@app.get("/")
async def root():
    return {"status": "ok", "service": "Forgot AI API", "message": "Backend is running!"}


# ---------------- App wiring ----------------
app.include_router(api_router)

default_origins = 'http://localhost:3000,https://forgot-ai.vercel.app'
raw_origins = os.environ.get('CORS_ORIGINS', default_origins).split(',')
origins = [o.strip().strip("'").strip('"') for o in raw_origins if o.strip()]
allow_all = "*" in origins
app.add_middleware(
    CORSMiddleware,
    allow_credentials=not allow_all,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    logger.info("Supabase database and storage configured")
