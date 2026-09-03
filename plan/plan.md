# Forgot AI — Build Plan

A personal memory system: **save anything now, find it later.** Save screenshots, text, and links; AI understands and organizes each item automatically; retrieve later using natural language. Ships as a main web app plus a browser-extension sidebar, both reading/writing the same shared personal library (no login for now).

## Decisions (confirmed)
- **AI engine:** Gemini 3.1 Pro — handles image "seeing" (OCR + meaning), text/URL understanding, and search ranking.
- **Access:** No login. One shared personal library. The extension talks to the same library automatically.

## What gets built

### 1. Save (fast, no manual organizing)
Three save types, each returning immediately and enriching in the background:
- **Image / screenshot** — upload a file; original image is preserved and stored.
- **Text** — paste or type any text.
- **URL** — paste a link; the app attempts to fetch the page title and readable content. If the page can't be fetched, the URL is still saved and remains usable.

For every save the AI auto-generates: **title, short summary, keywords, category**, plus a searchable representation. The user never has to pick a folder, tag, title, or category. All of these are editable later.

### 2. AI understanding
- Images: extract readable text AND understand what the image is about, so both the literal text and the meaning are searchable (e.g. a Claude Code screenshot is found by "Claude", "AI coding", "that Claude feature I saved").
- Text & URLs: summarized, keyworded, and categorized the same way.
- If enrichment fails, the original content is kept, the item shows a "processing failed" state, and a **Retry** action is offered. Saving never fails because AI enrichment failed.

### 3. Search (the most important feature)
- A single natural-language search box. No exact keywords required.
- Understands meaning and returns the most relevant saved items, ranked by relevance, with a short "why it matched" note when useful.
- Handles queries like "that AI coding tool I saw last week", "the screenshot about Claude", "my SaaS distribution idea", "things I saved about marketing".

### 4. Item detail + Ask AI
Opening any item shows the original content, AI summary, metadata/keywords/category, and (for URLs) a link to open the original. From here the user can:
- **Edit** title, summary, category, keywords (original content stays intact).
- **Delete** with a confirmation step.
- **Ask AI** questions about that specific item ("What is this?", "Why did I save this?", "Explain simply", "Key points", "How can I use this?").

### 5. Memory chat (retrieval, not a generic chatbot)
A natural-language chat over the whole library that finds and presents relevant saved items ("Find the marketing ideas I saved", "Which saved items mention Claude?"). It exists to retrieve and explain saved memory, not to be an open-ended assistant.

### 6. Main app layout
Minimal, utility-first. A clean home screen leading with the name **Forgot AI**, a prominent "Search anything you've saved…" box, a clear Save action, and a list of recent saved items. Each card shows title, preview, content type, short AI description, date, and category/keywords. Minimal navigation: **Home / All Saved / Search / Settings** — nothing more. Empty state for new users: "Save your first thing — screenshots, text and links you want to remember later," with a clear Save action.

### 7. Browser extension (right-side sidebar)
A narrow, unobtrusive right-side panel injected into the current page. Header **Forgot AI**, a "Search your memory…" box, and quick actions:
- **Save this page** — captures the current URL + available page context.
- **Save selected text** — saves highlighted text with page URL/title.
- **Save screenshot** — capture/save an image through the same AI understanding flow.

Below the actions: a compact **Recent saves** list; clicking an item opens its details. After any save, a small inline confirmation ("Saved to Forgot AI ✓") — no big popups. Everything saved here appears in the main app and is searchable there, and vice-versa.

> Note: browser extensions are installed manually in the browser (via developer mode) — they are not something the preview URL runs on its own. The extension files will be delivered ready to load, with brief load instructions. Its search/save actions call the same live backend as the web app.

## Design
Minimal and practical — a serious utility, not a marketing site. Compact clean cards, clear typography, subtle borders, restrained spacing, an obvious search field, simple "Understanding… / Saving…" status text, no large illustrations, heavy gradients, or decorative sections. Desktop-optimized main app; the extension sidebar is tuned for narrow width and stays readable.

## Assumptions
- No user accounts; a single shared library is used everywhere. This can be upgraded to multi-user login later.
- Screenshot "capture" in the extension is provided as an image save/upload path (browsers restrict silent full-page capture); uploaded/captured images run through the same AI understanding.
- Search and Ask-AI use the confirmed Gemini model; costs draw from the Emergent universal key balance.

## Success criterion (verified end to end)
Save a screenshot, save text, save a URL → AI understands each → search each by natural language and get the right result → open an item → ask AI about it → save something from a webpage via the extension → see it in the main app → find it again by search. All of this must actually work, not just render as screens.

## Not included (deliberately)
Login/accounts, marketing pages, advanced settings, folders/manual organization, fake or placeholder buttons, and any feature that doesn't directly serve save-quickly / understand-automatically / find-easily.
