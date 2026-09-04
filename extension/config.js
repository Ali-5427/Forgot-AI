// Set this to the backend URL used by the deployed environment.
export const BACKEND_URL = (typeof process !== "undefined" && process.env?.REACT_APP_BACKEND_URL) || "https://forgot-ai.onrender.com";
export const API = BACKEND_URL.replace(/\/+$/, "") + "/api";

// Resolve the signed-in account token:
// 1) a token stored in the extension (from sidebar sign-in), else
// 2) auto-pickup from the Forgot AI website if it's open and signed in.
export async function getToken() {
  const { token } = await chrome.storage.local.get("token");
  if (token) return token;
  try {
    const FRONTEND_URL = "https://forgot-ai.vercel.app";
    const tabs = await chrome.tabs.query({ url: FRONTEND_URL + "/*" });
    for (const t of tabs) {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: t.id },
        func: () => localStorage.getItem("forgot_ai_token"),
      });
      if (result) {
        await chrome.storage.local.set({ token: result });
        return result;
      }
    }
  } catch {
    /* no accessible Forgot AI tab */
  }
  return null;
}

export async function authHeaders(extra = {}) {
  const t = await getToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : { ...extra };
}

export async function signIn(email, password) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error("Invalid email or password");
  const d = await r.json();
  await chrome.storage.local.set({ token: d.token, refresh_token: d.refresh_token, email: d.user.email });
  return d;
}

export async function signOut() {
  const t = await getToken();
  if (t) {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${t}` } });
    } catch {
      /* ignore network errors on logout */
    }
  }
  await chrome.storage.local.remove(["token", "refresh_token", "email"]);
}
