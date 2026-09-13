import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api, API, getToken } from "@/api";
import { toast } from "sonner";
import { useAuth } from "@/auth";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
  const { user } = useAuth();
  const [saveOpen, setSaveOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Global items cache
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);

  const loadItems = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.listItems();
      setItems(data);
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
                if (prev.find(i => i.id === data.item.id)) return prev;
                return [data.item, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
              });
            } else if (data.type === "ITEM_UPDATED") {
              setItems((prev) => prev.map(i => i.id === data.item.id ? data.item : i));
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
  }, [user, loadItems]);

  const openSave = () => setSaveOpen(true);
  const openItem = (item) => {
    setDetailId(typeof item === "string" ? item : item.id);
    setDetailOpen(true);
  };

  // Optimistic UI updates
  const updateItemLocal = (id, updates) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const deleteItemLocal = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const togglePin = async (item) => {
    const newPinned = !item.pinned;
    // 1. Optimistic Update
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
        saveOpen, setSaveOpen,
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
