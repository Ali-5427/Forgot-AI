export interface Session {
  token: string;
  refresh_token?: string;
  user: { id: string; email: string; created_at: string };
}

const KEY = "forgot_ai_session";

const hasChromeStorage = () =>
  typeof chrome !== "undefined" && !!chrome.storage?.local;

export async function getSession(): Promise<Session | null> {
  if (hasChromeStorage()) {
    const res = await chrome.storage.local.get(KEY);
    return (res[KEY] as Session) || null;
  }
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function setSession(session: Session): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [KEY]: session });
    return;
  }
  localStorage.setItem(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.remove(KEY);
    return;
  }
  localStorage.removeItem(KEY);
}

export function onSessionChange(cb: (s: Session | null) => void): () => void {
  if (!hasChromeStorage() || !chrome.storage?.onChanged) return () => {};
  const listener = (
    changes: { [k: string]: chrome.storage.StorageChange },
    area: string
  ) => {
    if (area === "local" && changes[KEY]) {
      cb((changes[KEY].newValue as Session) || null);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export interface ProPass {
  plan_type: string;
  status: string;
  has_access: boolean;
  current_period_end?: string | null;
  cached_at?: number;
}

const PRO_PASS_KEY = "forgot_ai_pro_pass";

export async function getProPass(): Promise<ProPass | null> {
  if (hasChromeStorage()) {
    const res = await chrome.storage.local.get(PRO_PASS_KEY);
    return (res[PRO_PASS_KEY] as ProPass) || null;
  }
  try {
    const raw = localStorage.getItem(PRO_PASS_KEY);
    return raw ? (JSON.parse(raw) as ProPass) : null;
  } catch {
    return null;
  }
}

export async function setProPass(pass: ProPass): Promise<void> {
  const data = { ...pass, cached_at: Date.now() };
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [PRO_PASS_KEY]: data });
    return;
  }
  localStorage.setItem(PRO_PASS_KEY, JSON.stringify(data));
}

export async function clearProPass(): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.remove(PRO_PASS_KEY);
    return;
  }
  localStorage.removeItem(PRO_PASS_KEY);
}
