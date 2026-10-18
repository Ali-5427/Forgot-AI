import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken, setRefreshToken, getLibraryId } from "@/api";

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
  const [user, setUser] = useState(null); // null = checking, false = logged out, object = signed in
  const [importPrompt, setImportPrompt] = useState(null); // {count}

  const check = useCallback(async () => {
    if (!getToken()) {
      setUser(false);
      return;
    }
    try {
      const u = await api.me();
      setUser(u);
      broadcastAuthSync(getToken(), getRefreshToken(), u);
    } catch {
      setToken(null);
      setUser(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // Listen for extension handshake requests to sync existing session
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === "FORGOT_AI_REQUEST_SESSION" && user && getToken()) {
        broadcastAuthSync(getToken(), getRefreshToken(), user);
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
    broadcastAuthSync(data.token, data.refresh_token, data.user);
    if (data.importable_count > 0) setImportPrompt({ count: data.importable_count });
    return data;
  };

  const register = async (email, password) => {
    const data = await api.register(email, password);
    setToken(data.token);
    if (data.refresh_token) setRefreshToken(data.refresh_token);
    setUser(data.user);
    broadcastAuthSync(data.token, data.refresh_token, data.user);
    return data;
  };

  const logout = () => {
    // Instantly log out in the UI and inform extension
    setToken(null);
    setRefreshToken(null);
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

