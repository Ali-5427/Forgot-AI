import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken, getRefreshToken, setRefreshToken, getLibraryId, getCachedUser, setCachedUser, clearAppCache } from "@/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function broadcastAuthSync(token, refreshToken, user) {
  if (typeof window !== "undefined" && token && user) {
    const sessionPayload = {
      token,
      refresh_token: refreshToken || undefined,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at || new Date().toISOString(),
      },
    };

    // 1. Post message to extension content scripts
    window.postMessage(
      {
        type: "FORGOT_AI_AUTH_SYNC",
        session: sessionPayload,
      },
      "*"
    );

    // 2. DOM bridge for zero-latency synchronous sync
    try {
      if (document.documentElement) {
        document.documentElement.setAttribute(
          "data-forgot-ai-session",
          JSON.stringify(sessionPayload)
        );
      }
    } catch (e) {
      console.warn("Could not set data-forgot-ai-session attribute:", e);
    }
  }
}

function broadcastAuthLogout() {
  if (typeof window !== "undefined") {
    window.postMessage({ type: "FORGOT_AI_AUTH_LOGOUT" }, "*");
    try {
      if (document.documentElement) {
        document.documentElement.removeAttribute("data-forgot-ai-session");
      }
    } catch (e) {}
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (getToken()) {
      return getCachedUser();
    }
    return false;
  });
  const [importPrompt, setImportPrompt] = useState(null); // {count}

  // Synchronously set DOM attribute and broadcast immediately if we have a cached session
  useEffect(() => {
    const t = getToken();
    const u = getCachedUser();
    if (t && u) {
      broadcastAuthSync(t, getRefreshToken(), u);
    }
  }, []);

  const check = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(false);
      setCachedUser(null);
      return;
    }
    try {
      const u = await api.me();
      setUser(u);
      setCachedUser(u);
      broadcastAuthSync(getToken(), getRefreshToken(), u);
    } catch (err) {
      // ONLY invalidate if server explicitly returned 401 (auth failure)
      if (err?.response?.status === 401) {
        setToken(null);
        setRefreshToken(null);
        setCachedUser(null);
        setUser(false);
        broadcastAuthLogout();
      } else {
        // Network timeout / temporary server lag — preserve cached session
        console.warn("Could not reach auth server, keeping cached session:", err?.message);
        const cached = getCachedUser();
        if (cached) {
          setUser(cached);
          broadcastAuthSync(getToken(), getRefreshToken(), cached);
        }
      }
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // Listen for extension handshake requests to sync current session (One-way: Web -> Extension)
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === "FORGOT_AI_REQUEST_SESSION") {
        const t = getToken();
        const u = user || getCachedUser();
        if (t && u && typeof u === "object") {
          broadcastAuthSync(t, getRefreshToken(), u);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [user]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.token);
    if (data.refresh_token) setRefreshToken(data.refresh_token);
    setUser(data.user);
    setCachedUser(data.user);
    broadcastAuthSync(data.token, data.refresh_token, data.user);
    if (data.importable_count > 0) setImportPrompt({ count: data.importable_count });
    return data;
  };

  const register = async (email, password) => {
    const data = await api.register(email, password);
    setToken(data.token);
    if (data.refresh_token) setRefreshToken(data.refresh_token);
    setUser(data.user);
    setCachedUser(data.user);
    broadcastAuthSync(data.token, data.refresh_token, data.user);
    return data;
  };

  const logout = () => {
    // Instantly log out in the UI and inform extension
    setToken(null);
    setRefreshToken(null);
    setCachedUser(null);
    setUser(false);
    clearAppCache();
    broadcastAuthLogout();
    
    // Fire and forget the backend invalidation
    api.logout().catch(() => {});
  };

  const confirmImport = async (doImport) => {
    const p = importPrompt;
    setImportPrompt(null);
    if (doImport && p) {
      await api.importLibrary(getLibraryId());
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, importPrompt, confirmImport }}>
      {children}
    </AuthContext.Provider>
  );
};
