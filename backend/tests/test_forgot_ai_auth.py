"""Auth + per-user isolation + import flow tests for Forgot AI (iteration 3)."""
import os
import io
import time
import uuid
import pytest
import requests
from PIL import Image, ImageDraw

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL')
            or open('/app/frontend/.env').read().split('REACT_APP_BACKEND_URL=')[1].splitlines()[0]).rstrip('/')
API = f"{BASE_URL}/api"

USER_A = {"email": "usera@forgot.ai", "password": "TestPassA123"}
USER_B = {"email": "userb@forgot.ai", "password": "TestPassB123"}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _hdr(tok, extra=None):
    h = {"Authorization": f"Bearer {tok}"}
    if extra:
        h.update(extra)
    return h


def _wait_ready(item_id, tok, timeout=60):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        r = requests.get(f"{API}/items/{item_id}", headers=_hdr(tok), timeout=20)
        if r.status_code == 200:
            last = r.json()
            if last.get("status") in ("ready", "failed"):
                return last
        time.sleep(3)
    return last


# ---------- AUTH BACKEND ----------
class TestAuth:
    def test_register_new(self):
        email = f"test_{uuid.uuid4().hex[:8]}@forgot.ai"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "abc123"}, timeout=20)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "token" in j and "user" in j and "imported" in j
        assert j["user"]["email"] == email
        assert j["imported"] == 0

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json=USER_A, timeout=20)
        assert r.status_code == 400
        assert "exists" in r.text.lower()

    def test_register_short_password(self):
        r = requests.post(f"{API}/auth/register",
                          json={"email": f"z_{uuid.uuid4().hex[:6]}@x.com", "password": "12345"}, timeout=20)
        assert r.status_code == 400

    def test_login_ok(self):
        r = requests.post(f"{API}/auth/login", json=USER_A, timeout=20)
        assert r.status_code == 200
        j = r.json()
        assert "token" in j and "user" in j and "importable_count" in j
        assert j["user"]["email"] == USER_A["email"]

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": USER_A["email"], "password": "WrongPass999"}, timeout=20)
        assert r.status_code == 401
        assert "invalid" in r.text.lower()

    def test_login_unknown_email(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": f"nope_{uuid.uuid4().hex[:6]}@x.com", "password": "abc123"}, timeout=20)
        assert r.status_code == 401

    def test_me_requires_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self):
        tok = _login(**USER_B)
        r = requests.get(f"{API}/auth/me", headers=_hdr(tok), timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == USER_B["email"]

    def test_logout_invalidates_token(self):
        # register a fresh user to avoid impacting shared A/B tokens across tests
        email = f"lo_{uuid.uuid4().hex[:8]}@forgot.ai"
        reg = requests.post(f"{API}/auth/register", json={"email": email, "password": "abc123"}, timeout=20).json()
        tok = reg["token"]
        r = requests.post(f"{API}/auth/logout", headers=_hdr(tok), timeout=15)
        assert r.status_code == 200 and r.json().get("ok") is True
        # same token must now be rejected
        r2 = requests.get(f"{API}/auth/me", headers=_hdr(tok), timeout=15)
        assert r2.status_code == 401
        r3 = requests.get(f"{API}/items", headers=_hdr(tok), timeout=15)
        assert r3.status_code == 401


# ---------- ISOLATION ----------
@pytest.fixture(scope="module")
def tokens_and_item():
    tokA = _login(**USER_A)
    tokB = _login(**USER_B)
    # Save an item under A
    r = requests.post(f"{API}/items/text",
                      headers=_hdr(tokA),
                      json={"text": f"TEST_ISO_A private note {uuid.uuid4().hex[:6]} about quantum computing at Zurich"},
                      timeout=30)
    assert r.status_code == 200
    a_item = r.json()
    # let it enrich briefly (needed for search/related/chat)
    _wait_ready(a_item["id"], tokA, timeout=60)
    yield {"tokA": tokA, "tokB": tokB, "a_id": a_item["id"], "a_image": None}
    try:
        requests.delete(f"{API}/items/{a_item['id']}", headers=_hdr(tokA), timeout=10)
    except Exception:
        pass


class TestIsolation:
    def test_b_list_excludes_a(self, tokens_and_item):
        r = requests.get(f"{API}/items", headers=_hdr(tokens_and_item["tokB"]), timeout=15)
        assert r.status_code == 200
        ids = [i["id"] for i in r.json()]
        assert tokens_and_item["a_id"] not in ids

    def test_b_get_a_item_404(self, tokens_and_item):
        r = requests.get(f"{API}/items/{tokens_and_item['a_id']}",
                         headers=_hdr(tokens_and_item["tokB"]), timeout=15)
        assert r.status_code == 404

    def test_b_put_a_item_404(self, tokens_and_item):
        r = requests.put(f"{API}/items/{tokens_and_item['a_id']}",
                         headers=_hdr(tokens_and_item["tokB"]), json={"title": "hacked"}, timeout=15)
        assert r.status_code == 404

    def test_b_delete_a_item_404(self, tokens_and_item):
        r = requests.delete(f"{API}/items/{tokens_and_item['a_id']}",
                            headers=_hdr(tokens_and_item["tokB"]), timeout=15)
        assert r.status_code == 404

    def test_b_pin_a_item_404(self, tokens_and_item):
        r = requests.post(f"{API}/items/{tokens_and_item['a_id']}/pin",
                          headers=_hdr(tokens_and_item["tokB"]), json={"pinned": True}, timeout=15)
        assert r.status_code == 404

    def test_b_retry_a_item_404(self, tokens_and_item):
        r = requests.post(f"{API}/items/{tokens_and_item['a_id']}/retry",
                          headers=_hdr(tokens_and_item["tokB"]), timeout=15)
        assert r.status_code == 404

    def test_b_ask_a_item_404(self, tokens_and_item):
        r = requests.post(f"{API}/items/{tokens_and_item['a_id']}/ask",
                          headers=_hdr(tokens_and_item["tokB"]), json={"question": "what?"}, timeout=15)
        assert r.status_code == 404

    def test_b_related_a_item_404(self, tokens_and_item):
        r = requests.get(f"{API}/items/{tokens_and_item['a_id']}/related",
                         headers=_hdr(tokens_and_item["tokB"]), timeout=15)
        assert r.status_code == 404

    def test_b_search_never_returns_a(self, tokens_and_item):
        r = requests.post(f"{API}/search",
                          headers=_hdr(tokens_and_item["tokB"]),
                          json={"query": "quantum computing Zurich"}, timeout=90)
        assert r.status_code == 200
        ids = [x["id"] for x in r.json().get("results", [])]
        assert tokens_and_item["a_id"] not in ids

    def test_b_chat_never_returns_a(self, tokens_and_item):
        r = requests.post(f"{API}/chat",
                          headers=_hdr(tokens_and_item["tokB"]),
                          json={"query": "quantum computing Zurich"}, timeout=90)
        assert r.status_code == 200
        ids = [x["id"] for x in r.json().get("results", [])]
        assert tokens_and_item["a_id"] not in ids

    def test_image_file_scoped_to_owner(self, tokens_and_item):
        tokA = tokens_and_item["tokA"]
        tokB = tokens_and_item["tokB"]
        img = Image.new("RGB", (100, 100), (255, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        files = {"file": ("iso.png", buf.getvalue(), "image/png")}
        r = requests.post(f"{API}/items/image", headers=_hdr(tokA), files=files, timeout=60)
        assert r.status_code == 200
        img_item = r.json()
        path = img_item["image_path"]
        # A with A's token can fetch
        ra = requests.get(f"{API}/files/{path}", params={"token": tokA}, timeout=20)
        assert ra.status_code == 200
        # B with B's token must NOT
        rb = requests.get(f"{API}/files/{path}", params={"token": tokB}, timeout=20)
        assert rb.status_code == 404
        # no token/lib should not work either
        rn = requests.get(f"{API}/files/{path}", timeout=20)
        assert rn.status_code == 404
        # cleanup
        requests.delete(f"{API}/items/{img_item['id']}", headers=_hdr(tokA), timeout=10)


# ---------- IMPORT FLOW ----------
class TestImportFlow:
    def test_register_auto_imports_anon_lib(self):
        anon_lib = f"anon_{uuid.uuid4().hex[:10]}"
        # save 2 anon items
        for txt in ["TEST_IMPORT anon note one", "TEST_IMPORT anon note two"]:
            r = requests.post(f"{API}/items/text",
                              headers={"X-Library-Id": anon_lib},
                              json={"text": txt}, timeout=20)
            assert r.status_code == 200
        # register a new account with that lib header
        email = f"imp_{uuid.uuid4().hex[:8]}@forgot.ai"
        r = requests.post(f"{API}/auth/register",
                          headers={"X-Library-Id": anon_lib},
                          json={"email": email, "password": "abc123"}, timeout=20)
        assert r.status_code == 200
        j = r.json()
        assert j["imported"] == 2
        tok = j["token"]
        r2 = requests.get(f"{API}/items", headers=_hdr(tok), timeout=15)
        assert r2.status_code == 200
        titles = " ".join(i.get("original_text") or "" for i in r2.json())
        assert "anon note one" in titles and "anon note two" in titles

    def test_login_importable_count_and_import_endpoint(self):
        anon_lib = f"anon_{uuid.uuid4().hex[:10]}"
        for txt in ["TEST_IMPORT2 alpha", "TEST_IMPORT2 beta", "TEST_IMPORT2 gamma"]:
            r = requests.post(f"{API}/items/text",
                              headers={"X-Library-Id": anon_lib},
                              json={"text": txt}, timeout=20)
            assert r.status_code == 200
        # login with header to get importable_count
        r = requests.post(f"{API}/auth/login",
                          headers={"X-Library-Id": anon_lib},
                          json=USER_A, timeout=20)
        assert r.status_code == 200
        j = r.json()
        assert j["importable_count"] == 3
        tok = j["token"]
        r2 = requests.post(f"{API}/auth/import",
                           headers=_hdr(tok),
                           json={"library_id": anon_lib}, timeout=20)
        assert r2.status_code == 200
        assert r2.json()["imported"] == 3
        # cleanup — remove the 3 imported items
        listing = requests.get(f"{API}/items", headers=_hdr(tok), timeout=15).json()
        for it in listing:
            if (it.get("original_text") or "").startswith("TEST_IMPORT2"):
                requests.delete(f"{API}/items/{it['id']}", headers=_hdr(tok), timeout=10)

    def test_import_default_returns_zero(self):
        tok = _login(**USER_A)
        r = requests.post(f"{API}/auth/import", headers=_hdr(tok),
                          json={"library_id": "default"}, timeout=15)
        assert r.status_code == 200 and r.json()["imported"] == 0

    def test_import_other_users_id_returns_zero(self):
        # login as A, discover B's id
        tokB = _login(**USER_B)
        b_id = requests.get(f"{API}/auth/me", headers=_hdr(tokB), timeout=10).json()["id"]
        tokA = _login(**USER_A)
        r = requests.post(f"{API}/auth/import", headers=_hdr(tokA),
                          json={"library_id": b_id}, timeout=15)
        assert r.status_code == 200 and r.json()["imported"] == 0
