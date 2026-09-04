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

import requests
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Header, Query, Request, Depends
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict, EmailStr
from supabase_db import SupabaseDatabase, create_supabase_client

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

supabase = create_supabase_client()
db = SupabaseDatabase(supabase)

OLLAMA_API_KEY = os.environ.get('OLLAMA_API_KEY', '').strip()
OLLAMA_BASE_URL = (os.environ.get('OLLAMA_BASE_URL') or "https://ollama.com/api/generate").rstrip('/')
AI_MODEL = ("ollama", "qwen3-vl:235b-instruct")
APP_NAME = "forgot-ai"
STORAGE_BUCKET = os.environ.get("STORAGE_BUCKET", "forgot-ai-assets")

app = FastAPI()
api_router = APIRouter(prefix="/api")

DEFAULT_LIB = "default"
MAX_FAILED = 5
LOCKOUT_MIN = 15


class SimpleRateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int = 60):
        now = datetime.now(timezone.utc).timestamp()
        timestamps = [t for t in self.requests[key] if now - t < window_seconds]
        if len(timestamps) >= max_requests:
            raise HTTPException(429, "Too many requests. Please slow down.")
        timestamps.append(now)
        self.requests[key] = timestamps


limiter = SimpleRateLimiter()


def put_object(path: str, data: bytes, content_type: str) -> dict:
    supabase.storage.from_(STORAGE_BUCKET).upload(
        path, data, {"content-type": content_type, "upsert": "false"}
    )
    return {"path": path}


def get_object(path: str):
    data = supabase.storage.from_(STORAGE_BUCKET).download(path)
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


class UrlSaveIn(BaseModel):
    url: str
    context_text: Optional[str] = None
    source_title: Optional[str] = None


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    keywords: Optional[List[str]] = None


class SearchIn(BaseModel):
    query: str


class ChatIn(BaseModel):
    query: str


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
async def llm_text(system: str, prompt: str, image_b64: Optional[str] = None) -> str:
    payload = {
        "model": AI_MODEL[1],
        "system": system,
        "prompt": prompt,
        "stream": False,
        "format": "json",
    }
    if image_b64:
        payload["images"] = [image_b64]

    headers = {"Content-Type": "application/json"}
    if OLLAMA_API_KEY:
        headers["Authorization"] = f"Bearer {OLLAMA_API_KEY}"
        headers["X-API-Key"] = OLLAMA_API_KEY

    response = requests.post(OLLAMA_BASE_URL, headers=headers, json=payload, timeout=180)
    response.raise_for_status()
    data = response.json()

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


def parse_json_block(text: str) -> dict:
    if not text:
        return {}
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return {}
    try:
        return json.loads(m.group(0))
    except Exception:
        return {}


ENRICH_SYSTEM = (
    "You are Forgot AI, a personal memory organizer. Given a saved item, produce concise, useful metadata "
    "so the user can find it later with natural language. Always respond with a single JSON object only, no prose."
)


def enrich_prompt(kind: str, body: str) -> str:
    return (
        f"The user saved this {kind}. Analyze it and return JSON with keys: "
        '"title" (short, specific, max 8 words), '
        '"summary" (1-2 plain sentences explaining what it is and why it may be useful), '
        '"keywords" (array of 4-8 lowercase topical keywords, include synonyms/related concepts, not just literal words), '
        '"category" (one short label like Ideas, AI Tools, Coding, Marketing, Productivity, Reference, Design, Finance, Personal), '
        '"extracted_text" (any readable text found in the content, or empty string), '
        '"searchable_text" (a rich paragraph combining literal content AND its meaning, topics, and likely search intents).\n\n'
        f"CONTENT:\n{body}"
    )


async def fetch_url_content(url: str):
    if not is_safe_url(url):
        logger.warning(f"SSRF blocked URL fetch for {url}")
        return None, ""
    title, text = None, ""
    try:
        r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0 (compatible; ForgotAI/1.0)"})
        html = r.text
        tm = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        if tm:
            title = re.sub(r"\s+", " ", tm.group(1)).strip()[:200]
        body = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.IGNORECASE | re.DOTALL)
        body = re.sub(r"<[^>]+>", " ", body)
        body = re.sub(r"\s+", " ", body).strip()
        text = body[:6000]
    except Exception as e:
        logger.warning(f"URL fetch failed for {url}: {e}")
    return title, text


async def enrich_item(item_id: str):
    doc = await db.items.find_one({"id": item_id})
    if not doc:
        return
    try:
        ct = doc["content_type"]
        if ct == "image":
            data, _ = get_object(doc["image_path"])
            b64 = base64.b64encode(data).decode()
            raw = await llm_text(ENRICH_SYSTEM,
                                 enrich_prompt("screenshot/image",
                                               "Describe what this image shows, extract any readable text, and infer its topic."),
                                 image_b64=b64)
        elif ct == "url":
            title, text = await fetch_url_content(doc["source_url"])
            update = {}
            if title and not doc.get("source_title"):
                update["source_title"] = title
            if update:
                await db.items.update_one({"id": item_id}, {"$set": update})
            body = (f"URL: {doc['source_url']}\nDomain: {doc.get('source_domain')}\n"
                    f"Page title: {title or doc.get('source_title') or 'unknown'}\n"
                    f"Extracted page content: {text or doc.get('original_text') or 'not accessible'}")
            raw = await llm_text(ENRICH_SYSTEM, enrich_prompt("web page / URL", body))
        else:
            raw = await llm_text(ENRICH_SYSTEM, enrich_prompt("text note", doc.get("original_text") or ""))

        meta = parse_json_block(raw)
        if not meta.get("title"):
            raise ValueError("empty enrichment")
        kws = meta.get("keywords") or []
        if isinstance(kws, str):
            kws = [k.strip() for k in kws.split(",") if k.strip()]
        update = {
            "title": str(meta.get("title", "Untitled"))[:200],
            "summary": str(meta.get("summary", "")),
            "keywords": [str(k) for k in kws][:12],
            "category": str(meta.get("category", "Uncategorized"))[:40],
            "extracted_text": str(meta.get("extracted_text", "")),
            "searchable_text": str(meta.get("searchable_text", "")),
            "status": "ready",
        }
        await db.items.update_one({"id": item_id}, {"$set": update})
        logger.info(f"Enriched item {item_id}")
    except Exception as e:
        logger.error(f"Enrichment failed for {item_id}: {e}")
        await db.items.update_one({"id": item_id}, {"$set": {"status": "failed"}})


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


async def rank_items(query: str, lib: str, limit: int = 30):
    docs = await db.items.find({"status": "ready", "library_id": lib}).sort("created_at", -1).to_list(300)
    if not docs:
        return [], {}
    catalog = []
    for d in docs:
        catalog.append({
            "id": d["id"],
            "title": d.get("title"),
            "type": d.get("content_type"),
            "category": d.get("category"),
            "domain": d.get("source_domain"),
            "keywords": d.get("keywords", []),
            "summary": d.get("summary"),
            "saved": rel_age(d.get("created_at", "")),
            "saved_at": d.get("created_at"),
            "text": ((d.get("searchable_text") or "") + " " + (d.get("extracted_text") or ""))[:600],
        })
    now = datetime.now(timezone.utc).isoformat()
    system = (
        "You are Forgot AI's semantic search over a person's saved memories. Match by MEANING using ALL signals: "
        "meaning/summary, text (including text read from images), title, keywords, category, domain/source and type. "
        "Be TIME-AWARE: if the query mentions today/yesterday/this week/last month, use each item's 'saved'/'saved_at' "
        "relative to the current time to filter and rank; never invent exact dates. Do NOT surface an item just because "
        "one generic word matched. Rank by true relevance. "
        f"Current time is {now}. "
        'Respond ONLY with JSON: {"results":[{"id":"...","reason":"short why it matched"}]} (max 20). '
        "If nothing is genuinely relevant, return an empty results array."
    )
    prompt = f"USER QUERY: {query}\n\nSAVED MEMORIES:\n{json.dumps(catalog)}"
    raw = await llm_text(system, prompt)
    parsed = parse_json_block(raw)
    ranked = parsed.get("results", []) if isinstance(parsed, dict) else []
    by_id = {d["id"]: clean(d) for d in docs}
    results = []
    for r in ranked[:limit]:
        item = by_id.get(r.get("id"))
        if item:
            item = dict(item)
            item["match_reason"] = r.get("reason", "")
            results.append(item)
    return results, by_id


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


# ---------------- Auth routes ----------------
@api_router.post("/auth/register")
async def register(payload: AuthIn, request: Request):
    email = payload.email.lower().strip()
    if len(payload.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    try:
        created = supabase.auth.admin.create_user({
            "email": email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {"name": email.split("@")[0]},
        })
        auth_user = created.user
    except Exception as e:
        if "already" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(400, "An account with this email already exists")
        raise HTTPException(400, "Unable to create account") from e
    user = {
        "id": str(auth_user.id),
        "email": email,
        "name": email.split("@")[0],
        "token_version": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
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
async def root():
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
    background.add_task(enrich_item, item.id)
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
    background.add_task(enrich_item, item.id)
    return item


@api_router.post("/items/image", response_model=SavedItem)
async def save_image(background: BackgroundTasks, file: UploadFile = File(...),
                     source_url: Optional[str] = Form(None), source_title: Optional[str] = Form(None),
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
        result = put_object(path, data, ct)
        stored_path = result["path"]
    except Exception as e:
        logger.error(f"Image upload failed: {e}")
        raise HTTPException(500, "Image storage failed")
    item = SavedItem(library_id=lib, content_type="image", image_path=stored_path,
                     source_url=source_url, source_title=source_title,
                     source_domain=domain_of(source_url) if source_url else None,
                     dedup_key="img:" + hashlib.sha256(data).hexdigest(),
                     title=(file.filename or "Screenshot")[:60])
    values = item.model_dump()
    values["owner_user_id"] = lib
    await db.items.insert_one(values)
    background.add_task(enrich_item, item.id)
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
    system = ("You are Forgot AI. Answer the user's question about ONE saved item using only its content below. "
              "Be concise and practical. If the item lacks the info, say so briefly.\n\nSAVED ITEM:\n" + context)
    answer = await llm_text(system, payload.question)
    return {"answer": answer}


@api_router.post("/search")
async def search(payload: SearchIn, lib: str = Depends(resolve_library)):
    limiter.check(lib, 30, 60)
    q = payload.query.strip()
    if not q:
        return {"results": []}
    results, _ = await rank_items(q, lib)
    return {"results": results, "query": q}


@api_router.post("/chat")
async def chat(payload: ChatIn, lib: str = Depends(resolve_library)):
    limiter.check(lib, 30, 60)
    q = payload.query.strip()
    if not q:
        return {"answer": "Ask me anything about what you've saved.", "results": []}
    results, by_id = await rank_items(q, lib, limit=8)
    if not results:
        return {"answer": "I couldn't find anything relevant in your saved memories. Try describing it differently.", "results": []}
    ctx_parts = []
    for i, it in enumerate(results, 1):
        ctx_parts.append(
            f"[{i}] Title: {it.get('title')} | Type: {it.get('content_type')} | Saved: {rel_age(it.get('created_at',''))}\n"
            f"Summary: {it.get('summary')}\nKeywords: {', '.join(it.get('keywords', []))}\n"
            f"Text: {(it.get('extracted_text') or it.get('original_text') or '')[:400]}\n"
            f"Source: {it.get('source_url') or 'none'}"
        )
    system = (
        "You are Forgot AI's memory assistant. Answer the user ONLY using their saved memories provided below. "
        "Do NOT use outside knowledge and do NOT make things up. Be concise, reference which memories are relevant "
        "(e.g. 'you saved...'), and if the memories don't answer it, say so plainly.\n\nSAVED MEMORIES:\n"
        + "\n\n".join(ctx_parts)
    )
    answer = await llm_text(system, q)
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
    data, content_type = get_object(path)
    return Response(content=data, media_type=content_type)


# ---------------- App wiring ----------------
app.include_router(api_router)

raw_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
origins = [o.strip() for o in raw_origins if o.strip()]
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


