# Forgot AI — PRD

## Problem statement
A personal memory system: "Save anything now. Find it later." Users save screenshots, text and URLs; AI automatically understands and organizes each item; users retrieve items later with natural-language search. Ships as a main web app + a Chrome browser-extension sidebar sharing one library.

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), MongoDB. Routes under `/api`. AI enrichment runs in BackgroundTasks.
- **AI**: Gemini 3.1 Pro (`gemini-3.1-pro-preview`) via `emergentintegrations` + `EMERGENT_LLM_KEY`. Handles image OCR+meaning, text/URL understanding, semantic search ranking, and per-item Q&A.
- **Storage**: Emergent object storage for original images; served via `/api/files/{path}`.
- **Frontend**: React (CRA), react-router, shadcn/ui, sonner. Minimal utility design (IBM Plex Sans/Mono).
- **Extension**: Chrome MV3 side panel in `/app/extension` (load unpacked), talks to same backend.
- **Auth**: none — single shared library (by design).

## Data model (SavedItem)
id, content_type (image|text|url), original_text, source_url, source_title, image_path, title, summary, keywords[], category, extracted_text, searchable_text, status (processing|ready|failed), created_at. Original content always preserved; AI fills metadata.

## Implemented (2026-09-03)
- Save flows: text, URL (fetches page title/content, never fails), image upload (stored + enriched).
- Async AI enrichment (~15-25s) with failed-state + Retry.
- Natural-language semantic search with relevance ranking + "why matched".
- Item detail: view original + AI metadata, edit (title/summary/category/keywords), delete (confirm), Ask AI (quick + custom).
- Home / All Saved / Search / Settings navigation; empty state.
- Chrome extension sidebar: search, save page, save selected text (+ right-click), save screenshot, recent saves, inline "Saved ✓" confirmation.
- Verified end-to-end via testing agent: 14/14 backend + frontend flows, 100%.

## Backlog (P1/P2)
- P1: Vector/embedding search + pre-filtering as library grows (current search sends up to 300 items to Gemini).
- P2: Multi-user auth if ever needed; automatic (non-manual) enrichment retry; URL validation.
