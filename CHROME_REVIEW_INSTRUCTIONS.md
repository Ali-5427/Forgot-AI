# Chrome Web Store Review Instructions

Hello Reviewer,

Forgot AI is a personal memory vault that allows users to save text snippets, links, and notes from around the web to a personal, AI-organized database.

### How to Install and Test
1. Load the unpacked extension in Chrome.
2. The extension will automatically open the authentication page: https://forgot-ai.vercel.app/login?source=extension.
3. Sign in to an existing account or register for a free account.

### Testing the Features

**1. One-Click Highlight Save:**
- Open any webpage containing text (e.g., https://en.wikipedia.org/wiki/Artificial_intelligence).
- Highlight any sentence or paragraph.
- A floating "Save to Forgot AI" button appears near the selection.
- Click it. It will show "Saving..." and then transition to "✓ Saved to Forgot AI".

**2. Side Panel & Memory Retrieval:**
- Click the Forgot AI extension icon in the Chrome toolbar to open the Side Panel.
- You will see your saved items securely isolated to your account.
- Use the input box to ask questions or search your saved memories in natural language.
- You can also manually paste links, add notes, or upload an image note using the '+' button.

### Privacy and Permissions Justification
- `<all_urls>`: Strictly required so the user can highlight and save text snippets from any website across the web. No browsing history or webpage content is read, monitored, or transmitted until the user explicitly selects text and clicks the "Save" button.
- `storage`: Required for local session management and user settings persistence.
- `sidePanel`: Required to render the personal memory vault and chat interface directly in Chrome's side panel.
- `tabs`: Required to open the login and authentication page when the user needs to sign in.
- No remote code is executed. All scripts, styles, and assets are locally bundled within the extension package.
