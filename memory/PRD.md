# Forgot AI — PRD

## Problem statement
A personal memory system: "Save anything now. Find it later." Save screenshots, text and URLs; AI understands and organizes each item automatically; retrieve later with natural language. Main web app + Chrome extension sidebar sharing one per-browser library.

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), MongoDB, routes under `/api`. Async enrichment via BackgroundTasks.
- **AI**: Gemini 3.1 Pro (`gemini-3.1-pro-preview`) via `emergentintegrations` + `EMERGENT_LLM_KEY` — image OCR+meaning, text/URL understanding, time-aware multi-signal search ranking, grounded memory chat, per-item Q&A.
- **Storage**: Emergent object storage for original images; served via `/api/files/{path}`.
- **Frontend**: React (CRA), react-router, shadcn/ui, sonner. Minimal utility design (IBM Plex Sans/Mono).
- **Extension**: Chrome MV3 side panel in `/app/extension` (load unpacked); zip at `/app/forgot-ai-extension.zip`.
- **Identity**: NO login. Per-browser anonymous library via `X-Library-Id` header (localStorage key `forgot_ai_library`). Extension auto-links by reading it from an open Forgot AI tab, or manual paste of the library code from Settings. Not secure auth (documented), acceptable for no-login MVP.

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
- P1: pre-filter + LLM re-rank or embedding index (search/chat send up to 300 items to Gemini); combine chat's 2 LLM calls into 1.
- P2: async httpx for storage calls (currently sync requests in async handlers); Mongo index on (library_id,status); unique compound index (library_id,dedup_key) if strict dedup wanted; real accounts layered on top of library_id later.

## Out of scope (by user direction)
Login/signup, passwords, billing, teams, marketing pages, advanced settings.
