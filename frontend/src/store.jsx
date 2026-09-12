import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/api";
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
    if (user) {
      loadItems();
    } else {
      setItems([]);
      setLoading(true);
    }
    return () => clearTimeout(timer.current);
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
