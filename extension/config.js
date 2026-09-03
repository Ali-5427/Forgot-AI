// Set this to your Forgot AI backend URL (same as the web app).
export const BACKEND_URL = "https://instant-recall-8.preview.emergentagent.com";
export const API = BACKEND_URL + "/api";

// Resolve the browser's private library id.
// 1) use a manually-linked code if present, else
// 2) auto-detect by reading it from an open Forgot AI tab.
export async function getLibraryId() {
  const { libId } = await chrome.storage.local.get("libId");
  if (libId) return libId;
  try {
    const tabs = await chrome.tabs.query({ url: BACKEND_URL + "/*" });
    for (const t of tabs) {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: t.id },
        func: () => localStorage.getItem("forgot_ai_library"),
      });
      if (result) {
        await chrome.storage.local.set({ libId: result });
        return result;
      }
    }
  } catch (e) {
    /* no accessible Forgot AI tab */
  }
  return null;
}

export async function libHeaders(extra = {}) {
  const id = await getLibraryId();
  return id ? { ...extra, "X-Library-Id": id } : { ...extra };
}
