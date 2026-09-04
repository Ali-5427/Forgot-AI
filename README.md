# Forgot AI

A privacy-conscious personal memory app that lets you save text, URLs, and screenshots, then retrieve them later with natural-language search and AI-powered memory chat.

## Overview

Forgot AI helps you capture ideas, references, snippets, and saved web content in one place and find them later without remembering exact keywords. The app combines:

- AI enrichment of saved items
- semantic search over stored memories
- item detail views with summaries and metadata
- Chrome extension support for quick capture from the browser
- user/library isolation for multi-user and anonymous workflows

The product is designed as a personal knowledge layer: save anything now, find it later.

## What it does

- Save text snippets and long-form notes
- Save URLs with automatic metadata extraction
- Save screenshots and images with OCR-style analysis
- Enrich each item with title, summary, keywords, category, and searchable text
- Search by meaning instead of exact text matching
- Ask AI questions grounded in the saved library
- Pin important items and browse by recent or filtered views
- Use a Chrome sidebar extension for quick saving and search

## Architecture

### Frontend
- React app in [frontend](frontend)
- Built with CRA + Tailwind-like component system
- Main interface includes Home, Search, Settings, and item detail flows

### Backend
- FastAPI server in [backend/server.py](backend/server.py)
- MongoDB-backed storage and auth system
- REST API routes under /api
- AI enrichment runs asynchronously for saved items

### Browser extension
- Chrome MV3 extension in [extension](extension)
- Allows saving selected text, URLs, page content, and screenshots from the browser

### Supporting docs
- Product requirements: [memory/PRD.md](memory/PRD.md)
- Testing notes and verification: [test_reports](test_reports)

## AI model used

The application is using the Ollama vision model qwen3-vl:235b-instruct, specifically:

- Model name: qwen3-vl:235b-instruct
- Configured in the backend via the Ollama API route in [backend/server.py](backend/server.py)
- Uses the provided Ollama API key and the generate endpoint at https://ollama.com/api/generate

This model powers:

- metadata generation for saved content
- OCR/understanding for images
- semantic search and re-ranking
- grounded chat over a user’s saved library

## Tech stack

- Python: FastAPI, Pydantic, Motor/MongoDB
- Frontend: React, CRA, React Router, shadcn-inspired UI components
- Extension: Chrome MV3 side panel
- AI: Ollama qwen3-vl:235b-instruct
- Auth: JWT + bcrypt-based authentication flow
- Storage: object storage for uploaded images/files

## Repository structure

```text
Forgot-AI/
├── backend/
│   ├── auth.py
│   ├── requirements.txt
│   ├── server.py
│   └── tests/
├── extension/
│   ├── background.js
│   ├── config.js
│   ├── manifest.json
│   ├── sidepanel.html
│   ├── sidepanel.js
│   └── README.md
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── ...
├── memory/
│   └── PRD.md
├── plan/
│   └── plan.md
├── test_reports/
├── README.md
├── auth_testing.md
├── image_testing.md
├── test_result.md
└── tests/
```

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB instance
- Chrome browser for the extension
- An Ollama API key with access to qwen3-vl:235b-instruct

### 1) Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a .env file in the backend directory with values similar to:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=forgot_ai
OLLAMA_API_KEY=your_ollama_key_here
OLLAMA_BASE_URL=https://ollama.com/api/generate
INTEGRATION_PROXY_URL=https://integrations.emergentagent.com
```

Start the API:

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend setup

```bash
cd frontend
npm install
npm start
```

The frontend will connect to the backend API, typically on localhost:8000.

For AI configuration, the backend reads the Ollama key and endpoint from environment variables or falls back to the configured values in [backend/server.py](backend/server.py).

### 3) Chrome extension setup

1. Open Chrome and go to chrome://extensions
2. Enable Developer mode
3. Click Load unpacked
4. Select the [extension](extension) folder

## Typical usage flow

1. Open the app and create or use a library/session
2. Save a text snippet, URL, or screenshot
3. Wait for AI enrichment to finish
4. Search by natural-language prompts like “ideas about AI coding” or “that Claude feature I saved last week”
5. Open any item to view summary, metadata, keywords, and related memories
6. Ask AI a question grounded in your saved history

## Notes

- The app supports both anonymous libraries and authenticated user accounts depending on the current flow
- Search and chat are grounded in the active library context
- Some AI processing is asynchronous, so item status may begin as processing before transitioning to ready

## License

This project does not currently declare a specific license. If you are publishing or distributing it, confirm the intended licensing before external use.

## Contributing

Contributions are welcome. For meaningful changes, it is recommended to:

- review the product requirements in [memory/PRD.md](memory/PRD.md)
- run backend tests before submitting changes
- validate frontend behavior after UI changes

## Summary

Forgot AI is a fast, practical memory assistant for saving and retrieving useful digital information with AI assistance. The core intelligence in the app is qwen3-vl:235b-instruct via Ollama, which powers enrichment, image understanding, search, and memory-grounded chat.
