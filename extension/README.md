# Forgot AI — Browser Extension

A narrow right-side sidebar to save pages, selected text and screenshots to your Forgot AI account without leaving the current page.

## Install (Chrome / Edge)
1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this `extension` folder
4. Click the Forgot AI toolbar icon to open the side panel

## Sign in
The extension uses your Forgot AI account:
- If you're already signed in to the Forgot AI website in this browser, the sidebar picks up that account automatically.
- Otherwise, sign in right inside the sidebar (email + password). Your session is remembered.
- Click the account line in the header to sign out. Logging out on the website also ends the extension's session.

## Configure
The backend URL lives in `config.js` and defaults to `http://localhost:8000` for local development. Update `BACKEND_URL` before loading the extension against a deployed API.

## Features
- **Search your memory** — type a query and press Enter (semantic search)
- **Save this page** / **Save selected text** (also via right-click) / **Save screenshot**
- **Recent saves** — click any card to open it in the main app

Everything saved here belongs to your signed-in account and appears in the main web app (and vice-versa).
