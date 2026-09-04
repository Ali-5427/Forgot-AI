# Forgot AI — PRD

## Problem statement
A personal memory system: "Save anything now. Find it later." Save screenshots, text and URLs; AI understands and organizes each item automatically; retrieve later with natural language. Main web app + Chrome extension sidebar sharing one per-browser library.

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), Supabase PostgreSQL, routes under `/api`. Async enrichment via BackgroundTasks.
- **AI**: qwen3-vl:235b-instruct via Ollama at `https://ollama.com/api/generate` with the configured API key — image OCR+meaning, text/URL understanding, time-aware multi-signal search ranking, grounded memory chat, per-item Q&A.
- **Storage**: private Supabase Storage for original images; served via `/api/files/{path}`.
- **Frontend**: React (CRA), react-router, shadcn/ui, sonner. Minimal utility design (IBM Plex Sans/Mono).
- **Extension**: Chrome MV3 side panel in `/app/extension` (load unpacked); zip at `/app/forgot-ai-extension.zip`.
- **Identity**: Supabase Auth email/password accounts with Bearer access tokens. Anonymous pre-signup libraries remain available through `X-Library-Id` and can be imported into an account.

## Data model (SavedItem)
id, library_id, content_type (image|text|url), original_text, source_url, source_title, source_domain, image_path, title, summary, keywords[], category, extracted_text, searchable_text, dedup_key, status (processing|ready|failed), pinned, created_at. Original content always preserved.

## Implemented
### 2026-09-03 — MVP
Save (text/url/image) with async AI enrichment + failed/Retry state; natural-language semantic search with "why matched"; item detail (view original + AI metadata, edit, delete w/ confirm, Ask AI); Home/All Saved/Search/Settings; empty state. Chrome extension sidebar (save page/selection/screenshot, search, recent). Pin + This Week + Smart Collections.

### 2026-09-03 — Deep upgrade
- Per-browser private anonymous libraries (X-Library-Id scoping on every route; full isolation verified).
- Global memory chat `/api/chat` — grounded ONLY in that library's saved items; returns answer + matching cards. Exposed as Ask/Search toggle on the Search screen.
- Smarter search: time-aware (today/this week/last month) + multi-signal ranking (meaning, extracted text, title, keywords, category, domain, type); useful empty state.
- All Saved: type filters (All/Images/Text/Links), Recently saved, sort newest/oldest, kept Smart Collections + pin.
- Related memories on item detail (`/api/items/{id}/related`, overlap-ranked, library-scoped).
- Duplicate awareness on save (`/api/items/check`): "Looks like you already saved this" → Open existing / Save anyway (text hash, URL normalization, image sha256).
- Extension linked to the per-browser library (auto + manual code).
Verified end-to-end: 26/26 backend tests + all frontend flows, 100%.

## Backlog (P1/P2, deliberately deferred — not over-engineering)
- P1: pre-filter + LLM re-rank or embedding index (search/chat send up to 300 items to the model); combine chat's 2 LLM calls into 1.
- P2: async httpx for URL and Ollama calls; stronger server-side deduplication and signed short-lived file URLs.

## Out of scope (by user direction)
Billing, teams, marketing pages, advanced settings, and Mongo-to-Supabase data backfill.

### 2026-09-04 — Login & multi-user release
- Email/password accounts with JWT **Bearer** tokens (no cookies; works for web + extension). `auth.py` (bcrypt hashing, token create/decode); `token_version` on each user so logout invalidates all outstanding tokens on every surface.
- Routes `/api/auth/register|login|me|logout|import`; brute-force lockout on login; seeded test users usera@/userb@forgot.ai.
- **Strict per-user isolation** via `resolve_library` dependency: Bearer → user's private library (=user id), else anonymous `X-Library-Id`. Every items/search/chat/related/files query includes library_id, so cross-account access naturally 404s. Verified end-to-end (24/24).
- Import flow: register auto-imports the browser's anonymous library; login offers a one-time choice (`import-prompt`). Guards: never imports the shared "default" pile, never steals another user's library.
- Frontend: `AuthProvider` + `AuthGate` (sign-in/create-account gate), token in localStorage `forgot_ai_token`, session persists across reload, 401 auto-logout, Settings shows account email + Log out. Images fetched via `/api/files/{path}?token=`.
- Extension: signs in with the account (auto-pickup from an open Forgot AI tab, or sidebar sign-in fallback), signed-out state, remembers session; logout on web invalidates the extension token.
- Deferred (stated): self-service password reset (needs an email provider, intentionally not added).

## Auth-release backlog (P2, deferred hardening — not over-engineering)
- Read X-Forwarded-For for real per-IP login throttle; TTL index on login_attempts.
- Signed short-lived file URLs instead of ?token= query (avoid token in logs).
- Split server.py into modules; async httpx for storage; pre-filter+rerank or embeddings for search; unique index on (library_id, dedup_key).
