import os
import uuid
import json
import logging
import base64
import re
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import List, Optional, Annotated

import requests
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Header
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
AI_MODEL = ("gemini", "gemini-3.1-pro-preview")

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "forgot-ai"
storage_key = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

DEFAULT_LIB = "default"


def lib_of(x_library_id: Optional[str]) -> str:
    return (x_library_id or "").strip() or DEFAULT_LIB


# ---------------- Storage helpers ----------------
def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


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
    content_type: str  # image | text | url
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
    status: str = "processing"  # processing | ready | failed
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


# ---------------- AI helpers ----------------
async def llm_text(system: str, prompt: str, image_b64: Optional[str] = None) -> str:
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()), system_message=system).with_model(*AI_MODEL)
    if image_b64:
        msg = UserMessage(text=prompt, file_contents=[ImageContent(image_base64=image_b64)])
    else:
        msg = UserMessage(text=prompt)
    return await chat.send_message(msg)


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


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "Forgot AI API"}


@api_router.post("/items/check")
async def check_duplicate(payload: CheckIn, x_library_id: Optional[str] = Header(None)):
    lib = lib_of(x_library_id)
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
async def save_text(payload: TextSaveIn, background: BackgroundTasks, x_library_id: Optional[str] = Header(None)):
    if not payload.text.strip():
        raise HTTPException(400, "Text is empty")
    item = SavedItem(library_id=lib_of(x_library_id), content_type="text", original_text=payload.text,
                     source_url=payload.source_url, source_title=payload.source_title,
                     source_domain=domain_of(payload.source_url) if payload.source_url else None,
                     dedup_key=text_hash(payload.text), title=payload.text.strip()[:60])
    await db.items.insert_one(item.model_dump())
    background.add_task(enrich_item, item.id)
    return item


@api_router.post("/items/url", response_model=SavedItem)
async def save_url(payload: UrlSaveIn, background: BackgroundTasks, x_library_id: Optional[str] = Header(None)):
    url = payload.url.strip()
    if not url:
        raise HTTPException(400, "URL is empty")
    if not url.startswith("http"):
        url = "https://" + url
    item = SavedItem(library_id=lib_of(x_library_id), content_type="url", source_url=url,
                     original_text=payload.context_text, source_title=payload.source_title,
                     source_domain=domain_of(url), dedup_key=normalize_url(url), title=url[:60])
    await db.items.insert_one(item.model_dump())
    background.add_task(enrich_item, item.id)
    return item


@api_router.post("/items/image", response_model=SavedItem)
async def save_image(background: BackgroundTasks, file: UploadFile = File(...),
                     source_url: Optional[str] = Form(None), source_title: Optional[str] = Form(None),
                     x_library_id: Optional[str] = Header(None)):
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty image")
    ext = (file.filename or "png").split(".")[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "webp", "gif"):
        ext = "png"
    path = f"{APP_NAME}/uploads/shared/{uuid.uuid4()}.{ext}"
    ct = file.content_type or "image/png"
    try:
        result = put_object(path, data, ct)
        stored_path = result["path"]
    except Exception as e:
        logger.error(f"Image upload failed: {e}")
        raise HTTPException(500, "Image storage failed")
    item = SavedItem(library_id=lib_of(x_library_id), content_type="image", image_path=stored_path,
                     source_url=source_url, source_title=source_title,
                     source_domain=domain_of(source_url) if source_url else None,
                     dedup_key="img:" + hashlib.sha256(data).hexdigest(),
                     title=(file.filename or "Screenshot")[:60])
    await db.items.insert_one(item.model_dump())
    background.add_task(enrich_item, item.id)
    return item


@api_router.get("/items", response_model=List[SavedItem])
async def list_items(limit: int = 200, x_library_id: Optional[str] = Header(None)):
    docs = await db.items.find({"library_id": lib_of(x_library_id)}).sort("created_at", -1).to_list(limit)
    return [clean(d) for d in docs]


@api_router.get("/items/{item_id}/related", response_model=List[SavedItem])
async def related_items(item_id: str, x_library_id: Optional[str] = Header(None)):
    lib = lib_of(x_library_id)
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
async def get_item(item_id: str, x_library_id: Optional[str] = Header(None)):
    doc = await db.items.find_one({"id": item_id, "library_id": lib_of(x_library_id)})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)


@api_router.put("/items/{item_id}", response_model=SavedItem)
async def update_item(item_id: str, payload: ItemUpdate, x_library_id: Optional[str] = Header(None)):
    lib = lib_of(x_library_id)
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update:
        await db.items.update_one({"id": item_id, "library_id": lib}, {"$set": update})
    doc = await db.items.find_one({"id": item_id, "library_id": lib})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)


@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, x_library_id: Optional[str] = Header(None)):
    await db.items.delete_one({"id": item_id, "library_id": lib_of(x_library_id)})
    return {"ok": True}


@api_router.post("/items/{item_id}/pin", response_model=SavedItem)
async def pin_item(item_id: str, payload: PinIn, x_library_id: Optional[str] = Header(None)):
    lib = lib_of(x_library_id)
    await db.items.update_one({"id": item_id, "library_id": lib}, {"$set": {"pinned": payload.pinned}})
    doc = await db.items.find_one({"id": item_id, "library_id": lib})
    if not doc:
        raise HTTPException(404, "Not found")
    return clean(doc)


@api_router.post("/items/{item_id}/retry", response_model=SavedItem)
async def retry_item(item_id: str, background: BackgroundTasks, x_library_id: Optional[str] = Header(None)):
    lib = lib_of(x_library_id)
    doc = await db.items.find_one({"id": item_id, "library_id": lib})
    if not doc:
        raise HTTPException(404, "Not found")
    await db.items.update_one({"id": item_id, "library_id": lib}, {"$set": {"status": "processing"}})
    background.add_task(enrich_item, item_id)
    doc["status"] = "processing"
    return clean(doc)


@api_router.post("/items/{item_id}/ask")
async def ask_item(item_id: str, payload: AskIn, x_library_id: Optional[str] = Header(None)):
    doc = await db.items.find_one({"id": item_id, "library_id": lib_of(x_library_id)})
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
async def search(payload: SearchIn, x_library_id: Optional[str] = Header(None)):
    q = payload.query.strip()
    if not q:
        return {"results": []}
    results, _ = await rank_items(q, lib_of(x_library_id))
    return {"results": results, "query": q}


@api_router.post("/chat")
async def chat(payload: ChatIn, x_library_id: Optional[str] = Header(None)):
    q = payload.query.strip()
    if not q:
        return {"answer": "Ask me anything about what you've saved.", "results": []}
    results, by_id = await rank_items(q, lib_of(x_library_id), limit=8)
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
async def download_file(path: str):
    doc = await db.items.find_one({"image_path": path})
    if not doc:
        raise HTTPException(404, "File not found")
    data, content_type = get_object(path)
    return Response(content=data, media_type=content_type)


# ---------------- App wiring ----------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
