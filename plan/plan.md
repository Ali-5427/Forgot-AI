# Forgot AI — Login & Multi-User Release

Turn the current no-login Forgot AI into a real multi-user product. Each person gets their own private account and their own memory library. The product itself — save (image/text/URL), AI understanding, search, time-aware search, Ask your memory, item detail, Ask AI, edit, delete, pin, Smart Collections, related memories, duplicate detection, and the browser extension — stays exactly as it is today. The only new work is accounts and per-user privacy.

## What changes for the user

### Accounts (email + password)
- Sign up with email and password, log in, log out.
- The session stays signed in across page reloads and browser restarts until the user logs out.
- The website now opens to a simple sign-up / log-in screen. Once signed in, the app looks and works exactly as it does now, showing only that user's library.
- Clear, plain error messages for: wrong password, unknown/invalid login, duplicate email on sign-up, expired or logged-out session, and unauthorized access.
- Auth screens reuse the existing minimal Forgot AI look — no marketing pages, no onboarding, no redesign.

### Private, per-user libraries
- Every memory belongs to exactly one user. All operations — save, list, get, search, Ask your memory, memory chat, edit, delete, pin, collections, related memories, duplicate detection, and everything the extension does — only ever touch the signed-in user's memories.
- Isolation is enforced on the server, not just hidden in the UI: a direct API call from one account cannot list, read, search, ask about, relate, duplicate-match, edit, delete, or open the images of another account's memories. Search ranking and the AI's context are built only from the current user's memories.

### Keeping memories already saved before login
- When someone signs up, the memories currently saved in that browser (its anonymous library) are automatically moved into the new account.
- When someone logs in on a browser that still has unclaimed anonymous memories, they're offered a one-time choice: **Import these memories into my account** or **leave them out**. Nothing is moved silently and nothing is deleted.
- The old shared/global demo library (the pre-existing "default" pile that was visible to everyone) is intentionally never imported into any account, and one user's memories are never moved into another user's account.

### Browser extension
- The extension works with the signed-in account. When the user is logged in on the Forgot AI website, the extension uses that same account automatically; a simple sign-in inside the sidebar is also available as a fallback.
- When not signed in, the sidebar shows a plain "Sign in to Forgot AI" state with a button to sign in. When signed in, it shows the account is connected.
- All extension actions (search, save page, save selected text, save screenshot, recent saves, open memory) use the signed-in user's library. It remembers the session so the user doesn't sign in every time.
- The old browser "library code" linking stops being the primary identity for signed-in users; the account is the source of truth.

### Log out
- Logging out ends the website session and also stops the extension's stored session from reaching the account — on both surfaces. Memories are never deleted on logout.

### Settings
- Settings shows the current account (email) and a Log out action. No other account-management features are added.

## Decisions and assumptions (worth a look before approving)

1. **The website now requires an account to use.** The previous "just start using it with no login" mode is replaced by a sign-in gate, which is what a shareable multi-user product needs. Anyone's earlier anonymous memories are still recoverable through the import flow above.

2. **"Forgot password" via email is deferred this release.** Secure email/password and JWT sessions are in scope, but a self-service password-reset email requires adding an email-sending service, which this app does not currently have and which the brief says not to add. So there is no working "email me a reset link" for end users yet. If you'd rather ship real password reset now, that means adding an email provider — say so and it will be included.

3. **Existing memories that aren't tied to any browser session won't automatically appear** for a new account. Only the memories from the browser a person signs up/logs in on are offered for import; the shared "default" demo pile stays out on purpose.

4. **Two test accounts (User A and User B)** will be created to prove isolation end-to-end at the API level (each cannot see, search, ask about, relate to, duplicate-match, modify, delete, or open the other's memories or images), including via the extension.

## Out of scope (unchanged from the brief)
No billing, subscriptions, teams, collaboration, social features, reminders, new AI features, or new search features. No product redesign. Nothing existing is removed.
