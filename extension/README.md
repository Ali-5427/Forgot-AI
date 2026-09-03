# Forgot AI — Browser Extension

A narrow right-side sidebar to save pages, selected text and screenshots to your Forgot AI memory without leaving the current page.

## Install (Chrome / Edge)
1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this `extension` folder
4. Click the Forgot AI toolbar icon to open the side panel

## Configure
The backend URL lives in `config.js`. It's already set to the current Forgot AI backend. If you deploy the app elsewhere, update `BACKEND_URL` there.

## Features
- **Search your memory** — type a query and press Enter (semantic search)
- **Save this page** — saves the current tab's URL (backend fetches page content)
- **Save selected text** — saves highlighted text with page context (also available via right-click)
- **Save screenshot** — captures the visible tab and runs it through AI understanding
- **Recent saves** — click any card to open it in the main app

Everything saved here appears in the main web app and vice-versa (shared library).
