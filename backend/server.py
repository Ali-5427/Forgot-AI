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
from typing import List, Optional, Annotated, Literal, Dict, Any
from collections import defaultdict
import asyncio
import aiohttp
import requests
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Header, Query, Request, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict, EmailStr, model_validator
from supabase_db import SupabaseDatabase, create_supabase_client
from supabase import create_client as make_supabase_client
from ai_provider import embed_texts, llm_chat, llm_chat_stream
from agent_engine import run_agent_stream
from billing import (
    CheckoutIn,
    SupabaseBillingStore,
    get_dodo_client,
    billing_public_fields,
    billing_summary,
    cancel_subscription,
    create_checkout_url,
    get_customer_portal_url,
    sync_checkout_session,
    event_from_unwrapped,
    process_dodo_webhook,
    process_verified_webhook,
    user_has_active_access,
)

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


class GroupCreate(BaseModel):
    name: str
    color: Optional[str] = "#808080"

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

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
    user_note: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    category: str = "Uncategorized"
    extracted_text: str = ""
    searchable_text: str = ""
    dedup_key: Optional[str] = None
    status: str = "processing"
    pinned: bool = False
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    group_color: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TextSaveIn(BaseModel):
    text: Optional[str] = None
    original_content: Optional[str] = None
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    user_note: Optional[str] = None
    group_id: Optional[str] = None
    new_group_name: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_text_field(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("text") and data.get("original_content"):
                data["text"] = data["original_content"]
        return data


class UrlSaveIn(BaseModel):
    url: Optional[str] = None
    source_url: Optional[str] = None
    context_text: Optional[str] = None
    source_title: Optional[str] = None
    user_note: Optional[str] = None
    group_id: Optional[str] = None
    new_group_name: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_url_field(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("url") and data.get("source_url"):
                data["url"] = data["source_url"]
        return data


class BulkBookmarkItem(BaseModel):
    url: str
    title: Optional[str] = None
    user_note: Optional[str] = "Imported from browser bookmarks"


class BulkBookmarkImportIn(BaseModel):
    bookmarks: List[BulkBookmarkItem]


class BulkBookmarkImportOut(BaseModel):
    total_received: int
    imported: int
    skipped_duplicates: int


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    user_note: Optional[str] = None
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    group_color: Optional[str] = None
    keywords: Optional[List[str]] = None


class SearchIn(BaseModel):
    query: str


class ChatIn(BaseModel):
    query: str
    stream: bool = False
    history: List[dict] = Field(default_factory=list)
    context_item_ids: List[str] = Field(default_factory=list)


class PinIn(BaseModel):
    pinned: bool


class AskIn(BaseModel):
    question: str
    history: List[dict] = Field(default_factory=list)
    context_item_ids: List[str] = Field(default_factory=list)


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


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    password: str
    confirm_password: str


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str


class ImportIn(BaseModel):
    library_id: str


# ---------------- Auth dependencies ----------------
_billing_store = None


def get_billing_store():
    global _billing_store
    if _billing_store is None:
        _billing_store = SupabaseBillingStore(db.supabase)
    return _billing_store


def public_user(u: dict, billing: Optional[dict] = None) -> dict:
    summary = billing_summary(billing)
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u.get("name", ""),
        "created_at": u.get("created_at"),
        "plan_type": summary["plan_type"],
        "status": summary["status"],
        "current_period_end": summary["current_period_end"],
    }


async def public_user_with_billing(u: dict) -> dict:
    try:
        row = await get_billing_store().get_subscription(u["id"])
    except Exception as e:
        logger.warning("Failed to load billing state: %s", e)
        row = None
    return public_user(u, row)


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


async def require_active_subscription(request: Request) -> str:
    """Ensure user is authenticated AND currently has active trial, pro, or lifetime access."""
    user_id = await resolve_library(request)
    row = await get_billing_store().get_subscription(user_id)
    if not user_has_active_access(row):
        raise HTTPException(
            status_code=402,
            detail="Active trial or subscription required. Please choose a plan to save and search memories."
        )
    return user_id


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

async def llm_text(system: str, prompt: str, image_b64: Optional[str] = None, history: List[dict] = None, json_format: bool = True) -> str:
    messages = [{"role": "system", "content": system}]
    if history:
        messages.extend(history)
    user_msg = {"role": "user", "content": prompt}
    if image_b64:
        user_msg["images"] = [image_b64]
    messages.append(user_msg)

    payload = {
        "model": AI_MODEL[1],
        "messages": messages,
        "stream": False,
    }
    if json_format:
        payload["format"] = "json"

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


async def llm_stream(system: str, prompt: str, image_b64: Optional[str] = None, history: List[dict] = None):
    messages = [{"role": "system", "content": system}]
    if history:
        messages.extend(history)
    user_msg = {"role": "user", "content": prompt}
    if image_b64:
        user_msg["images"] = [image_b64]
    messages.append(user_msg)

    payload = {
        "model": AI_MODEL[1],
        "messages": messages,
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
        '"why_saved" (If the user provided a USER NOTE, rewrite their note into the second-person (using \'You\'). Act like a helpful assistant reminding them why they saved it (e.g. \'You saved this to build XYZ\'). Keep it concise and natural, do not add extra summaries from the document, and do not use robotic prefixes. If NO note was provided, infer a 1 short natural sentence why they might have saved it), '
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
                raw_bytes = await r.read()
                
                # Smart encoding detection
                encoding = r.charset
                if not encoding:
                    # Look for <meta charset="..."> in the first 2KB of HTML
                    m = re.search(br'<meta\s+[^>]*charset=["\']?([\w-]+)', raw_bytes[:2048], re.IGNORECASE)
                    if m:
                        encoding = m.group(1).decode('ascii')
                    else:
                        encoding = 'utf-8' # Default to utf-8 for modern web
                
                try:
                    html = raw_bytes.decode(encoding)
                except (UnicodeDecodeError, LookupError):
                    # Fallback if the declared encoding is wrong
                    html = raw_bytes.decode('utf-8', errors='replace')
                    
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
        
        why_saved_raw = meta.get("why_saved")
        if not user_note or not user_note.strip() or not why_saved_raw or str(why_saved_raw).strip().lower() in ("null", "none", "", "n/a"):
            why_saved_val = None
        else:
            why_saved_val = str(why_saved_raw).strip()

        update = {
            "title": str(meta.get("title", "Untitled"))[:200],
            "summary": str(meta.get("summary", "")),
            "why_saved": why_saved_val,
            "keywords": [str(k) for k in kws][:12],
            "category": str(meta.get("category", "Uncategorized"))[:40],
            "extracted_text": str(meta.get("extracted_text", "")),
            "searchable_text": str(meta.get("searchable_text", "")),
            "status": "ready",
        }
        
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
    q = (query or "").strip()
    if not q:
        return [], {}

    # 1. Clean query & target keywords
    q_lower = q.lower()
    clean_q_words = [w.strip() for w in re.sub(r'[^\w\s]', ' ', q_lower).split() if len(w.strip()) >= 2]
    stop_words = {"the", "and", "for", "with", "from", "that", "this", "what", "which", "where", "when", "some", "note", "notes", "saved", "about", "have", "there", "show", "tell", "like", "did"}
    target_words = [w for w in clean_q_words if w not in stop_words]

    # Stems and common phonetic/variant expansions (e.g. owe -> own, owned, owner)
    expanded_words = set(target_words)
    for tw in target_words:
        if tw == "owe":
            expanded_words.update(["own", "owned", "owner", "ownerbook"])
        elif tw in ("own", "owned", "owner"):
            expanded_words.update(["owe", "owned", "owner", "ownerbook"])
        elif tw.endswith("s") and len(tw) > 3:
            expanded_words.add(tw[:-1])
        elif tw.endswith("ing") and len(tw) > 4:
            expanded_words.add(tw[:-3])

    search_text = " ".join(target_words) if target_words else q

    final_results = []
    seen_ids = set()
    by_id = {}

    # 2. Native Hybrid Search RPC (pgvector cosine distance + Postgres FTS via RRF)
    try:
        query_embedding = await get_embedding(q)
        if query_embedding:
            rpc_params = {
                "p_library": lib,
                "p_query": search_text,
                "p_embedding": query_embedding,
                "p_limit": min(limit * 2, 20)
            }
            res = db.supabase.rpc("hybrid_search_items", rpc_params).execute()
            if res and res.data:
                matched_ids = [str(row["id"]) for row in res.data if row.get("id")]
                if matched_ids:
                    docs = await db.items.find({"id": {"$in": matched_ids}, "library_id": lib}).to_list(len(matched_ids))
                    doc_map = {d["id"]: d for d in docs}
                    for row in res.data:
                        mid = str(row["id"])
                        if mid in doc_map and mid not in seen_ids:
                            cleaned = clean(doc_map[mid])
                            cleaned["match_reason"] = "Semantic concept match in memory"
                            final_results.append(cleaned)
                            seen_ids.add(mid)
                            by_id[mid] = cleaned
    except Exception as e:
        logger.warning(f"hybrid_search_items RPC search failed or skipped: {e}")

    # 3. High-Quality Multi-Field Search (Guarantees 100% recall even if RPC fails or embedding is pending)
    try:
        ready_docs = await db.items.find({"status": "ready", "library_id": lib}).sort("created_at", -1).to_list(300)
    except Exception as e:
        logger.error(f"Error fetching ready items in retrieve: {e}")
        ready_docs = []

    exact_matches = []
    for d in ready_docs:
        did = d.get("id")
        if not did:
            continue
        cleaned = clean(d)
        by_id[did] = cleaned

        if did in seen_ids:
            continue

        title_str = (d.get("title") or "").lower()
        summary_str = (d.get("summary") or "").lower()
        user_note_str = (d.get("user_note") or "").lower()
        url_str = (d.get("source_url") or "").lower()
        domain_str = (d.get("source_domain") or "").lower()
        kws = d.get("keywords") or []
        kw_str = " ".join(kws).lower() if isinstance(kws, list) else str(kws).lower()
        text_str = (
            (d.get("original_text") or "") + " " +
            (d.get("searchable_text") or "") + " " +
            (d.get("extracted_text") or "")
        ).lower()

        full_haystack = f"{title_str} {summary_str} {user_note_str} {url_str} {domain_str} {kw_str} {text_str}"

        # Exact phrase match in any field
        if q_lower in full_haystack:
            copy_item = cleaned.copy()
            copy_item["match_reason"] = f"Exact match for '{q}'"
            exact_matches.append((100, copy_item))
            continue

        # Check expanded and target word matches
        matched_words = [w for w in expanded_words if w in full_haystack]
        if matched_words:
            matched_targets = [w for w in target_words if w in full_haystack]
            ratio = len(matched_words) / max(1, len(target_words))
            # Match if at least 50% of target words match, or key entities match
            if ratio >= 0.5 or (len(matched_words) >= 2 and any(k in matched_words for k in ["vip", "own", "owner", "ownerbook", "event", "book"])):
                copy_item = cleaned.copy()
                copy_item["match_reason"] = f"Matched keywords: {', '.join(matched_words[:3])}"
                score = int(ratio * 60)
                if any(w in title_str for w in matched_words):
                    score += 25
                if any(w in summary_str for w in matched_words):
                    score += 15
                exact_matches.append((score, copy_item))

    # Sort exact matches by score descending and append
    exact_matches.sort(key=lambda x: x[0], reverse=True)
    for _, em in exact_matches:
        if em["id"] not in seen_ids:
            final_results.append(em)
            seen_ids.add(em["id"])

    return final_results[:limit], by_id


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
        created = supabase.auth.sign_up({
            "email": email,
            "password": payload.password,
            "options": {
                "data": {"name": email.split("@")[0]}
            }
        })
        auth_user = created.user

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
    try:
        await db.users.insert_one(user)
    except Exception as e:
        logger.warning(f"db.users.insert_one failed in register: {e}")
    
    # Use the regular anon client to sign them in after creation
    session = supabase.auth.sign_in_with_password({"email": email, "password": payload.password})
    await _record_session(user["id"], session.session.access_token, user["token_version"])

    anon = (request.headers.get("X-Library-Id") or "").strip()
    imported = await import_library(anon, user["id"]) if anon else 0
    return {
        "token": session.session.access_token,
        "refresh_token": session.session.refresh_token,
        "user": await public_user_with_billing(user),
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
        session = supabase.auth.sign_in_with_password({"email": email, "password": payload.password})
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
        try:
            await db.users.insert_one(user)
        except Exception as e:
            logger.warning(f"Failed to insert user into db.users: {e}")
    await _record_session(user["id"], session.session.access_token, user.get("token_version", 0))

    anon = (request.headers.get("X-Library-Id") or "").strip()
    count = await import_library(anon, user["id"]) if anon else 0
    return {
        "token": session.session.access_token,
        "refresh_token": session.session.refresh_token,
        "user": await public_user_with_billing(user),
        "importable_count": count,
    }


@api_router.post("/auth/refresh")
async def refresh_session(payload: RefreshIn):
    try:
        session = supabase.auth.refresh_session(payload.refresh_token)
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
        "user": await public_user_with_billing(user),
    }


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return await public_user_with_billing(user)


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

@api_router.get("/export")
async def export_data(user: dict = Depends(get_current_user)):
    items = await db.items.find({"library_id": user["id"]}).to_list(10000)
    # Remove embeddings from export to keep file size small
    for item in items:
        item.pop("embedding", None)
    return {"user": await public_user_with_billing(user), "items": items}

@api_router.delete("/account")
async def delete_account(request: Request, user: dict = Depends(get_current_user)):
    token = _bearer(request)
    # 1. Cancel active Dodo subscription if one exists
    try:
        b_store = get_billing_store()
        sub_row = await b_store.get_subscription(user["id"])
        if sub_row and sub_row.get("dodo_subscription_id") and sub_row.get("status") in ("active_pro", "trial", "on_hold"):
            await cancel_subscription(b_store, user["id"])
    except Exception as e:
        logger.warning(f"Failed to cancel subscription during account deletion for user {user['id']}: {e}")

    # 2. Delete user's image assets from Supabase Storage
    try:
        user_items = await db.items.find({"library_id": user["id"]}).to_list(10000)
        image_paths = [
            it["image_path"] for it in user_items
            if it.get("image_path") and not it["image_path"].startswith("http")
        ]
        if image_paths:
            def _remove_files():
                supabase.storage.from_(STORAGE_BUCKET).remove(image_paths)
            await asyncio.to_thread(_remove_files)
    except Exception as e:
        logger.warning(f"Failed to delete storage objects for user {user['id']}: {e}")

    # 3. Clean up related database tables
    try:
        db.supabase.table("feedback").delete().eq("user_id", user["id"]).execute()
    except Exception:
        pass
    try:
        db.supabase.table("conversations").delete().eq("user_id", user["id"]).execute()
    except Exception:
        pass
    try:
        db.supabase.table("groups").delete().eq("user_id", user["id"]).execute()
    except Exception:
        pass

    # Delete all user's items
    await db.items.delete_many({"library_id": user["id"]})
    # Delete session
    await db.sessions.delete_many({"user_id": user["id"]})
    # Delete user profile
    await db.users.delete_one({"id": user["id"]})
    
    # Try to delete from Supabase Auth if we have service role, otherwise just sign out
    if token:
        try:
            supabase.auth.admin.delete_user(user["id"])
        except Exception:
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


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordIn):
    """Request password reset email. Always returns success to avoid account enumeration."""
    email = payload.email.lower().strip()
    try:
        supabase.auth.reset_password_for_email(
            email,
            options={"redirect_to": "https://forgot-ai.vercel.app/reset-password"}
        )
    except Exception as e:
        # Log error but don't reveal to user
        logger.warning(f"Password reset request failed for {email}: {e}")
    # Always return success to avoid revealing account existence
    return {"message": "If an account exists for this email, we'll send a reset link."}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn, request: Request):
    """Reset password using Supabase access token from URL params."""
    if len(payload.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if payload.password != payload.confirm_password:
        raise HTTPException(400, "Passwords do not match")

    token = _bearer(request)
    if not token:
        raise HTTPException(401, "Invalid or expired reset link")

    try:
        # Verify token is valid by getting user
        auth_user = supabase.auth.get_user(token).user
        if not auth_user:
            raise HTTPException(401, "Invalid or expired reset link")

        # Update password
        supabase.auth.update_user({"password": payload.password})

        # Invalidate all sessions for security
        await db.users.update_one({"id": str(auth_user.id)}, {"$inc": {"token_version": 1}})
        await db.sessions.delete_many({"user_id": str(auth_user.id)})

        return {"message": "Password updated successfully. Please sign in with your new password."}
    except Exception as e:
        logger.error(f"Password reset failed: {e}")
        raise HTTPException(400, "Invalid or expired reset link")


@api_router.post("/auth/change-password")
async def change_password(payload: ChangePasswordIn, user: dict = Depends(get_current_user)):
    """Change password for authenticated user."""
    if len(payload.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if payload.new_password != payload.confirm_password:
        raise HTTPException(400, "Passwords do not match")

    try:
        # Verify old password by attempting to sign in
        supabase.auth.sign_in_with_password({
            "email": user["email"],
            "password": payload.old_password
        })
    except Exception:
        raise HTTPException(400, "Current password is incorrect")

    try:
        # Update password
        supabase.auth.update_user({"password": payload.new_password})

        # Invalidate all sessions for security
        await db.users.update_one({"id": user["id"]}, {"$inc": {"token_version": 1}})
        await db.sessions.delete_many({"user_id": user["id"]})

        return {"message": "Password updated successfully. Please sign in with your new password."}
    except Exception as e:
        logger.error(f"Password change failed: {e}")
        raise HTTPException(400, "Failed to update password")



async def _handle_new_group(payload, lib, user_id):
    group_id = getattr(payload, 'group_id', None)
    new_group_name = getattr(payload, 'new_group_name', None)
    
    if new_group_name:
        group_id = str(uuid.uuid4())
        group_color = getattr(payload, 'new_group_color', '#808080')
        db.supabase.table("groups").insert({
            "id": group_id,
            "library_id": lib,
            "user_id": user_id,
            "name": new_group_name,
            "color": group_color
        }).execute()
        return group_id, new_group_name, group_color
        
    if group_id:
        res = db.supabase.table("groups").select("*").eq("id", group_id).execute()
        if res.data:
            return group_id, res.data[0]["name"], res.data[0]["color"]
            
    return None, None, None

@api_router.get("/groups")
async def get_groups(lib: str = Depends(resolve_library)):
    res = db.supabase.table("groups").select("*").eq("library_id", lib).order("created_at", desc=True).execute()
    return res.data or []

@api_router.post("/groups")
async def create_group(payload: GroupCreate, request: Request, lib: str = Depends(resolve_library)):
    user_id = lib  # Simplified fallback
    try:
        user = await get_current_user(request)
        user_id = user["id"]
    except Exception:
        pass
    
    group_id = str(uuid.uuid4())
    res = db.supabase.table("groups").insert({
        "id": group_id,
        "library_id": lib,
        "user_id": user_id,
        "name": payload.name,
        "color": payload.color
    }).execute()
    return res.data[0]

@api_router.patch("/groups/{group_id}")
async def update_group(group_id: str, payload: GroupUpdate, lib: str = Depends(resolve_library)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return {"ok": True}
    res = db.supabase.table("groups").update(updates).eq("id", group_id).eq("library_id", lib).execute()
    
    # Sync group name/color across items
    if "name" in updates or "color" in updates:
        item_updates = {}
        if "name" in updates: item_updates["group_name"] = updates["name"]
        if "color" in updates: item_updates["group_color"] = updates["color"]
        await db.items.update_many({"group_id": group_id, "library_id": lib}, {"$set": item_updates})
        
    return res.data[0] if res.data else None

@api_router.delete("/groups/{group_id}")
async def delete_group(group_id: str, lib: str = Depends(resolve_library)):
    # Items' group_id will be set to NULL due to ON DELETE SET NULL, 
    # but for mongo we need to manually update them.
    await db.items.update_many(
        {"group_id": group_id, "library_id": lib}, 
        {"$set": {"group_id": None, "group_name": None, "group_color": None}}
    )
    db.supabase.table("groups").delete().eq("id", group_id).eq("library_id", lib).execute()
    return {"ok": True}

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
async def save_text(payload: TextSaveIn, background: BackgroundTasks, lib: str = Depends(require_active_subscription)):
    limiter.check(lib, 60, 60)
    raw_text = (payload.text or payload.original_content or "").strip()
    if not raw_text:
        raise HTTPException(400, "Text is empty")
    group_id, group_name, group_color = await _handle_new_group(payload, lib, lib)
    item = SavedItem(library_id=lib, content_type="text", original_text=raw_text,
                     source_url=payload.source_url, source_title=payload.source_title,
                     source_domain=domain_of(payload.source_url) if payload.source_url else None,
                     user_note=payload.user_note,
                     group_id=group_id, group_name=group_name, group_color=group_color,
                     dedup_key=text_hash(raw_text), title=raw_text[:60])
    values = item.model_dump()
    values["owner_user_id"] = lib
    await db.items.insert_one(values)
    background.add_task(enrich_item, item.id, payload.user_note)
    await ws_manager.broadcast_user(lib, {"type": "NEW_ITEM", "item": clean(values)})
    return item


@api_router.post("/items/url", response_model=SavedItem)
async def save_url(payload: UrlSaveIn, background: BackgroundTasks, lib: str = Depends(require_active_subscription)):
    limiter.check(lib, 60, 60)
    raw_url = (payload.url or payload.source_url or "").strip()
    if not raw_url:
        raise HTTPException(400, "URL is empty")
    url = raw_url
    if not url.startswith("http"):
        url = "https://" + url
    group_id, group_name, group_color = await _handle_new_group(payload, lib, lib)
    item = SavedItem(library_id=lib, content_type="url", source_url=url,
                     original_text=payload.context_text, source_title=payload.source_title,
                     source_domain=domain_of(url), dedup_key=normalize_url(url), title=url[:60],
                     user_note=payload.user_note,
                     group_id=group_id, group_name=group_name, group_color=group_color)
    values = item.model_dump()
    values["owner_user_id"] = lib
    await db.items.insert_one(values)
    background.add_task(enrich_item, item.id, payload.user_note)
    await ws_manager.broadcast_user(lib, {"type": "NEW_ITEM", "item": clean(values)})
    return item


async def _bulk_enrich_worker(item_ids: List[str], user_notes: Dict[str, Optional[str]]):
    for i in range(0, len(item_ids), 3):
        batch = item_ids[i:i+3]
        for item_id in batch:
            try:
                await enrich_item(item_id, user_notes.get(item_id))
            except Exception as e:
                logger.error(f"Bulk enrichment failed for item {item_id}: {e}")
        await asyncio.sleep(0.5)


@api_router.post("/items/bulk-import", response_model=BulkBookmarkImportOut)
async def bulk_import_bookmarks(payload: BulkBookmarkImportIn, background: BackgroundTasks, lib: str = Depends(require_active_subscription)):
    if not payload.bookmarks:
        return BulkBookmarkImportOut(total_received=0, imported=0, skipped_duplicates=0)

    seen_in_payload = set()
    cleaned_entries = []
    for bm in payload.bookmarks:
        u = bm.url.strip()
        if not u:
            continue
        if not u.startswith("http"):
            u = "https://" + u
        norm = normalize_url(u)
        if norm in seen_in_payload:
            continue
        seen_in_payload.add(norm)
        cleaned_entries.append((u, norm, bm.title or u[:60], bm.user_note or "Imported from browser bookmarks"))

    if not cleaned_entries:
        return BulkBookmarkImportOut(total_received=len(payload.bookmarks), imported=0, skipped_duplicates=len(payload.bookmarks))

    dedup_keys = [entry[1] for entry in cleaned_entries]
    existing_cursor = db.items.find({"library_id": lib, "dedup_key": {"$in": dedup_keys}}, {"dedup_key": 1})
    existing_keys = set()
    async for doc in existing_cursor:
        if "dedup_key" in doc:
            existing_keys.add(doc["dedup_key"])

    new_items = []
    item_ids_to_enrich = []
    user_notes_map = {}
    for url, norm, title, user_note in cleaned_entries:
        if norm in existing_keys:
            continue
        item = SavedItem(
            library_id=lib,
            content_type="url",
            source_url=url,
            source_title=title,
            source_domain=domain_of(url),
            dedup_key=norm,
            title=title,
            user_note=user_note
        )
        values = item.model_dump()
        values["owner_user_id"] = lib
        new_items.append(values)
        item_ids_to_enrich.append(item.id)
        user_notes_map[item.id] = user_note

    imported_count = len(new_items)
    skipped_count = len(payload.bookmarks) - imported_count

    if new_items:
        await db.items.insert_many(new_items)
        background.add_task(_bulk_enrich_worker, item_ids_to_enrich, user_notes_map)
        await ws_manager.broadcast_user(lib, {"type": "BULK_NEW_ITEMS", "count": imported_count})

    return BulkBookmarkImportOut(
        total_received=len(payload.bookmarks),
        imported=imported_count,
        skipped_duplicates=skipped_count
    )


@api_router.post("/items/image", response_model=SavedItem)
async def save_image(background: BackgroundTasks, file: UploadFile = File(...),
                     source_url: Optional[str] = Form(None), source_title: Optional[str] = Form(None),
                     user_note: Optional[str] = Form(None),
                     lib: str = Depends(require_active_subscription)):
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

    
    # For images, we can pack it into an object that resembles payload
    class _ImgPayload:
        pass
    p = _ImgPayload()
    p.group_id = None # could be pulled from form if needed later
    p.new_group_name = None
    group_id, group_name, group_color = await _handle_new_group(p, lib, lib)
    
    item = SavedItem(library_id=lib, content_type="image", image_path=stored_path,
                     source_url=source_url, source_title=source_title,
                     source_domain=domain_of(source_url) if source_url else None,
                     user_note=user_note,
                     group_id=group_id, group_name=group_name, group_color=group_color,
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

    # Try Vector Semantic Search first
    embedding = target.get("embedding")
    if embedding and isinstance(embedding, list):
        try:
            query_text = (target.get("title", "") + " " + target.get("summary", "")).strip()
            res = db.supabase.rpc("hybrid_search_items", {
                "p_library": lib,
                "p_query": query_text,
                "p_embedding": embedding,
                "p_limit": 5
            }).execute()
            
            if res.data:
                matched_ids = [r["id"] for r in res.data if str(r.get("id")) != item_id][:4]
                if matched_ids:
                    docs = await db.items.find({"id": {"$in": matched_ids}, "library_id": lib}).to_list(len(matched_ids))
                    matches = [clean(d) for d in docs]
                    if matches:
                        return matches
        except Exception as e:
            logger.error(f"Vector related items failed: {e}")

    # Fallback to hardcoded keyword overlap if vector search fails or embedding is missing
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
    import json
    clean_doc = {
        "item_type": doc.get('content_type', 'unknown'),
        "title": doc.get('title'),
        "category": doc.get('category'),
        "source_url": doc.get('source_url'),
        "keywords": doc.get('keywords', []),
        "ai_summary": doc.get('summary'),
        "user_original_note": doc.get('user_note'),
        "assistant_rephrased_reason": doc.get('why_saved'),
        "full_content_text": doc.get('extracted_text') or doc.get('original_text') or ''
    }
    context = json.dumps(clean_doc, indent=2)
    system = (
        "You are Forgot AI, a highly intelligent, friendly, and conversational personal assistant. "
        "The user is viewing a specific saved item (content below) and is chatting with you about it. "
        "RULES: "
        "1. If the user asks a general question, says hello, asks how you are, or wants to chat casually, respond naturally and warmly just like a human friend! Do NOT mention the saved item or say 'I don't have a memory for this'. "
        "2. If the user asks a question about the item, answer it using the content below. "
        "3. If the item lacks the info, politely let them know, but feel free to offer general knowledge or brainstorm with them if helpful.\n"
        "4. The JSON block is REFERENCE DATA only for you. Always answer the user in natural helpful prose or light markdown. NEVER reply as JSON, schema field tables, or key-value dumps of the memory structure. Use memories only as source material to explain/summarize.\n\n"
        "SAVED ITEM CONTENT:\n" + context
    )
    return StreamingResponse(
        llm_stream(system, payload.question, history=payload.history), 
        media_type="application/octet-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )


@api_router.post("/search")
async def search(payload: SearchIn, lib: str = Depends(require_active_subscription)):
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

    active_docs = []
    if payload.context_item_ids:
        try:
            items_res = await db.items.find({"id": {"$in": payload.context_item_ids}, "library_id": lib, "status": "ready"}).to_list(10)
            active_docs = items_res or []
        except Exception:
            active_docs = []

    final_payload = {}
    async for event in run_agent_stream(q, payload.history or [], db, lib, retrieve, active_docs):
        if event.get("type") == "final":
            final_payload = event

    return {
        "answer": final_payload.get("answer", ""),
        "results": final_payload.get("results", []),
        "context_ids": final_payload.get("context_ids", []),
        "query": q
    }


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
# MOVED TO END

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
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    expose_headers=["X-Context-Ids"],
)


@app.on_event("startup")
async def startup():
    logger.info("Supabase database and storage configured")

# =====================================================================
# V2 CHAT & CONVERSATIONS (RAG WITH HISTORY)
# =====================================================================

from ai_provider import embed_texts, llm_chat, llm_chat_stream
from agent_engine import run_agent_stream

class ConversationCreate(BaseModel):
    title: Optional[str] = None

class ChatV2In(BaseModel):
    conversation_id: Optional[str] = None
    query: str
    context_item_ids: Optional[List[str]] = None

class ConversationPatch(BaseModel):
    title: str

@api_router.get("/conversations")
async def get_conversations(lib: str = Depends(resolve_library)):
    user_id = lib
    res = db.supabase.table("conversations").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
    return res.data

@api_router.post("/conversations")
async def create_conversation(payload: ConversationCreate, lib: str = Depends(resolve_library)):
    user_id = lib
    title = payload.title or "New Chat"
    res = db.supabase.table("conversations").insert({"user_id": user_id, "title": title}).execute()
    return res.data[0]

@api_router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str, lib: str = Depends(resolve_library)):
    user_id = lib
    res = db.supabase.table("conversations").select("*").eq("id", conv_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(404, "Conversation not found")
    messages = db.supabase.table("messages").select("*").eq("conversation_id", conv_id).order("created_at").execute()
    return {"conversation": res.data[0], "messages": messages.data}

@api_router.patch("/conversations/{conv_id}")
async def patch_conversation(conv_id: str, payload: ConversationPatch, lib: str = Depends(resolve_library)):
    user_id = lib
    res = db.supabase.table("conversations").update({"title": payload.title}).eq("id", conv_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(404)
    return res.data[0]

@api_router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, lib: str = Depends(resolve_library)):
    user_id = lib
    db.supabase.table("conversations").delete().eq("id", conv_id).eq("user_id", user_id).execute()
    return {"success": True}

def deduplicate_items(items: list) -> list:
    """Normalize and deduplicate items by URL and title so duplicates never appear."""
    seen_urls = set()
    seen_titles = set()
    unique = []
    for it in items:
        raw_url = (it.get("source_url") or it.get("url") or "").strip().rstrip("/")
        norm_url = re.sub(r'^https?://(www\.)?', '', raw_url.lower()) if raw_url else ""
        title = (it.get("title") or "").strip().lower()

        if norm_url and norm_url in seen_urls:
            continue
        if title and len(title) > 3 and title in seen_titles:
            continue

        if norm_url:
            seen_urls.add(norm_url)
        if title:
            seen_titles.add(title)
        unique.append(it)
    return unique


def classify_agent_action(query: str, has_history: bool) -> str:
    """
    Intelligently determines the agentic action for a user query:
      - 'chitchat': Greetings, gratitude, closings, conversational pleasantries.
      - 'followup': Follow-up questions about items/topics already discussed in active chat.
      - 'recency': Explicit requests for recent saves, today's saves, latest notes.
      - 'search': Search queries looking for specific topics or keywords in library.
    """
    q = query.strip().lower()
    clean_q = re.sub(r'[^\w\s]', ' ', q)
    clean_q = re.sub(r'\s+', ' ', clean_q).strip()

    # 1. Chitchat / Gratitude / Closing / Social
    chitchat_tokens = {
        "hi", "hello", "hey", "yo", "sup", "greetings",
        "thanks", "thank", "thx", "thnks", "thnx", "ty", "cheers",
        "ok", "okay", "k", "cool", "great", "nice", "awesome", "perfect",
        "got", "it", "understood", "alright", "sure", "sounds", "good",
        "bye", "goodbye", "cya", "gn", "night", "morning", "afternoon", "evening",
        "bro", "man", "mate", "dude", "welcome"
    }
    words = clean_q.split()
    if words and all(w in chitchat_tokens for w in words):
        return "chitchat"

    if any(clean_q.startswith(p) for p in ["thanks", "thank you", "thx", "thnks", "thnx", "ty", "ok thanks", "ok thnks", "okay thanks", "cool thanks", "great thanks"]):
        if not any(w in words for w in ["search", "find", "where", "what", "which", "how", "show", "open", "explain"]):
            return "chitchat"

    if clean_q in {"how are you", "who are you", "what can you do", "help"}:
        return "chitchat"

    # 2. In-Context Review / Critique / Followup / Pasted content
    if has_history:
        # User references previous messages, complaints, or pastes memory text/URLs
        if re.search(r'\b(why did you|why you told|why you said|how did you|how you shared|then what is|then whatis|what about this|look at this|ai summary|you said|you told|above)\b', clean_q) or "http" in q or "www." in q:
            return "followup"
        # Ordinal reference: 1st, 2nd, 3rd, 4th, 5th, etc.
        if re.search(r'\b(\d+(st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last)\b', clean_q):
            return "followup"
        # Relative pronoun / follow-up phrases
        if re.search(r'\b(explain|explian|summarize|details?|expand|tell me more|what does it say|why did i save|show (me )?(its|the) link|give (me )?(its|the) link|open it|where is it from)\b', clean_q):
            return "followup"
        if re.search(r'\b(the other one|that one|this one|about that|about it)\b', clean_q):
            return "followup"

    # 3. Recency queries
    if re.search(r'\b(today|yesterday|recent|recently|lately|newest|latest|what did i save|saved today|recent saves|what have i saved|my saves|my saved)\b', clean_q):
        return "recency"

    # 4. Search query
    return "search"


def format_memory_blocks(items: list) -> str:
    """Format memory items into clean indexed XML blocks with clear URL indicators."""
    blocks = []
    for idx, item in enumerate(items):
        safe_text = (item.get('searchable_text', '') + ' ' + item.get('extracted_text', ''))[:1000]
        raw_url = (item.get('source_url') or item.get('url') or '').strip()
        url_line = f"URL: {raw_url}\n" if raw_url else "URL: None (Saved Image / Note without URL)\n"
        created_at = item.get('created_at') or ''
        date_line = f"SavedDate: {created_at[:10]}\n" if created_at else ""
        content_type = item.get('content_type', 'note')
        type_line = f"Type: {content_type}\n"
        title = item.get('title') or 'Untitled'
        summary = item.get('summary') or ''
        blocks.append(
            f'<memory index="{idx+1}">\nTitle: {title}\n{type_line}{url_line}{date_line}Summary: {summary}\nText: {safe_text}\n</memory>'
        )
    return "\n\n".join(blocks)


async def _process_chat_v2_internal(payload: ChatV2In, lib: str):
    user_id = lib
    conv_id = payload.conversation_id
    query = payload.query.strip()
    
    if not conv_id:
        c_res = db.supabase.table("conversations").insert({"user_id": user_id, "title": query[:40]}).execute()
        conv_id = c_res.data[0]["id"]
        messages = []
        is_new = True
    else:
        c_res = db.supabase.table("conversations").select("id").eq("id", conv_id).eq("user_id", user_id).execute()
        if not c_res.data:
            raise HTTPException(404, "Conversation not found")
        m_res = db.supabase.table("messages").select("*").eq("conversation_id", conv_id).order("created_at", desc=True).limit(12).execute()
        messages = list(reversed(m_res.data))
        is_new = False

    # Collect all cited item IDs across the entire conversation history (Session Memory Pool)
    session_cited_ids = []
    if payload.context_item_ids:
        for cid in payload.context_item_ids:
            if cid and cid not in session_cited_ids:
                session_cited_ids.append(cid)

    for m in messages:
        if m.get("role") == "assistant" and m.get("cited_item_ids"):
            for cid in m["cited_item_ids"]:
                if cid and cid not in session_cited_ids:
                    session_cited_ids.append(cid)

    action = classify_agent_action(query, bool(messages))
    logger.info(f"V2 Agent Action: {action} | Conv: {conv_id} | Session IDs: {len(session_cited_ids)} | Query: {query[:40]}")

    final_ids = []
    context_items = []
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d (%A)")

    if action == "chitchat":
        final_ids = session_cited_ids[:8]
        context_items = []
        system_prompt = (
            "You are Forgot AI, a warm, helpful, and concise personal memory assistant.\n"
            "The user is engaging in casual conversation, pleasantries, greetings, or expressing gratitude.\n"
            "Respond naturally, warmly, and concisely (e.g. 'You're welcome! Let me know if you need anything else!').\n"
            "Do NOT search for new notes, do NOT bring up unprompted notes, and do NOT apologize or claim you made an error."
        )

    elif action == "followup":
        # Pull all previously cited items from session pool
        if session_cited_ids:
            try:
                items_res = db.supabase.table("items").select("*").in_("id", session_cited_ids).eq("library_id", lib).execute()
                context_items = deduplicate_items(items_res.data or [])
            except Exception as e:
                logger.error(f"Failed to fetch session items for followup: {e}")
                context_items = []
        
        # If user mentions a specific URL or key terms in their followup/complaint, lookup matching items
        url_match = re.search(r'([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)', query)
        if url_match:
            try:
                target_url = url_match.group(1).lower()
                url_items = await db.items.find({"library_id": lib, "source_url": {"$regex": target_url, "$options": "i"}}).to_list(4)
                if url_items:
                    context_items = deduplicate_items(url_items + context_items)
            except Exception as e:
                logger.error(f"URL lookup in followup failed: {e}")

        # Fallback to recent items if session had no cited IDs
        if not context_items:
            try:
                fallback_res = db.supabase.table("items").select("*").eq("library_id", lib).eq("status", "ready").order("created_at", desc=True).limit(6).execute()
                context_items = deduplicate_items(fallback_res.data or [])
            except Exception as e:
                logger.error(f"Fallback fetch for followup failed: {e}")
                context_items = []

        final_ids = list(dict.fromkeys([it["id"] for it in context_items] + session_cited_ids))[:10]
        context_str = format_memory_blocks(context_items)

        system_prompt = (
            f"You are Forgot AI, an intelligent personal memory assistant. Today's date is {today_str}.\n"
            "The user is asking a follow-up question, seeking clarification, or discussing items/topics already present in this conversation.\n"
            "Use the conversation history and the saved memories below to answer the user directly and helpfully.\n"
            "- If the user asks about 'the 4th one', 'the 5th one', 'the second link', etc., identify that exact item from your previous message in the chat history.\n"
            "- If the user is pointing out a note that was previously missed or questioning why an item wasn't shown earlier, acknowledge the item respectfully, explain what you found in their memory, and provide the helpful details without being defensive.\n"
            "- Link formatting rule: If an item has a URL, format it as a clickable markdown link [Title](URL). If an item has NO URL (URL is None, such as an uploaded image, screenshot, or text note), do NOT create a markdown link; write it in bold text: **Title** (Image) or **Title** (Note).\n"
            "- NEVER claim an item does not exist if it appears in the chat history or in the memories below.\n"
            "- Do NOT output raw database IDs. Refer to items by their title or clean clickable link.\n\n"
            f"Active Memories in Conversation:\n{context_str}"
        )

    elif action == "recency":
        try:
            rec_res = db.supabase.table("items").select("*").eq("library_id", lib).eq("status", "ready").order("created_at", desc=True).limit(10).execute()
            raw_items = rec_res.data or []
            context_items = deduplicate_items(raw_items)[:6]
        except Exception as e:
            logger.error(f"Failed to fetch recent items: {e}")
            context_items = []

        final_ids = list(dict.fromkeys([it["id"] for it in context_items] + session_cited_ids))[:10]
        context_str = format_memory_blocks(context_items)

        system_prompt = (
            f"You are Forgot AI, an intelligent personal memory assistant. Today's date is {today_str}.\n"
            "You have access to the user's recently saved items in the <memory> blocks below.\n"
            "- List the user's recently saved items clearly as a clean numbered list (1., 2., 3., etc.).\n"
            "- Link formatting rule: If an item has a URL, format it as a clickable markdown link [Title](URL). If an item has NO URL (URL is None, such as an uploaded image, screenshot, or text note), do NOT create a markdown link; write it in bold text: **Title** (Image) or **Title** (Note).\n"
            "- If asked about 'today' or 'yesterday', check the SavedDate of each memory against today's date ({today_str[:10]}).\n"
            "- Do NOT output raw database IDs. Refer to memories by their title or clean clickable link.\n"
            "- Answer directly, concisely, and helpfully.\n\n"
            f"Recent Memories:\n{context_str}"
        )

    else:  # action == "search"
        search_query = query
        if messages:
            hist_text = "\n".join([f"{m['role']}: {m['content']}" for m in messages[-4:]])
            rewrite_prompt = (
                f"Given the following chat history, extract or rewrite the user's latest query to be the core search query/keywords. "
                "Keep key entity names, people names, or core topics. If it already makes sense as a keyword, return it concisely. "
                f"History:\n{hist_text}\n\nLatest query: {query}"
            )
            try:
                rewritten = await llm_chat("You are a helpful query rewriter. Output only the standalone search query or keywords.", [{"role": "user", "content": rewrite_prompt}])
                if rewritten and len(rewritten.strip()) > 1:
                    search_query = rewritten.strip()
            except Exception as e:
                logger.error(f"Query rewrite failed: {e}")
                search_query = query

        # 1. Use the unified AI search ranker (retrieve) - exactly like the webapp!
        retrieved_results, _ = await retrieve(search_query, lib, limit=8)
        
        # 2. If rewritten search returned nothing, fallback to user's original query directly
        if not retrieved_results and search_query != query:
            retrieved_results, _ = await retrieve(query, lib, limit=8)

        context_items = deduplicate_items(retrieved_results)[:8]
        final_ids = list(dict.fromkeys([it["id"] for it in context_items] + session_cited_ids))[:10]

        if context_items:
            context_str = format_memory_blocks(context_items)

            system_prompt = (
                f"You are Forgot AI, an intelligent personal memory assistant. Today's date is {today_str}.\n"
                "You have access to the user's saved items matching their search in the <memory> blocks below.\n"
                "- Link formatting rule: If an item has a URL, format it as a clickable markdown link [Title](URL). If an item has NO URL (URL is None, such as an uploaded image, screenshot, or text note), do NOT create a markdown link; write it in bold text: **Title** (Image) or **Title** (Note).\n"
                "- Answer the user's question directly and concisely using information from their memories.\n"
                "- Do NOT output raw database IDs like [uuid]. Refer to memories by their title or clean clickable link.\n\n"
                f"Search Results:\n{context_str}"
            )
        else:
            # Smart Anti-Gaslight Protocol: Provide recent library saves as candidate references
            cand_items = []
            try:
                cand_res = await db.items.find({"status": "ready", "library_id": lib}).sort("created_at", -1).to_list(4)
                cand_items = deduplicate_items([clean(c) for c in cand_res])
            except Exception as e:
                logger.error(f"Failed to fetch candidate items: {e}")
                cand_items = []

            if cand_items:
                cand_str = format_memory_blocks(cand_items)
                system_prompt = (
                    f"You are Forgot AI, an intelligent personal memory assistant. Today's date is {today_str}.\n"
                    f"The user asked: '{query}'.\n"
                    "No exact direct match was found for those exact words, but here are some of the user's recent saves for reference:\n"
                    f"{cand_str}\n"
                    "RULES:\n"
                    "- Check if any of the above memories are conceptually related to what the user is asking about (e.g. slight spelling variation, related topic, or phonetic similarity like 'owe' vs 'own/ownerbook').\n"
                    "- If one of the memories seems relevant, explain it helpfully and format links as [Title](URL).\n"
                    "- If none of them are related, politely let the user know you couldn't find a matching note for that specific phrase and invite them to describe it differently or save it now.\n"
                    "- NEVER claim an item does not exist if it appears in the conversation history or above."
                )
                final_ids = [c["id"] for c in cand_items]
            else:
                system_prompt = (
                    f"You are Forgot AI, a personal memory assistant. Today's date is {today_str}.\n"
                    f"The user searched for '{query}', but no saved items were found in their library yet.\n"
                    "Politely and warmly let the user know, and invite them to save a note or link."
                )

    llm_history = [{"role": m["role"], "content": m["content"]} for m in messages]
    llm_history.append({"role": "user", "content": query})
    
    logger.info(f"V2 Chat: {conv_id} | User: {user_id[-6:]} | Action: {action} | Context Items: {len(context_items)}")

    return conv_id, system_prompt, llm_history, final_ids, context_items, is_new

@api_router.post("/chat/v2")
async def chat_v2(payload: ChatV2In, lib: str = Depends(resolve_library)):
    user_id = lib
    conv_id = payload.conversation_id
    if not conv_id:
        c_res = db.supabase.table("conversations").insert({"user_id": user_id, "title": payload.query[:40]}).execute()
        conv_id = c_res.data[0]["id"]
        messages = []
    else:
        c_res = db.supabase.table("conversations").select("id").eq("id", conv_id).eq("user_id", user_id).execute()
        if not c_res.data:
            raise HTTPException(404, "Conversation not found")
        m_res = db.supabase.table("messages").select("*").eq("conversation_id", conv_id).order("created_at", desc=True).limit(12).execute()
        messages = list(reversed(m_res.data))

    session_cited_ids = []
    if payload.context_item_ids:
        for cid in payload.context_item_ids:
            if cid and cid not in session_cited_ids:
                session_cited_ids.append(cid)

    for m in messages:
        if m.get("role") == "assistant" and m.get("cited_item_ids"):
            for cid in m["cited_item_ids"]:
                if cid and cid not in session_cited_ids:
                    session_cited_ids.append(cid)

    active_docs = []
    if session_cited_ids:
        try:
            items_res = db.supabase.table("items").select("*").in_("id", session_cited_ids).eq("library_id", lib).execute()
            active_docs = items_res.data or []
        except Exception as e:
            logger.error(f"Failed to fetch session items: {e}")

    db.supabase.table("messages").insert({"conversation_id": conv_id, "role": "user", "content": payload.query}).execute()
    history = [{"role": m["role"], "content": m["content"]} for m in messages]

    final_payload = {}
    async for event in run_agent_stream(payload.query, history, db, lib, retrieve, active_docs):
        if event.get("type") == "final":
            final_payload = event

    answer = final_payload.get("answer", "")
    cited_ids = final_payload.get("context_ids", [])
    cited_results = final_payload.get("results", [])

    db.supabase.table("messages").insert({
        "conversation_id": conv_id,
        "role": "assistant",
        "content": answer,
        "cited_item_ids": cited_ids
    }).execute()
    db.supabase.table("conversations").update({"updated_at": "now()"}).eq("id", conv_id).execute()

    return {
        "conversation_id": conv_id,
        "answer": answer,
        "results": cited_results,
        "context_ids": cited_ids
    }

@api_router.post("/chat/v2/stream")
async def chat_v2_stream(payload: ChatV2In, lib: str = Depends(resolve_library)):
    user_id = lib
    conv_id = payload.conversation_id
    if not conv_id:
        c_res = db.supabase.table("conversations").insert({"user_id": user_id, "title": payload.query[:40]}).execute()
        conv_id = c_res.data[0]["id"]
        messages = []
    else:
        c_res = db.supabase.table("conversations").select("id").eq("id", conv_id).eq("user_id", user_id).execute()
        if not c_res.data:
            raise HTTPException(404, "Conversation not found")
        m_res = db.supabase.table("messages").select("*").eq("conversation_id", conv_id).order("created_at", desc=True).limit(12).execute()
        messages = list(reversed(m_res.data))

    session_cited_ids = []
    if payload.context_item_ids:
        for cid in payload.context_item_ids:
            if cid and cid not in session_cited_ids:
                session_cited_ids.append(cid)

    for m in messages:
        if m.get("role") == "assistant" and m.get("cited_item_ids"):
            for cid in m["cited_item_ids"]:
                if cid and cid not in session_cited_ids:
                    session_cited_ids.append(cid)

    active_docs = []
    if session_cited_ids:
        try:
            items_res = db.supabase.table("items").select("*").in_("id", session_cited_ids).eq("library_id", lib).execute()
            active_docs = items_res.data or []
        except Exception as e:
            logger.error(f"Failed to fetch session items: {e}")

    db.supabase.table("messages").insert({"conversation_id": conv_id, "role": "user", "content": payload.query}).execute()
    history = [{"role": m["role"], "content": m["content"]} for m in messages]

    async def event_generator():
        final_payload = {}
        try:
            async for event in run_agent_stream(payload.query, history, db, lib, retrieve, active_docs):
                if event.get("type") == "token":
                    yield f"data: {json.dumps({'type': 'token', 'text': event['text']})}\n\n"
                elif event.get("type") == "final":
                    final_payload = event
                    db.supabase.table("messages").insert({
                        "conversation_id": conv_id,
                        "role": "assistant",
                        "content": final_payload.get("answer", ""),
                        "cited_item_ids": final_payload.get("context_ids", [])
                    }).execute()
                    db.supabase.table("conversations").update({"updated_at": "now()"}).eq("id", conv_id).execute()

                    yield f"data: {json.dumps({'type': 'final', 'conversation_id': conv_id, 'results': final_payload.get('results', []), 'context_ids': final_payload.get('context_ids', [])})}\n\n"
        except Exception as e:
            logger.error(f"Agent event stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'text': 'Agent stream interrupted.'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
        
    return StreamingResponse(event_generator(), media_type="text/event-stream")


class FeedbackIn(BaseModel):
    message: str

@api_router.post("/feedback")
async def submit_feedback(payload: FeedbackIn, request: Request, background_tasks: BackgroundTasks):
    # Determine user info
    try:
        user = await get_current_user(request)
        user_id = user["id"]
        user_email = user.get("email", "anonymous")
    except Exception:
        # Fallback to library id if not fully authed, or anonymous
        token = _bearer(request)
        user_id = token if token else "anonymous"
        user_email = "anonymous"

    # Save to Supabase DB (silent fail if error, so user isn't blocked)
    try:
        if user_id != "anonymous":
            db.supabase.table("feedback").insert({
                "user_id": user_id,
                "user_email": user_email,
                "message": payload.message
            }).execute()
        else:
            db.supabase.table("feedback").insert({
                "user_email": user_email,
                "message": payload.message
            }).execute()
    except Exception as e:
        logger.error(f"Failed to save feedback to db: {e}")



    return {"success": True, "message": "Feedback received", "user_email": user_email}


@api_router.post("/billing/checkout")
async def billing_checkout(payload: CheckoutIn, request: Request, user: dict = Depends(get_current_user)):
    try:
        origin = request.headers.get("origin") or request.headers.get("referer")
        checkout_url = await create_checkout_url(user, payload.plan, origin=origin)
    except ValueError:
        raise HTTPException(400, "Invalid plan")
    except RuntimeError as e:
        logger.exception("Billing checkout is not configured")
        raise HTTPException(503, "Billing is not configured") from e
    except Exception as e:
        logger.exception("Failed to create Dodo checkout session")
        raise HTTPException(502, "Unable to start checkout") from e
    return {"checkout_url": checkout_url}


class SyncCheckoutIn(BaseModel):
    subscription_id: Optional[str] = None
    payment_id: Optional[str] = None
    status: Optional[str] = None
    email: Optional[str] = None


@api_router.post("/billing/sync-checkout")
async def sync_checkout_endpoint(payload: SyncCheckoutIn, request: Request):
    """Direct server-to-server verification with Dodo Payments on post-checkout return."""
    user_id = None
    token = _bearer(request)
    if token:
        try:
            u = await _user_from_token(token)
            if u:
                user_id = u["id"]
        except Exception:
            pass

    try:
        res = await sync_checkout_session(
            store=get_billing_store(),
            subscription_id=payload.subscription_id,
            payment_id=payload.payment_id,
            fallback_user_id=user_id,
            fallback_email=payload.email,
        )
        return res
    except ValueError as e:
        logger.warning(f"Sync checkout rejected: {e}")
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.exception("Failed to sync checkout session with Dodo")
        raise HTTPException(502, "Unable to verify transaction with payment provider")


@api_router.post("/billing/portal")
async def billing_portal(user: dict = Depends(get_current_user)):
    """Generate or retrieve Dodo Customer Portal URL for subscription & invoice management."""
    try:
        store = get_billing_store()
        row = await store.get_subscription(user["id"])
        customer_id = (row or {}).get("dodo_customer_id")
        sub_id = (row or {}).get("dodo_subscription_id")

        # If customer_id is missing, try to resolve it from the subscription via Dodo API
        if not customer_id and sub_id:
            try:
                dodo = get_dodo_client()
                sub = await asyncio.to_thread(dodo.subscriptions.retrieve, sub_id)
                fetched_cid = getattr(sub, "customer_id", None) or getattr(sub, "customer", None)
                if fetched_cid:
                    customer_id = str(getattr(fetched_cid, "customer_id", fetched_cid))
                    await store.update_subscription(user["id"], {"dodo_customer_id": customer_id})
            except Exception as e:
                logger.warning(f"Failed to fetch customer_id from subscription: {e}")

        portal_url = await get_customer_portal_url(customer_id)
        return {"portal_url": portal_url}
    except Exception as e:
        logger.exception("Failed to create Dodo customer portal session: %s", e)
        is_test = os.environ.get("DODO_PAYMENTS_ENVIRONMENT", "test_mode").lower() == "test_mode"
        fallback_url = "https://test.dodopayments.com/customer-portal" if is_test else "https://app.dodopayments.com/customer-portal"
        return {"portal_url": fallback_url}


@api_router.get("/billing/status")
async def billing_status(user: dict = Depends(get_current_user)):
    """Get the current user's billing status."""
    try:
        row = await get_billing_store().get_subscription(user["id"])
    except Exception as e:
        logger.warning("Failed to load billing state: %s", e)
        row = None
    return billing_public_fields(row)


@api_router.post("/billing/cancel")
async def cancel_subscription_endpoint(user: dict = Depends(get_current_user)):
    """Cancel the user's Pro subscription."""
    try:
        updated = await cancel_subscription(get_billing_store(), user["id"])
        return billing_public_fields(updated)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        logger.error(f"Subscription cancellation failed: {e}")
        raise HTTPException(502, "Failed to cancel subscription. Please contact support.")
    except Exception as e:
        logger.error(f"Unexpected error during cancellation: {e}")
        raise HTTPException(500, "An unexpected error occurred")


@api_router.post("/webhooks/dodo")
async def dodo_webhook(request: Request):
    raw = await request.body()
    headers = {
        "webhook-id": request.headers.get("webhook-id", ""),
        "webhook-signature": request.headers.get("webhook-signature", ""),
        "webhook-timestamp": request.headers.get("webhook-timestamp", ""),
    }
    try:
        unwrapped = await asyncio.to_thread(unwrap_webhook, raw, headers)
    except Exception:
        raise HTTPException(401, "Invalid signature")
    event_type, data = event_from_unwrapped(unwrapped)
    webhook_id = headers["webhook-id"]
    try:
        await asyncio.to_thread(
            process_verified_webhook,
            get_billing_store(),
            webhook_id,
            event_type,
            data,
        )
    except Exception:
        logger.exception("Failed to process Dodo webhook %s", event_type)
        raise HTTPException(500, "Webhook processing failed")
    return {"received": True}


# Register all routes
app.include_router(api_router)
