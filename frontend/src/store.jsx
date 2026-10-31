import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api, API, getToken, getCachedItems, setCachedItems, getCachedGroups, setCachedGroups } from "@/api";
import { toast } from "sonner";
import { useAuth } from "@/auth";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
  const { user } = useAuth();
  const [saveOpen, setSaveOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Instant Cache Hydration: Start with cached items & groups immediately (0ms First Paint)
  const [items, setItems] = useState(() => {
    const cached = getCachedItems();
    return Array.isArray(cached) ? cached : [];
  });
  
  const [groups, setGroups] = useState(() => {
    const cached = getCachedGroups();
    return Array.isArray(cached) ? cached : [];
  });
  
  // Only show initial skeleton if we have literally 0 items in local cache
  const [loading, setLoading] = useState(() => {
    const cached = getCachedItems();
    return !cached || cached.length === 0;
  });

  const timer = useRef(null);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    try {
      const g = await api.getGroups();
      setGroups(g);
      setCachedGroups(g);
    } catch (e) {}
  }, [user]);

  const loadItems = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.listItems();
      setItems(data);
      setCachedItems(data);
      const anyProcessing = data.some((i) => i.status === "processing");
      clearTimeout(timer.current);
      if (anyProcessing) timer.current = setTimeout(loadItems, 3500);
    } catch (err) {
      console.error("Failed to load items", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let ws = null;

    if (user) {
      // Revalidate in background silently while user already sees cached cards
      loadGroups();
      loadItems();
      
      // Connect to Live Sync WebSocket
      const token = getToken();
      if (token) {
        const wsUrl = API.replace(/^http/, "ws") + `/ws/sync?token=${token}`;
        ws = new WebSocket(wsUrl);
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "NEW_ITEM") {
              setItems((prev) => {
                // Ignore if we already have it to prevent duplicates
                if (prev.find((i) => i.id === data.item.id)) return prev;
                const next = [data.item, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setCachedItems(next);
                return next;
              });
            } else if (data.type === "ITEM_UPDATED") {
              setItems((prev) => {
                const next = prev.map((i) => (i.id === data.item.id ? data.item : i));
                setCachedItems(next);
                return next;
              });
            }
          } catch (err) {
            console.error("WebSocket message error", err);
          }
        };

        // Keep alive
        const interval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 30000);
        
        ws.onclose = () => clearInterval(interval);
      }
    } else {
      setItems([]);
      setLoading(true);
    }
    
    return () => {
      clearTimeout(timer.current);
      if (ws) ws.close();
    };
  }, [user, loadItems, loadGroups]);

  const openSave = () => setSaveOpen(true);
  const openImporter = () => setImporterOpen(true);
  const openItem = (item) => {
    setDetailId(typeof item === "string" ? item : item.id);
    setDetailOpen(true);
  };

  // Optimistic UI updates with cache sync
  const updateItemLocal = (id, updates) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, ...updates } : i));
      setCachedItems(next);
      return next;
    });
  };

  const deleteItemLocal = (id) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      setCachedItems(next);
      return next;
    });
  };

  const addGroupLocal = (group) => {
    setGroups((prev) => {
      const next = [...prev, group];
      setCachedGroups(next);
      return next;
    });
  };

  const updateGroupLocal = (id, updates) => {
    setGroups((prev) => {
      const next = prev.map((g) => (g.id === id ? { ...g, ...updates } : g));
      setCachedGroups(next);
      return next;
    });
  };

  const deleteGroupLocal = (id) => {
    setGroups((prev) => {
      const next = prev.filter((g) => g.id !== id);
      setCachedGroups(next);
      return next;
    });
  };

  const togglePin = async (item) => {
    const newPinned = !item.pinned;
    // 1. Optimistic Update (Immediate UI + cache)
    updateItemLocal(item.id, { pinned: newPinned });
    toast.success(newPinned ? "Pinned to top" : "Unpinned");
    
    try {
      // 2. Background Sync
      await api.pinItem(item.id, newPinned);
    } catch (err) {
      // 3. Rollback on failure
      updateItemLocal(item.id, { pinned: item.pinned });
      toast.error("Failed to pin item");
    }
  };

  return (
    <StoreContext.Provider
      value={{
        groups, reloadGroups: loadGroups,
        addGroupLocal, updateGroupLocal, deleteGroupLocal,
        saveOpen, setSaveOpen,
        importerOpen, setImporterOpen, openImporter,
        detailId, detailOpen, setDetailOpen,
        items, loading, reloadItems: loadItems,
        openSave, openItem,
        updateItemLocal, deleteItemLocal, togglePin
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
