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
      if (msg.type === "SYNC_AUTH_FROM_WEB") {
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
    } catch (e: any) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true; // keep channel open for async response
});

