# 🔥 Forgot AI: Product Blueprint & Roadmap

## 🧠 Core Philosophy
**The Ultimate Metric:** "Did Forgot AI successfully give someone back something they thought they had forgotten?"
**The Goal:** Make Forgot AI useful enough that someone naturally wants to keep it installed. No manual organization. No folders. Just capture and retrieve.

---

## 🏗️ Current Architecture (What's Working)
- **Capture:** Chrome Extension (Side Panel & Floating Pill) easily saves text, URLs, and images.
- **Vision AI:** Groq (`qwen/qwen3.8-27b`) lightning-fast extraction of text from uploaded images.
- **Metadata AI:** Local Ollama model automatically generates Title, Summary, Categories, and Keywords.
- **Storage:** Supabase PostgreSQL database handling items and user authentication.
- **Frontend:** React UI with a beautiful, scrolling Memory Detail page, Original Source context, and related memory layout.

---

## ✅ Phase 1: Capture & Basic UI (COMPLETED)
- [x] **Source + Capture Context:** Automatically save URL, domain, and timestamp.
- [x] **Automatic AI Organization:** Zero manual tagging. AI handles Topics & Keywords.
- [x] **Excellent Memory Detail Page:** Clean UI, side-by-side layout, and easy copy/delete actions.
- [x] **Image Support:** Ability to drop images and extract text natively.

---

## 🚀 Phase 2: The Retrieval Engine (NEXT FOCUS)
*We do not move to Phase 3 until these are flawless.*

- [ ] **1. Semantic / Natural-Language Search (Priority: 10/10)**
  - Implement `pgvector` in Supabase.
  - Generate embeddings using Ollama (`nomic-embed-text`) when saving.
  - Allow searching by *meaning* (e.g., "What was that thing about getting first users?").
- [ ] **2. Ask My Memory (Priority: 10/10)**
  - Implement RAG (Retrieval-Augmented Generation).
  - Allow the user to chat with their memories in the side panel.
  - AI reads top 5 semantic search results and answers contextually.
- [ ] **3. "Why did I save this?" (Priority: 7/10)**
  - AI generates a 1-sentence explanation of why a link/text is valuable based on the user's history.
- [ ] **4. Basic People/Entity Memory (Priority: 7/10)**
  - Isolate names of people in the AI tagging so users can see all memories related to a specific person.
- [ ] **5. Favorites / Pin (Priority: 6/10)**
  - A simple ⭐ to mark high-priority saves.

---

## 🔮 Phase 3: Expansion (LATER)
- [ ] Mobile App (Capture from phone share sheet)
- [ ] WhatsApp Bot (Forward messages to save them)
- [ ] Memory Timeline View

---

## 🚨 The "Do NOT Build" Graveyard
*To protect the core product, we are strictly forbidden from building:*
❌ Complicated folders
❌ Kanban boards or task management
❌ Calendars
❌ Dashboards full of analytics
❌ Social collaboration features
❌ Huge knowledge graphs
