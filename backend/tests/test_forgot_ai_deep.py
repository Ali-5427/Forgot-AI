"""Deep upgrade tests for Forgot AI: library isolation, dedup, chat, related, time-aware search."""
import os
import io
import time
import uuid
import hashlib
import pytest
import requests
from PIL import Image, ImageDraw

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or open('/app/frontend/.env').read().split('REACT_APP_BACKEND_URL=')[1].split('\n')[0].strip()).rstrip('/')
API = f"{BASE_URL}/api"

LIB_A = f"TESTLIB_A_{uuid.uuid4().hex[:8]}"
LIB_B = f"TESTLIB_B_{uuid.uuid4().hex[:8]}"
LIB_NEW = f"TESTLIB_NEW_{uuid.uuid4().hex[:8]}"

POLL_TIMEOUT = 90
POLL_INTERVAL = 3


def _h(lib):
    return {"X-Library-Id": lib}


def wait_ready(item_id, lib, timeout=POLL_TIMEOUT):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        r = requests.get(f"{API}/items/{item_id}", headers=_h(lib), timeout=30)
        if r.status_code == 200:
            last = r.json()
            if last.get("status") in ("ready", "failed"):
                return last
        time.sleep(POLL_INTERVAL)
    return last


def make_test_image(seed=0):
    img = Image.new("RGB", (500, 300), (240 - seed, 245, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([20, 20, 480, 280], outline=(30, 30, 120), width=4)
    d.ellipse([60, 60, 200, 200], fill=(255, 200, 50 + seed), outline=(200, 100, 0), width=3)
    d.line([220, 60, 460, 240], fill=(200, 0, 100), width=5)
    d.text((240, 120), f"AI note {seed}", fill=(20, 20, 60))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def created():
    ids = []  # list of (id, lib)
    yield ids
    for i, lib in ids:
        try:
            requests.delete(f"{API}/items/{i}", headers=_h(lib), timeout=10)
        except Exception:
            pass


# ---------- Library Isolation ----------
def test_new_library_empty():
    r = requests.get(f"{API}/items", headers=_h(LIB_NEW), timeout=15)
    assert r.status_code == 200
    assert r.json() == []


def test_library_isolation_save_and_list(created):
    # Save item to A
    ra = requests.post(f"{API}/items/text",
                       json={"text": "LibA private note about vector databases and pgvector."},
                       headers=_h(LIB_A), timeout=30)
    assert ra.status_code == 200
    a_id = ra.json()["id"]
    created.append((a_id, LIB_A))

    # Save item to B
    rb = requests.post(f"{API}/items/text",
                       json={"text": "LibB private note about SwiftUI animations."},
                       headers=_h(LIB_B), timeout=30)
    assert rb.status_code == 200
    b_id = rb.json()["id"]
    created.append((b_id, LIB_B))

    # A can list its own, not B's
    la = requests.get(f"{API}/items", headers=_h(LIB_A), timeout=15).json()
    ids_a = [i["id"] for i in la]
    assert a_id in ids_a
    assert b_id not in ids_a

    lb = requests.get(f"{API}/items", headers=_h(LIB_B), timeout=15).json()
    ids_b = [i["id"] for i in lb]
    assert b_id in ids_b
    assert a_id not in ids_b

    # Get by id cross-lib returns 404
    r_cross = requests.get(f"{API}/items/{a_id}", headers=_h(LIB_B), timeout=15)
    assert r_cross.status_code == 404, f"Cross-library GET should be 404 got {r_cross.status_code}"

    # Delete under wrong lib should not delete
    d_wrong = requests.delete(f"{API}/items/{a_id}", headers=_h(LIB_B), timeout=15)
    assert d_wrong.status_code == 200  # returns ok but nothing deleted
    still = requests.get(f"{API}/items/{a_id}", headers=_h(LIB_A), timeout=15)
    assert still.status_code == 200, "Item wrongly deleted across library"

    # Pin under wrong lib should 404
    p_wrong = requests.post(f"{API}/items/{a_id}/pin", headers=_h(LIB_B), json={"pinned": True}, timeout=15)
    assert p_wrong.status_code == 404


# ---------- Duplicate Awareness ----------
def test_duplicate_text(created):
    text = "TEST_DUP unique note about kubernetes horizontal pod autoscaler edge cases."
    r_first = requests.post(f"{API}/items/check",
                            json={"content_type": "text", "text": text},
                            headers=_h(LIB_A), timeout=15)
    assert r_first.status_code == 200
    assert r_first.json()["duplicate"] is False

    saved = requests.post(f"{API}/items/text", json={"text": text}, headers=_h(LIB_A), timeout=30)
    assert saved.status_code == 200
    created.append((saved.json()["id"], LIB_A))

    r_second = requests.post(f"{API}/items/check",
                             json={"content_type": "text", "text": text},
                             headers=_h(LIB_A), timeout=15)
    assert r_second.status_code == 200
    body = r_second.json()
    assert body["duplicate"] is True
    assert body["item"]["id"] == saved.json()["id"]

    # Different lib should NOT see it as duplicate
    r_other = requests.post(f"{API}/items/check",
                            json={"content_type": "text", "text": text},
                            headers=_h(LIB_B), timeout=15)
    assert r_other.json()["duplicate"] is False


def test_duplicate_url_normalization(created):
    url1 = "https://example.org/testdup-page"
    url2 = "https://example.org/testdup-page/"  # trailing slash
    saved = requests.post(f"{API}/items/url", json={"url": url1}, headers=_h(LIB_A), timeout=30)
    assert saved.status_code == 200
    created.append((saved.json()["id"], LIB_A))

    chk = requests.post(f"{API}/items/check",
                        json={"content_type": "url", "url": url2},
                        headers=_h(LIB_A), timeout=15)
    assert chk.status_code == 200
    assert chk.json()["duplicate"] is True, "URL normalization should treat trailing slash as same"


def test_duplicate_image_hash(created):
    data = make_test_image(seed=7)
    h = hashlib.sha256(data).hexdigest()
    chk1 = requests.post(f"{API}/items/check",
                         json={"content_type": "image", "hash": h},
                         headers=_h(LIB_A), timeout=15)
    assert chk1.json()["duplicate"] is False

    files = {"file": ("dup.png", data, "image/png")}
    r = requests.post(f"{API}/items/image", files=files, headers=_h(LIB_A), timeout=60)
    assert r.status_code == 200
    created.append((r.json()["id"], LIB_A))

    chk2 = requests.post(f"{API}/items/check",
                         json={"content_type": "image", "hash": h},
                         headers=_h(LIB_A), timeout=15)
    assert chk2.json()["duplicate"] is True


# ---------- Related ----------
def test_related_scoped(created):
    # Save 3 related items in LIB_A about "cooking"
    txts = [
        "Cooking tip: sear steak on cast iron for a perfect crust.",
        "Cooking recipe: pasta carbonara uses guanciale, pecorino and eggs.",
        "Cooking: how to make sourdough bread with a mature starter.",
    ]
    ids = []
    for t in txts:
        r = requests.post(f"{API}/items/text", json={"text": t}, headers=_h(LIB_A), timeout=30)
        assert r.status_code == 200
        ids.append(r.json()["id"])
        created.append((r.json()["id"], LIB_A))

    # Wait ready so keywords/category populated
    for i in ids:
        f = wait_ready(i, LIB_A)
        assert f and f["status"] == "ready", f"not ready: {f}"

    # Related of first item
    rel = requests.get(f"{API}/items/{ids[0]}/related", headers=_h(LIB_A), timeout=30)
    assert rel.status_code == 200
    rel_items = rel.json()
    assert isinstance(rel_items, list)
    assert len(rel_items) <= 4
    rel_ids = [x["id"] for x in rel_items]
    # At least one of the other cooking items should appear (best-effort - depends on LLM keywords)
    overlap = set(rel_ids) & set(ids[1:])
    assert len(overlap) >= 1, f"Expected at least one related cooking item, got {rel_ids}"

    # Cross-library: from LIB_B should 404
    cross = requests.get(f"{API}/items/{ids[0]}/related", headers=_h(LIB_B), timeout=15)
    assert cross.status_code == 404


# ---------- Chat (grounded) ----------
def test_chat_grounded(created):
    # Ensure LIB_A has the productivity/cooking items ready. Add a fresh distinctive one.
    r = requests.post(f"{API}/items/text",
                      json={"text": "My Zurich trip idea: visit Uetliberg mountain for sunset views."},
                      headers=_h(LIB_A), timeout=30)
    assert r.status_code == 200
    iid = r.json()["id"]
    created.append((iid, LIB_A))
    f = wait_ready(iid, LIB_A)
    assert f["status"] == "ready"

    chat_r = requests.post(f"{API}/chat", json={"query": "what did I save about Zurich?"},
                           headers=_h(LIB_A), timeout=90)
    assert chat_r.status_code == 200
    data = chat_r.json()
    assert "answer" in data and "results" in data
    assert isinstance(data["answer"], str) and len(data["answer"]) > 5
    # results should contain the Zurich item
    res_ids = [x["id"] for x in data["results"]]
    assert iid in res_ids, f"Chat did not retrieve Zurich item. Got {res_ids}"
    # Answer references saved memory (grounded); should mention Zurich or Uetliberg
    ans_low = data["answer"].lower()
    assert "zurich" in ans_low or "uetliberg" in ans_low or "sunset" in ans_low


def test_chat_empty_library():
    r = requests.post(f"{API}/chat", json={"query": "anything about quantum computing?"},
                      headers=_h(LIB_NEW), timeout=60)
    assert r.status_code == 200
    d = r.json()
    assert d["results"] == []
    assert "couldn't find" in d["answer"].lower() or "not" in d["answer"].lower()


def test_chat_isolated(created):
    # LIB_B asking about Zurich (which is in LIB_A) should NOT return it
    r = requests.post(f"{API}/chat", json={"query": "what did I save about Zurich?"},
                      headers=_h(LIB_B), timeout=60)
    assert r.status_code == 200
    d = r.json()
    for x in d["results"]:
        assert "zurich" not in (x.get("title", "") + x.get("summary", "")).lower(), \
            "Cross-library leak in chat"


# ---------- Time-aware Search ----------
def test_time_aware_search_today(created):
    # A distinctive item we just saved
    txt = "Distinct today idea about llamafile deployment on raspberry pi."
    r = requests.post(f"{API}/items/text", json={"text": txt}, headers=_h(LIB_A), timeout=30)
    assert r.status_code == 200
    iid = r.json()["id"]
    created.append((iid, LIB_A))
    assert wait_ready(iid, LIB_A)["status"] == "ready"

    s = requests.post(f"{API}/search",
                      json={"query": "the idea I saved today about llamafile"},
                      headers=_h(LIB_A), timeout=90)
    assert s.status_code == 200
    ids = [x["id"] for x in s.json()["results"]]
    assert iid in ids, f"time-aware search failed. ids={ids}"
    for x in s.json()["results"]:
        assert "match_reason" in x


def test_search_irrelevant_returns_empty(created):
    s = requests.post(f"{API}/search",
                      json={"query": "underwater basket weaving in antarctica"},
                      headers=_h(LIB_A), timeout=60)
    assert s.status_code == 200
    # Should be empty or very short list; ideally empty
    results = s.json()["results"]
    assert len(results) <= 2, f"Irrelevant query returned too many: {len(results)}"


def test_search_isolated(created):
    # Search LIB_B for something only LIB_A has
    s = requests.post(f"{API}/search",
                      json={"query": "llamafile raspberry pi"},
                      headers=_h(LIB_B), timeout=60)
    assert s.status_code == 200
    for x in s.json()["results"]:
        assert "llamafile" not in (x.get("title", "") + x.get("searchable_text", "")).lower(), \
            "search leaked across library"
