"""End-to-end backend tests for Forgot AI."""
import os
import io
import time
import uuid
import pytest
import requests
from PIL import Image, ImageDraw

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
API = f"{BASE_URL}/api"
POLL_TIMEOUT = 60  # seconds for enrichment
POLL_INTERVAL = 3


@pytest.fixture(scope="module")
def auth_header():
    email = f"test_user_{uuid.uuid4().hex[:8]}@forgot.ai"
    password = "TestPassword123!"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def created_ids():
    ids = []
    yield ids


def wait_ready(item_id, headers, timeout=POLL_TIMEOUT):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        r = requests.get(f"{API}/items/{item_id}", headers=headers, timeout=30)
        if r.status_code == 200:
            last = r.json()
            if last.get("status") in ("ready", "failed"):
                return last
        time.sleep(POLL_INTERVAL)
    return last


def _make_test_image():
    img = Image.new("RGB", (200, 200), color=(73, 109, 137))
    d = ImageDraw.Draw(img)
    d.text((10, 10), "TEST OCR TEXT", fill=(255, 255, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------- Health & Auth Enforcement ----------
def test_root():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert "Forgot AI" in r.json().get("message", "")


def test_unauthenticated_access_returns_401():
    r = requests.get(f"{API}/items", timeout=15)
    assert r.status_code == 401
    assert "sign in" in r.text.lower() or "invalid" in r.text.lower()


# ---------- Text ----------
def test_save_text_and_enrich(auth_header, created_ids):
    payload = {"text": "TEST_A cool productivity idea: students should use spaced repetition with Anki to remember lectures better and study less."}
    r = requests.post(f"{API}/items/text", json=payload, headers=auth_header, timeout=30)
    assert r.status_code == 200, r.text
    item = r.json()
    assert item["status"] == "processing"
    assert item["content_type"] == "text"
    assert item["original_text"] == payload["text"]
    created_ids.append(item["id"])

    final = wait_ready(item["id"], auth_header)
    assert final is not None
    # example.com title is "Example Domain"
    # Don't hard fail if it didn't get set, but log
    assert final["title"]


def test_save_url_unreachable_still_ready(created_ids):
    r = requests.post(f"{API}/items/url", json={"url": "https://this-domain-should-not-exist-987654.xyz/foo"}, timeout=30)
    assert r.status_code == 200
    item = r.json()
    created_ids.append(item["id"])
    final = wait_ready(item["id"])
    # never fails => ready
    assert final["status"] == "ready", f"unreachable URL should still become ready: {final}"


# ---------- Image ----------
def _make_test_image():
    img = Image.new("RGB", (600, 300), (240, 245, 255))
    d = ImageDraw.Draw(img)
    # draw shapes and text so the image is not blank
    d.rectangle([20, 20, 580, 280], outline=(30, 30, 120), width=4)
    d.ellipse([60, 60, 200, 200], fill=(255, 200, 50), outline=(200, 100, 0), width=3)
    d.line([220, 60, 560, 240], fill=(200, 0, 100), width=5)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
    d.text((240, 120), "Claude coding assistant tips", fill=(20, 20, 60), font=font)
    d.text((240, 160), "Use test-driven development", fill=(20, 20, 60), font=font)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_save_image(created_ids):
    data = _make_test_image()
    files = {"file": ("screenshot.png", data, "image/png")}
    r = requests.post(f"{API}/items/image", files=files, timeout=60)
    assert r.status_code == 200, r.text
    item = r.json()
    assert item["content_type"] == "image"
    assert item["image_path"]
    created_ids.append(item["id"])

    # file serving
    fr = requests.get(f"{API}/files/{item['image_path']}", timeout=30)
    assert fr.status_code == 200
    assert len(fr.content) > 100

    final = wait_ready(item["id"], timeout=90)
    assert final["status"] == "ready", f"image did not enrich: {final}"
    assert final["keywords"]
    # extracted_text or searchable_text should exist
    assert final["searchable_text"]


# ---------- List / Get ----------
def test_list_items(created_ids):
    r = requests.get(f"{API}/items", timeout=20)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    # newest first
    ids = [i["id"] for i in items]
    for cid in created_ids:
        assert cid in ids, f"created id {cid} missing from list"


def test_get_missing():
    r = requests.get(f"{API}/items/does-not-exist-123", timeout=15)
    assert r.status_code == 404


# ---------- Search (semantic) ----------
def test_semantic_search(created_ids):
    # rely on the productivity text item
    q = "the productivity idea about students"
    r = requests.post(f"{API}/search", json={"query": q}, timeout=90)
    assert r.status_code == 200
    data = r.json()
    assert "results" in data
    # at least one of our text item should be in results
    found = any(res["id"] == created_ids[0] for res in data["results"]) if created_ids else False
    assert found, f"semantic search did not surface the productivity text item. results={data['results'][:3]}"
    for res in data["results"]:
        assert "match_reason" in res


def test_search_empty_query():
    r = requests.post(f"{API}/search", json={"query": ""}, timeout=15)
    assert r.status_code == 200
    assert r.json()["results"] == []


# ---------- Ask ----------
def test_ask_item(created_ids):
    assert created_ids
    r = requests.post(f"{API}/items/{created_ids[0]}/ask", json={"question": "What technique does this suggest?"}, timeout=90)
    assert r.status_code == 200
    ans = r.json().get("answer", "")
    assert isinstance(ans, str) and len(ans) > 5


# ---------- Edit ----------
def test_update_item(created_ids):
    assert created_ids
    iid = created_ids[0]
    # get original
    before = requests.get(f"{API}/items/{iid}", timeout=15).json()
    orig_text = before["original_text"]
    new_title = "TEST_Updated Title"
    r = requests.put(f"{API}/items/{iid}", json={"title": new_title, "category": "Learning", "keywords": ["a", "b"]}, timeout=15)
    assert r.status_code == 200
    updated = r.json()
    assert updated["title"] == new_title
    assert updated["category"] == "Learning"
    assert updated["keywords"] == ["a", "b"]
    # original_text intact
    assert updated["original_text"] == orig_text


# ---------- Retry ----------
def test_retry(created_ids):
    assert created_ids
    iid = created_ids[0]
    r = requests.post(f"{API}/items/{iid}/retry", timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "processing"
    final = wait_ready(iid)
    assert final["status"] == "ready"


# ---------- Delete ----------
def test_delete(created_ids):
    # delete last created
    iid = created_ids.pop()
    r = requests.delete(f"{API}/items/{iid}", timeout=15)
    assert r.status_code == 200
    g = requests.get(f"{API}/items/{iid}", timeout=15)
    assert g.status_code == 404


# ---------- Forgot Password ----------
def test_forgot_password_does_not_reveal_account():
    """Test that forgot-password always returns success, even for non-existent email."""
    fake_email = f"nonexistent_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/forgot-password", json={"email": fake_email}, timeout=15)
    assert r.status_code == 200
    assert "send a reset link" in r.json().get("message", "").lower()


# ---------- Change Password ----------
def test_change_password_requires_auth():
    """Test that change-password requires authentication."""
    r = requests.post(f"{API}/auth/change-password", json={
        "old_password": "test123",
        "new_password": "newtest123",
        "confirm_password": "newtest123"
    }, timeout=15)
    assert r.status_code == 401


# ---------- Billing Status ----------
def test_billing_status_requires_auth():
    """Test that billing status requires authentication."""
    r = requests.get(f"{API}/billing/status", timeout=15)
    assert r.status_code == 401


def test_billing_status_returns_user_billing(auth_header):
    """Test that billing status returns only the authenticated user's billing info."""
    r = requests.get(f"{API}/billing/status", headers=auth_header, timeout=15)
    assert r.status_code == 200
    data = r.json()
    # Should have billing fields
    assert "plan_type" in data
    assert "status" in data
    # Should be free by default
    assert data["plan_type"] in ["free", "pro", "lifetime"]


# ---------- Search Beyond 50 Items ----------
def test_search_works_beyond_50_items(auth_header):
    """Test that search works when user has more than 50 items."""
    # Create 60 simple text items
    created_ids = []
    for i in range(60):
        payload = {"text": f"TEST_SEARCH_ITEM_{i}: unique keyword {i % 10}"}
        r = requests.post(f"{API}/items/text", json=payload, headers=auth_header, timeout=30)
        assert r.status_code == 200
        item_id = r.json()["id"]
        created_ids.append(item_id)
        # Wait for ready
        final = wait_ready(item_id, auth_header, timeout=90)
        assert final["status"] == "ready"

    try:
        # Search for items with a specific keyword that should appear multiple times
        q = "unique keyword 5"
        r = requests.post(f"{API}/search", json={"query": q}, headers=auth_header, timeout=90)
        assert r.status_code == 200
        data = r.json()
        assert "results" in data
        # Should find at least some results (the keyword appears 6 times in 60 items)
        assert len(data["results"]) > 0
    finally:
        # Clean up
        for iid in created_ids:
            requests.delete(f"{API}/items/{iid}", headers=auth_header, timeout=15)


# ---------- Cancellation Security ----------
def test_unauthorized_cancellation_rejected():
    """Test that cancellation requires authentication."""
    r = requests.post(f"{API}/billing/cancel", timeout=15)
    assert r.status_code == 401
