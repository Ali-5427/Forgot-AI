import { createContext, useContext, useState } from "react";

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

  return (
    <StoreContext.Provider
      value={{ saveOpen, setSaveOpen, detailId, detailOpen, setDetailOpen, refreshKey, openSave, openItem, bumpRefresh }}
    >
      {children}
    </StoreContext.Provider>
  );
};
