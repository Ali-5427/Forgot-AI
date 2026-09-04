// Set this to the backend URL used by the local or deployed environment.
export const BACKEND_URL = "http://localhost:8000";
export const API = BACKEND_URL + "/api";

// Resolve the signed-in account token:
// 1) a token stored in the extension (from sidebar sign-in), else
// 2) auto-pickup from the Forgot AI website if it's open and signed in.
export async function getToken() {
  const { token } = await chrome.storage.local.get("token");
  if (token) return token;
  try {
    const tabs = await chrome.tabs.query({ url: BACKEND_URL + "/*" });
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
  } catch (e) {
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
  await chrome.storage.local.set({ token: d.token, email: d.user.email });
  return d;
}

export async function signOut() {
  await chrome.storage.local.remove(["token", "email"]);
}
