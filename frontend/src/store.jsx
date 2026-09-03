import { createContext, useContext, useState } from "react";
import { api } from "@/api";
import { toast } from "sonner";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
  const [saveOpen, setSaveOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openSave = () => setSaveOpen(true);
  const openItem = (item) => {
    setDetailId(typeof item === "string" ? item : item.id);
    setDetailOpen(true);
  };
  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const togglePin = async (item) => {
    await api.pinItem(item.id, !item.pinned);
    toast.success(item.pinned ? "Unpinned" : "Pinned to top");
    bumpRefresh();
  };

  return (
    <StoreContext.Provider
      value={{ saveOpen, setSaveOpen, detailId, detailOpen, setDetailOpen, refreshKey, openSave, openItem, bumpRefresh, togglePin }}
    >
      {children}
    </StoreContext.Provider>
  );
};
