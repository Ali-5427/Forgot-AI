import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider, useStore } from "@/store";
import { Layout } from "@/components/Layout";
import { SaveDialog } from "@/components/SaveDialog";
import { ItemDetailDialog } from "@/components/ItemDetailDialog";
import Home from "@/pages/Home";
import AllSaved from "@/pages/AllSaved";
import SearchPage from "@/pages/SearchPage";
import Settings from "@/pages/Settings";

function GlobalDialogs() {
  const { saveOpen, setSaveOpen, detailId, detailOpen, setDetailOpen, bumpRefresh, openItem } = useStore();
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const openId = params.get("open");
    if (openId) {
      openItem(openId);
      params.delete("open");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <SaveDialog open={saveOpen} onOpenChange={setSaveOpen} onSaved={() => bumpRefresh()} />
      <ItemDetailDialog
        itemId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChanged={() => bumpRefresh()}
      />
    </>
  );
}

function App() {
  return (
    <div className="App">
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/all" element={<AllSaved />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
          <GlobalDialogs />
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </StoreProvider>
    </div>
  );
}

export default App;
