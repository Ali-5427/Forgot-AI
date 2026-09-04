import { API, authHeaders, getToken } from "./config.js";

// Open the side panel when the toolbar icon is clicked.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Right-click "Save selection to Forgot AI"
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "forgot-save-selection",
    title: "Save selection to Forgot AI",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "forgot-save-selection" && info.selectionText) {
    const token = await getToken();
    if (!token) return; // must be signed in
    await fetch(`${API}/items/text`, {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ text: info.selectionText, source_url: tab?.url, source_title: tab?.title }),
    });
  }
});
