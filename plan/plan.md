# Forgot AI — Deep Product Upgrade

Builds on the existing working MVP. Nothing that works today is removed; capture, AI enrichment, search, item detail, edit/delete, Ask AI, pin, collections and the extension all stay. This plan adds the remaining depth from the full product definition and closes the end-to-end loop: see → capture → understand → store → forget → describe → find → open → ask.

Still deliberately out of scope: login/signup, passwords, subscriptions/billing, teams, account management, marketing pages.

## 1. Private library per person (no login)
Today every visitor to the app shares one library. That changes: each browser gets its own private, anonymous library automatically — no signup, no password.

- A random anonymous library ID is created and stored in the browser the first time the app is opened, and silently attached to every request. Different testers on the same URL never see each other's memories.
- The extension links to the same library so saves made while browsing show up in the web app and vice-versa:
  - **Automatic**: when the Forgot AI website is open in the browser, the extension picks up that browser's library ID on its own (no code typing).
  - **Manual fallback**: Settings shows a short "library code"; it can be pasted into the extension if automatic linking isn't available.
- Structure is kept ready to attach real accounts later without reworking the data.

Assumption worth noting: this gives real per-browser isolation, but because there is no login it is not secure authentication — anyone with a browser's library code could load that library. Acceptable for the current no-login MVP.

## 2. Global memory chat (retrieval, not a chatbot)
A conversational way to interrogate the whole library: "Find my marketing ideas", "What did I save about AI coding?", "I remember saving something about student productivity — find it." It first finds the relevant saved memories, then answers grounded only in those, and shows the matching memory cards beside the answer; clicking one opens it. It will not answer from general knowledge or pretend to know things that aren't in the library.

Placement: added as an "Ask your memory" mode on the existing Search screen (a toggle between plain Search and Ask), so navigation stays Home / All Saved / Search / Settings.

## 3. Smarter search
Search stays natural-language and meaning-based, and additionally becomes:
- **Time-aware**: understands "today", "yesterday", "this week", "last month" and uses capture time to filter/rank. It won't invent exact dates it doesn't have.
- **Multi-signal ranking**: combines meaning, extracted text (incl. text read from images), title, keywords, category, source/domain and content type — and avoids surfacing items just because one generic word matched.
- Empty results say something useful ("Nothing relevant found — try describing it differently").

## 4. All Saved: lightweight filtering & sorting
Adds quick filters — All / Images / Text / Links / Recently saved — plus sort by newest or oldest. Keeps the existing Smart Collections (AI categories) and pin. No manual folder management.

## 5. Memory detail: related memories
Each opened memory gains a compact "Related memories" section that surfaces other saved items with similar meaning (e.g. opening a Claude coding screenshot suggests another coding article or dev-tool link). Clicking one opens it.

## 6. Duplicate awareness on save
When something substantially identical to an existing memory is saved (same URL, same text, or the same image), the app shows a gentle "Looks like you already saved this" with two choices: **Open existing** or **Save anyway**. It never auto-deletes or merges the user's content.

## 7. Capture, understanding & resilience (tightened across web + extension)
All five capture types — image/screenshot, text, URL, selected text, current page — create a normal memory in the shared library and carry source info (URL, page title, domain) and capture timestamp. Each is enriched into title, summary, key concepts, keywords, category and a searchable representation; images use both OCR text and visual meaning so they're findable without matching visible words. Original content is always preserved and never depends on AI succeeding. Save is instant with clear states: Saving… → Understanding… → Ready, or Processing failed → Retry. Failed URL extraction still saves the URL; failed image understanding keeps the image; retry recovers the item.

## 8. Extension depth
Right-side sidebar stays narrow and focused on Capture / Search / Open — not a general chatbot. Confirmed working actions: Save this page (URL + title + domain + page context), Save selected text (exact text + page context, also via right-click), Save screenshot (through the same image pipeline), Search your memory (compact results), Recent saves, and quiet "Saved to Forgot AI ✓" confirmation. Results and recent items open the corresponding memory in the web app. Uses the linked library from section 1.

## 9. Preserve the minimal look
Same restrained utility style — compact cards, clean type, subtle borders, simple status text, no giant heroes/gradients/decoration. Desktop-first with sensible responsive behavior.

## Acceptance
The full 32-step end-to-end scenario in the brief (website capture/enrich/search/ask/edit/delete, extension capture appearing and searchable in the web app, vague and time-based retrieval, AI-failure recovery, and separate anonymous libraries not exposing each other) is the bar this is verified against.
