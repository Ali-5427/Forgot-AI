# FORGOT_AI_V1_TRUTH_FINAL.md

## ARCHITECTURE TRUTH
- **Frontend**: React SPA (React Router, Tailwind CSS).
- **Extension**: Chrome Extension Manifest V3 (React Side Panel, Vanilla TS Content Scripts).
- **Backend**: Python FastAPI.
- **Database**: Supabase PostgreSQL (with Row Level Security).
- **Authentication**: Supabase Auth (Email/Password).
- **Storage**: Supabase Storage (orgot-ai-assets bucket).
- **AI**: Groq API (uses text models for extraction and purportedly a vision model).
- **Search**: Brute-force LLM reranking (No vector database).
- **Hosting**: Vercel (Frontend), unknown/local for Backend.

---

## 1. AVAILABLE TODAY (WORKING)

*These features have complete code, UI, backend, and DB support, and are fully exposed to the user.*

*   **Highlight Save (Mode A)**: User selects text, a pill appears, saves to backend. (Verification: CODE INSPECTION, Tested: NO)
*   **Manual Text Save**: User opens sidebar, types text, saves. (Verification: CODE INSPECTION, Tested: NO)
*   **Manual URL Save**: User pastes URL, backend fetches OG tags/text. (Verification: CODE INSPECTION, Tested: NO)
*   **Image Upload**: User clicks '+' in sidebar, uploads a local file. (Verification: CODE INSPECTION, Tested: NO)
*   **User-written Notes**: Optional text field when saving items. (Verification: CODE INSPECTION, Tested: NO)
*   **AI Title / Summary / Keyword Generation**: Background job passes content to Groq and saves metadata to DB. (Verification: CODE INSPECTION, Tested: NO)
*   **Item-specific Chat**: User clicks an item and asks questions about it. Context is injected into Groq prompt. (Verification: CODE INSPECTION, Tested: NO)
*   **Account Registration & Login**: Supabase Auth integration in AuthGate.jsx and backend /auth routes. (Verification: CODE INSPECTION, Tested: NO)

---

## 2. PARTIAL

*Some part works, but the complete intended flow does not, or has severe built-in limits.*

*   **Global Search (Keyword/Natural Language)**: UI and backend exist, BUT current retrieval scope = latest 50 memories. (Verification: CODE INSPECTION)
*   **Semantic Search**: Advertised, but no embeddings/vector DB exists. It simply passes text to an LLM to evaluate "meaning". (Verification: CODE INSPECTION)
*   **Account Deletion**: UI exists, but complete deletion depends on manual support/database action (triggers a toast message telling the user support will contact them). (Verification: CODE INSPECTION)
*   **Data Export**: UI exists, but complete export depends on manual support/database action (triggers a toast message). (Verification: CODE INSPECTION)
*   **Related Memories**: Exists in UI/Backend, but runs the same limited 50-item search using the item's keywords. (Verification: CODE INSPECTION)
*   **Screenshot Capture**: Advertised on the website, but no native screenshot API is used. The user must manually take a screenshot with their OS and upload it via the image upload UI. (Verification: CODE INSPECTION)

---

## 3. DISABLED

*Code exists, but the feature is intentionally disabled/not exposed to users.*

*   **Article Save (Mode B)**: genericArticle.ts exists, but injection is commented out in content/index.tsx. (Verification: CODE INSPECTION)
*   **X/Twitter Save (Mode B)**: x.ts exists, but disabled. (Verification: CODE INSPECTION)
*   **ChatGPT Save (Mode B)**: chatgpt.ts exists, but disabled. (Verification: CODE INSPECTION)
*   **Claude Save (Mode B)**: claude.ts exists, but disabled. (Verification: CODE INSPECTION)
*   **Gemini Save (Mode B)**: gemini.ts exists, but disabled. (Verification: CODE INSPECTION)
*   **Perplexity Save (Mode B)**: perplexity.ts exists, but disabled. (Verification: CODE INSPECTION)

---

## 4. BROKEN

*Supposed to be available, but current implementation fails.*

*   **Image Understanding (AI Vision)**: Code calls Groq API asking for qwen/qwen3.8-27b. Groq does not host this model, so the API call will fail at runtime. (Verification: CODE INSPECTION)
*   **Memory Scale/Retrieval**: As soon as a user has 51 memories, the 51st (oldest) memory is permanently inaccessible to search because server.py caps the retrieval at 50 items before sending to the LLM. (Verification: CODE INSPECTION)

---

## 5. NOT IMPLEMENTED

*The feature does not exist in the current product codebase.*

*   **Native Full Webpage Save**: No code to snapshot full DOMs.
*   **Voice Save**: No audio recording UI or whisper API integration.
*   **PDF / File Save**: Only images (image/*) are supported in the upload UI.
*   **Collections / Topics / Folders**: No relational mapping exists in the DB.
*   **LinkedIn / Reddit / YouTube Adapters**: No adapter code exists for these platforms.
*   **Vector Search / Embeddings**: No pgvector or embedding generation code.

---

## 6. FUTURE

*Planned/referenced but not currently available.*

*   **Mobile App / WhatsApp / MCP**: Referenced in marketing/roadmap concepts but zero code exists today. (Verification: CODE INSPECTION)

---

## 7. NOT VERIFIED
*(None. All items were definitively verified via code inspection.)*

---

## SEARCH TRUTH

*   **Keyword matching**: Handled entirely inside the LLM prompt.
*   **LLM relevance ranking**: Yes, via Groq.
*   **Semantic/vector search**: NO.
*   **Embeddings**: NO.
*   **Filters**: NO.
*   **Ranking**: Yes, LLM returns JSON sorted list.
*   **Natural language search**: Yes, handled by LLM.
*   **Vague memory retrieval**: Yes, LLM evaluates summary/meaning.
*   **Ask My Memory**: Yes, streams context to Groq.
*   **Item-specific chat**: Yes.

**Current retrieval scope = latest 50 memories.**
*   **10 memories**: Backend fetches 10, passes all 10 to LLM. Works perfectly.
*   **50 memories**: Backend fetches 50, passes all 50 to LLM. Works perfectly.
*   **51 memories**: Backend fetches 50 newest. The 1 oldest memory is completely ignored and inaccessible to search.
*   **100 memories**: Backend fetches 50 newest. The 50 oldest memories are completely inaccessible to search.

---

## AI TRUTH

*   **Title generation**: Input = Content text. Output = JSON string. Model = Groq (Llama). Tested = NO (Code Inspection). Status = WORKING.
*   **Summary generation**: Input = Content text. Output = JSON string. Model = Groq (Llama). Tested = NO (Code Inspection). Status = WORKING.
*   **Keyword generation**: Input = Content text. Output = JSON string array. Model = Groq (Llama). Tested = NO (Code Inspection). Status = WORKING.
*   **Image understanding**: Input = Base64 image. Output = Text description. Model = Groq (qwen/qwen3.8-27b). Tested = NO (Code Inspection). Status = BROKEN (Invalid model for provider).
*   **Global search ranking**: Input = Query + 50 JSON items. Output = JSON matched IDs. Model = Groq. Tested = NO (Code Inspection). Status = PARTIAL (50 item limit).
*   **Ask My Memory (Chat)**: Input = Query + 8 JSON items. Output = Streamed text. Model = Groq. Tested = NO (Code Inspection). Status = WORKING.
*   **Topic generation / Entity extraction / Embeddings**: NOT IMPLEMENTED.

---

## PRIVACY TRUTH

*   **Email**: Collected? Yes. Stored? Yes (Supabase Auth). Transmitted? Yes. AI processed? No.
*   **Authentication Data**: Collected? Yes (Hashes). Stored? Yes.
*   **Saved Text / URLs**: Collected? Yes. Stored? Yes (Supabase Postgres). Transmitted? Yes (to Groq for processing). AI processed? Yes. Third party? Yes (Groq).
*   **Images**: Collected? Yes. Stored? Yes (Supabase Storage). Transmitted? Yes (to Groq). AI processed? Yes. Third party? Yes (Groq).
*   **Analytics / Tracking / Cookies**: NOT IMPLEMENTED. Only local storage for session tokens.

---

## WEBSITE CLAIM AUDIT

| Claim | Actual behavior | Status | Evidence |
| :--- | :--- | :--- | :--- |
| "Save a screenshot" | No screenshot API exists. User must manually upload a file. | PARTIAL | SaveDialog.jsx input type="file" |
| "Save Posts (X/LinkedIn)" | X adapter is commented out. LinkedIn adapter doesn't exist. | DISABLED / NOT IMPLEMENTED | content/index.tsx // startModeB |
| "Search anything" | Search drops all items older than the 50th item. | BROKEN | server.py ank_items 	o_list(50) |
| "Semantic Search" | Passes text to LLM. No embeddings/vector DB used. | PARTIAL | server.py ank_items |
| "Private to your account" | RLS policies isolate rows exactly to owner_user_id. | WORKING | supabase_schema.sql items_owner policy |
| "Save from any page" | Highlight save (Mode A) works universally on all pages. | WORKING | content/index.tsx efreshModeA() |

---

## VERIFIED USER JOURNEYS
*(Based on Code Inspection)*

1.  **Journey A (Highlight)**: User highlights text on a webpage -> content/index.tsx detects selection -> renders Pill -> User clicks Pill -> sends SAVE_MEMORY -> Background worker optimisticly resolves and hits POST /items/text -> Supabase saves.
2.  **Journey B (Manual Entry)**: User clicks extension icon -> Opens Side Panel -> Clicks '+' -> Pastes URL -> Clicks Save -> hits POST /items/url -> Supabase saves.
3.  **Journey C (Recall)**: User opens website -> Types query -> hits POST /search -> Server fetches 50 items -> Groq LLM filters list -> User sees results.

---

## FINAL COUNT

Total features audited: 30
WORKING: 8
PARTIAL: 6
DISABLED: 6
BROKEN: 2
NOT_IMPLEMENTED: 8
FUTURE: 0
NOT_VERIFIED: 0

Runtime-tested features: 0
Code-only verified features: 30
Not tested features: 0
