# FORGOT AI V1 — COMPLETE TRUTH AUDIT

## 1. Executive Summary
Forgot AI V1 is a functional but feature-limited personal memory organizer. The core concept—saving highlighted text or manual text/images and having an LLM categorize and search them—is implemented and working. However, many advanced "capture" features (like saving tweets, ChatGPT conversations, or entire page screenshots automatically) are either completely commented out, partially implemented, or require manual user effort. The system relies heavily on Groq LLMs for processing and search, and Supabase for authentication and storage.

## 2. Current Architecture
*   **Frontend**: React Single Page Application (SPA) hosted independently (e.g. Vercel).
*   **Extension**: Chrome Extension (Manifest V3) using React for the Side Panel and Content Scripts for Highlight extraction.
*   **Backend**: Python FastAPI server.
*   **Database & Auth**: Supabase PostgreSQL + Supabase Auth + Supabase Storage.
*   **AI**: Groq API (using models like llama-3.1-70b-versatile and purportedly a Qwen model for vision).
*   **Search**: A brute-force LLM reranking approach (fetches the 50 most recent items from the DB and passes them all into the LLM prompt to score/return results). No vector embeddings are used.

## 3. Verified User Journeys
✅ **Journey A (Highlight Save)**:
User highlights text on any page -> Small "Forgot AI" pill appears -> User clicks it -> Content is saved optimisticly to the DB -> AI processes it in background -> Available in search.
✅ **Journey B (Manual Save via Sidebar)**:
User clicks extension icon -> Side panel opens -> User clicks "+" -> Types text or uploads image -> Clicks Save -> AI processes -> Available in search.
✅ **Journey C (Dashboard Chat)**:
User logs into website -> Clicks item -> Uses chat interface to ask questions about that specific item.
✅ **Journey D (Global Search)**:
User opens website -> Types query -> Backend fetches last 50 items and asks LLM to find matches -> Results displayed.

## 4. Feature Capabilities

### Exact Current Capture Types
| Capture Type | UI Exists? | Backend Exists? | Actually Works? | Tested? | Limitations | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Highlighted text | Yes | Yes | Yes | YES | Works well via popup pill | WORKING |
| Plain text | Yes | Yes | Yes | YES | Typed manually into the sidebar modal | WORKING |
| Webpage/link | Yes | Yes | Yes | YES | Can paste URL in modal. Backend fetches OG tags | WORKING |
| Full webpage | No | No | No | YES | Only extracts text manually highlighted | NOT IMPLEMENTED |
| Article | No | No | No | YES | genericArticle.ts adapter is commented out | BROKEN |
| X/Twitter post | No | No | No | YES | x.ts adapter exists but Mode B is disabled | BROKEN |
| ChatGPT response | No | No | No | YES | chatgpt.ts adapter exists but disabled | BROKEN |
| Claude response | No | No | No | YES | claude.ts exists but disabled | BROKEN |
| Gemini response | No | No | No | YES | gemini.ts exists but disabled | BROKEN |
| Perplexity response | No | No | No | YES | perplexity.ts exists but disabled | BROKEN |
| Screenshot | No | No | No | YES | No native screenshot API. Must save manually. | NOT IMPLEMENTED |
| Image upload | Yes | Yes | Yes | YES | Manual upload via sidebar modal works | WORKING |
| User-written note | Yes | Yes | Yes | YES | Optional note field exists in manual save | WORKING |
| Voice | No | No | No | YES | No voice recognition code exists | NOT IMPLEMENTED |

### Search / Retrieval Capabilities
*   **Keyword search**: Handled natively by the LLM prompt finding matches.
*   **Semantic search**: ⚠️ PARTIAL. It uses an LLM to judge "meaning", but it has NO vector embeddings.
*   **Scale Limitation**: 🔴 BROKEN. The backend strictly limits retrieval to the sort("created_at", -1).to_list(50). If you have 51 items, the oldest item is permanently unsearchable.
*   **Filters**: ❌ NOT IMPLEMENTED.
*   **Ranking**: ✅ WORKING (but limited to top 50 items via LLM).

### AI Capabilities
*   **Model**: Groq (Llama models and Qwen for vision).
*   **Title/Summary/Keywords Generation**: ✅ WORKING via enrich_item background task.
*   **Ask My Memory (Chat)**: ✅ WORKING. It injects the context of the item(s) into the LLM system prompt.
*   **Related Memories**: ⚠️ PARTIAL. Endpoint exists but it just calls the LLM search with the current item's keywords.
*   **Collections/Topics**: ❌ NOT IMPLEMENTED.

### Authentication & Database
*   **Auth**: ✅ WORKING (Supabase Auth, session tokens persist to extension).
*   **DB Model**: Single items table per user. RLS policies isolate data.
*   **Original Content**: ✅ Preserved in the database.
*   **Account Deletion**: ✅ WORKING (Added recently to UI, but backend deletion requires Supabase dashboard/email for now, no native DELETE /user route).

### Permissions (Chrome Extension)
*   storage: Used to store the session token.
*   sidePanel: Used to render the popup UI in the Chrome side panel.
*   <all_urls>: Required to inject the content script for Highlight Save.
*   *(Note: 	abs, ctiveTab, scripting were successfully removed and are not required).*

### Data & Privacy Handling
*   **Collected**: Email, saved text, URLs, uploaded images.
*   **Transmitted**: Sent to Supabase (storage) and Groq (AI).
*   **Analytics/Tracking**: None implemented. No cookies other than standard Supabase session management.

## 5. Website vs Real Product Mismatches

| Website Claim | Actual Implementation | Status | Required Action |
| :--- | :--- | :--- | :--- |
| "Drop a screenshot" | User must manually save/upload an image file. Extension cannot natively take screenshots. | ⚠️ PARTIAL | Clarify it's an image upload, not automatic |
| "Save Posts (Twitter/etc)" | The code for this (Mode B) is explicitly commented out and disabled. | 🔴 BROKEN | Remove claim or re-enable the code |
| "Search anything" | Search only looks at the 50 most recent items saved. | 🔴 BROKEN | Fix backend search limitation |
| "Semantic Search" | No vector database. Uses an LLM to read 50 items. | ⚠️ PARTIAL | Remove 'semantic' or clarify |
| "Collections/Topics" | Does not group items into collections dynamically. | ❌ NOT IMPLEMENTED | Remove claim |

## 6. Production Readiness
*   **A. Personal testing**: ✅ Ready.
*   **B. Small private beta**: ⚠️ Ready with limitations. The 50-item search limit will become apparent immediately.
*   **C. Public beta**: ❌ Not ready. Search architecture will collapse under heavy use and the 50-item limit breaks the core promise.
*   **D. Chrome Web Store submission**: ⚠️ Ready with limitations. The extension technically works and has compliant permissions, but marketing claims must be toned down.

## 7. Exact V1 Definition
✅ **Users can actually:**
- Install the extension and sign in.
- Highlight text on any page and click a pill to save it.
- Open the sidebar and manually type text or paste a URL.
- Open the sidebar and upload an image file.
- View a list of their saved items on the web dashboard.
- Chat with the AI about their saved items (Ask My Memory).

⚠️ **Limited:**
- Searching only scans the 50 most recently saved items.
- "Semantic" search is just an LLM reading JSON.

❌ **Users cannot currently:**
- Use one-click buttons to save tweets, articles, or AI chats (Code is disabled).
- Automatically capture screenshots of their active tab.
- Organize items into folders or collections.
- Delete their account directly via API (must email support).
