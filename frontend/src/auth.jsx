import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken, setRefreshToken, getLibraryId, getCachedUser, setCachedUser } from "@/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function broadcastAuthSync(token, refreshToken, user) {
  if (typeof window !== "undefined" && token && user) {
    window.postMessage(
      {
        type: "FORGOT_AI_AUTH_SYNC",
        session: {
          token,
          refresh_token: refreshToken || undefined,
          user: {
            id: user.id,
            email: user.email,
            created_at: user.created_at || new Date().toISOString(),
          },
        },
      },
      "*"
    );
  }
}

function broadcastAuthLogout() {
  if (typeof window !== "undefined") {
    window.postMessage({ type: "FORGOT_AI_AUTH_LOGOUT" }, "*");
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

  const check = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(false);
      setCachedUser(null);
      // Proactively ask extension if it already has a session
      if (typeof window !== "undefined") {
        window.postMessage({ type: "FORGOT_AI_REQUEST_SESSION_FROM_EXT" }, "*");
      }
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
      } else {
        // Network timeout / temporary server lag — preserve cached session
        console.warn("Could not reach auth server, keeping cached session:", err?.message);
        const cached = getCachedUser();
        if (cached) {
          setUser(cached);
        }
      }
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // Listen for extension handshake requests to sync existing session in both directions
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === "FORGOT_AI_REQUEST_SESSION" && user && getToken()) {
        broadcastAuthSync(getToken(), getRefreshToken(), user);
      } else if (e.data?.type === "FORGOT_AI_EXT_SYNC_SESSION" && e.data?.session?.token) {
        const s = e.data.session;
        setToken(s.token);
        if (s.refresh_token) setRefreshToken(s.refresh_token);
        if (s.user) {
          setUser(s.user);
          setCachedUser(s.user);
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

