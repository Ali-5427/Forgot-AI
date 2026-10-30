// Service worker: routes SAVE_MEMORY messages, opens auth tab.
import { api } from "../lib/api";
import { CONFIG } from "../lib/config";
import type {
  ExtMessage,
  SaveResponse,
  GetAuthResponse,
} from "../lib/messages";
import { getSession, setSession, clearSession } from "../lib/storage";

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const s = await getSession();
    if (!s) {
      chrome.tabs.create({ url: `${CONFIG.APP_URL}/login?source=extension` });
    }
  }
});

// Allow the side panel to open when clicking the extension icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

chrome.runtime.onMessage.addListener((msg: ExtMessage, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "SAVE_MEMORY") {
        const session = await getSession();
        if (!session) {
          const resp: SaveResponse = {
            ok: false,
            error: "Not signed in. Click the Forgot AI icon to sign in.",
            unauthenticated: true,
          };
          sendResponse(resp);
          return;
        }
        // 1. INSTANTLY tell the Content Script it was successful!
        sendResponse({
          ok: true,
          memory: { id: "optimistic" } as any,
          deduped: false,
        });

        // 2. Do the slow API call in the background without awaiting it.
        api.createMemory(msg.payload).catch((e: any) => {
          console.error("Background save failed:", e);
        });
        return;
      }
      if (msg.type === "OPEN_AUTH_TAB") {
        chrome.tabs.create({ url: `${CONFIG.APP_URL}/login?source=extension` });
        sendResponse({ ok: true });
        return;
      }
      if (msg.type === "OPEN_SIDE_PANEL") {
        if (_sender.tab?.id) {
          (chrome as any).sidePanel?.open?.({ tabId: _sender.tab.id })?.catch?.(console.error);
        }
        sendResponse({ ok: true });
        return;
      }
      if (msg.type === "SYNC_AUTH_FROM_WEB") {
        const existing = await getSession();
        const incomingUserId = msg.payload?.user?.id;
        const incomingEmail = msg.payload?.user?.email;

        // If the user changed (e.g. user switched accounts on the website),
        // clear conversation ID, cached memories, and old storage entries.
        if (existing?.user?.id && incomingUserId && existing.user.id !== incomingUserId) {
          console.log(`[Forgot AI Auth] Switching account from ${existing.user.email} to ${incomingEmail}`);
          await chrome.storage.local.remove(["extension_conv_id", "forgot_ai_library"]);
        }

        await setSession({
          token: msg.payload.token,
          refresh_token: msg.payload.refresh_token,
          user: {
            id: msg.payload.user.id,
            email: msg.payload.user.email,
            created_at: msg.payload.user.created_at || new Date().toISOString(),
          },
        });
        sendResponse({ ok: true });
        return;
      }
      if (msg.type === "CLEAR_AUTH_FROM_WEB") {
        await clearSession();
        await chrome.storage.local.remove(["extension_conv_id", "forgot_ai_library"]);
        sendResponse({ ok: true });
        return;
      }
      if (msg.type === "GET_AUTH_STATUS") {
        const s = await getSession();
        const resp: GetAuthResponse = s
          ? { authenticated: true, email: s.user.email }
          : { authenticated: false };
        sendResponse(resp);
        return;
      }
      if (msg.type === "GET_FULL_SESSION") {
        const s = await getSession();
        sendResponse({ ok: true, session: s });
        return;
      }
    } catch (e: any) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true; // keep channel open for async response
});

