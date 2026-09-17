# Chrome Web Store Privacy Mapping

- Single purpose: A personal memory vault to save text and content from the web.
- Permissions: storage (for session management), sidePanel (for UI).
- Host permissions: <all_urls> (required to inject the "Save to Forgot AI" button seamlessly when text is highlighted on any webpage).
- Website content access: The extension accesses website content strictly when the user initiates a save action (e.g., highlighting text and clicking Save). It does not passively track or harvest browsing history.
- Personal information: Email address is collected for account authentication.
- Authentication/session data: Managed securely via Supabase.
- Data transmitted to backend: Selected text, source URL, page title, and user notes.
- AI processing: Saved text is processed via Groq API (server-side) to generate search metadata.
- Third-party services: Supabase, Render, Vercel, Groq.
- Data sharing: No data is sold or shared with advertisers.
- Privacy policy URL: https://forgot-ai.vercel.app/privacy
- Support URL: https://forgot-ai.vercel.app/contact
