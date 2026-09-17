# Chrome Web Store Review Instructions

Hello Reviewer,

Forgot AI is a personal memory vault that allows users to save text and content from around the web to a personal, AI-organized database.

### How to Install and Test
1. Load the extension in Chrome.
2. The extension will automatically open the authentication page in a new tab: https://forgot-ai.vercel.app (or local auth page).
3. Sign up for a new account using any valid email address (email confirmation is not strictly required for testing if disabled, or use your own test email).

### Testing the Features

**1. Highlight Save (Mode A):**
- Go to any regular webpage (e.g., https://en.wikipedia.org/wiki/Artificial_intelligence).
- Highlight a sentence or paragraph.
- A floating "Save to Forgot AI" button will appear.
- Click it. It will say "Saving..." and then "✓ Saved to Forgot AI".

**2. Content Save (Mode B):**
- Go to https://chatgpt.com or https://twitter.com.
- Look at a specific message or post.
- You will see a "Save to Forgot AI" button injected alongside the native action buttons.
- Click it to save the content block automatically.

**3. Verification:**
- Click the extension icon to open the side panel or popup.
- You will see your saved items securely isolated to your account.

### Privacy and Permissions
- We require <all_urls> because the user can highlight and save text from literally any website they visit.
- We require storage for session persistence.
- We require 	abs to open the authentication page seamlessly.
- We require sidePanel to offer the chat/retrieval interface.
- No remote code is executed. All scripts are bundled.
