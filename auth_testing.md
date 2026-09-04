# Auth Testing Playbook

## Overview
Forgot AI uses custom email/password auth with stateless JWT **Bearer tokens** (NOT cookies), because the same backend serves both the web app (cross-origin) and a browser extension. The token is sent in the `Authorization: Bearer <token>` header. Tokens embed a `tv` (token_version); logout increments the user's token_version, invalidating all existing tokens (web + extension).

## Endpoints (all under /api/auth)
- POST /api/auth/register {email,password}  -> {token, user}  (auto-imports the browser's anonymous library via X-Library-Id header)
- POST /api/auth/login {email,password}     -> {token, user, importable_count}
- POST /api/auth/logout   (Bearer)          -> {ok:true}  (increments token_version)
- GET  /api/auth/me       (Bearer)          -> user
- POST /api/auth/import {library_id} (Bearer)-> {imported: N}  (moves anon library items into the account)

## Library scoping
Every /api/items* , /api/search, /api/chat route resolves the "library" as:
- If a valid Bearer token is present -> library = that user's id (private per-user).
- Else -> library = X-Library-Id header (anonymous) or "default".
Isolation MUST be enforced server-side: user A's token can never list/get/search/ask/relate/edit/delete/open images of user B's items.

## Step 1: API smoke test
```
API=http://localhost:8001/api
# register A
TA=$(curl -s -X POST $API/auth/register -H "Content-Type: application/json" -d '{"email":"a@test.com","password":"passA123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
# me
curl -s $API/auth/me -H "Authorization: Bearer $TA"
# save under A
curl -s -X POST $API/items/text -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d '{"text":"A private note"}'
# register B, ensure B sees zero of A's items
TB=$(curl -s -X POST $API/auth/register -H "Content-Type: application/json" -d '{"email":"b@test.com","password":"passB123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s $API/items -H "Authorization: Bearer $TB"   # must be []
```

## Step 2: Isolation assertions
- B cannot GET A's item id (404), cannot search/chat A's content (empty), cannot related/edit/delete A's item (404), cannot open A's image file if it is not their own.

## Step 3: token_version / logout
- After POST /api/auth/logout with A's token, reusing A's old token returns 401.

## Notes for the test agent
- No cookies are used; always pass Authorization: Bearer.
- Enrichment is async ~15-25s; poll GET /api/items/{id} with the same Bearer until status=='ready'.
- Test accounts are seeded at startup; see /app/memory/test_credentials.md.
