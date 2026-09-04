import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken, getLibraryId } from "@/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

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
    } catch {
      setToken(null);
      setUser(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
    if (data.importable_count > 0) setImportPrompt({ count: data.importable_count });
    return data;
  };

  const register = async (email, password) => {
    const data = await api.register(email, password);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(false);
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
