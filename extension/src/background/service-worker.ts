// Service worker: routes SAVE_MEMORY messages, opens auth tab, handles shortcuts & side panel.
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

// -----------------------------------------------------------------------------
// Chrome Keyboard Shortcuts (Alt+S, Alt+P)
// -----------------------------------------------------------------------------
chrome.commands?.onCommand?.addListener(async (command) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    if (command === "open-panel") {
      try {
        await (chrome as any).sidePanel?.open?.({ tabId: tab.id });
      } catch {
        if (tab.windowId) {
          await (chrome as any).sidePanel?.open?.({ windowId: tab.windowId });
        }
      }
    } else if (command === "save-page") {
      // Ask content script to trigger dock save animation & toast
      chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_DOCK_SAVE" }).catch(async () => {
        // Fallback save in background if content script is not running on this tab
        const session = await getSession();
        if (session && tab.url) {
          try {
            await api.createMemory({
              capture_type: "content",
              original_content: tab.title || tab.url,
              source_url: tab.url,
              source_title: tab.title || "",
              source_domain: new URL(tab.url).hostname,
            });
          } catch (e) {
            console.error("Background fallback save failed:", e);
          }
        }
      });
    }
  } catch (err) {
    console.error("Error handling shortcut command:", err);
  }
});

// -----------------------------------------------------------------------------
// Message Router
// -----------------------------------------------------------------------------
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

        try {
          const memory = await api.createMemory(msg.payload);
          sendResponse({
            ok: true,
            memory,
            deduped: Boolean((memory as any)?.deduped),
          });
        } catch (err: any) {
          console.error("Background save failed:", err);
          sendResponse({
            ok: false,
            error: err?.message || "Failed to save memory to server.",
          });
        }
        return;
      }
      if (msg.type === "OPEN_AUTH_TAB") {
        chrome.tabs.create({ url: `${CONFIG.APP_URL}/login?source=extension` });
        sendResponse({ ok: true });
        return;
      }
      if (msg.type === "OPEN_SIDE_PANEL") {
        let tabId = _sender.tab?.id;
        if (!tabId) {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          tabId = activeTab?.id;
        }
        if (tabId) {
          try {
            await (chrome as any).sidePanel?.open?.({ tabId });
          } catch (err) {
            console.warn("sidePanel.open by tabId failed, falling back to windowId:", err);
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab?.windowId) {
              await (chrome as any).sidePanel?.open?.({ windowId: activeTab.windowId });
            }
          }
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
