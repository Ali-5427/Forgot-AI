# LEGAL REVIEW

A. Facts verified from code:
- Users intentionally save content via Extension and Web app (Highlight save, specific blocks).
- Extension requires <all_urls> to inject the "Save" button into any site the user highlights text on.
- Extension does NOT use activeTab or scripting permissions.
- Saved content is associated directly with an authenticated user (via Supabase Auth).
- No cookies are used for third-party advertising or cross-site tracking. Supabase uses local storage/session cookies strictly for authentication.
- Saved content is processed via Groq for AI metadata generation.

B. Facts verified from current website:
- Previous claims included "Drop a link, a screenshot, or a note".
- SaveDialog supports Text, URL, and Image/Screenshot uploads.
- The footer claims "Private to your account" which is accurate (backend enforces user_id matching).

C. Third-party services found:
- Supabase (Database, Auth)
- Vercel (Frontend Hosting)
- Render (Backend Hosting)
- Groq (AI Processing)

D. Data categories found:
- Account email
- Saved text / images / links
- Source URLs & Page titles
- AI-generated metadata (titles, summaries, entity tags)

E. Retention behavior found:
- Data is retained indefinitely while the account is active.

F. Account deletion behavior found:
- Currently, users can delete individual memories. Full account deletion is manual via support email (support@forgot-ai.vercel.app). Documented in the Data Deletion page.

G. Exact claims that are safe to make:
- "Private to your account."
- "Save text, URLs, and screenshots."
- "Natural language search via AI."

H. Claims that must NOT be made:
- "Zero tracking" (we use Supabase auth tracking).
- "Military-grade encryption".

I. Missing legal/business information that I must provide:
- Physical business address or registered entity name (currently operating as "Forgot AI"). If a formal entity exists, it should replace "Forgot AI" in the privacy/terms pages.

J. Items that should be reviewed by a qualified lawyer if appropriate:
- Applicability of GDPR/CCPA based on the userbase.
- Liability regarding third-party content that users upload.
