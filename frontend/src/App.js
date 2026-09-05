import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StoreProvider, useStore } from "@/store";
import { AuthProvider, useAuth } from "@/auth";
import { Layout } from "@/components/Layout";
import { SaveDialog } from "@/components/SaveDialog";
import { ItemDetailDialog } from "@/components/ItemDetailDialog";
import AuthGate from "@/pages/AuthGate";
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
      <SaveDialog open={saveOpen} onOpenChange={setSaveOpen} onSaved={() => bumpRefresh()} onOpenExisting={(id) => openItem(id)} />
      <ItemDetailDialog itemId={detailId} open={detailOpen} onOpenChange={setDetailOpen} onChanged={() => bumpRefresh()} />
    </>
  );
}

function ImportPrompt() {
  const { importPrompt, confirmImport } = useAuth();
  const { bumpRefresh } = useStore();
  const open = !!importPrompt;

  const handle = async (doImport) => {
    await confirmImport(doImport);
    if (doImport) bumpRefresh();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent data-testid="import-prompt">
        <AlertDialogHeader>
          <AlertDialogTitle>Import saved memories?</AlertDialogTitle>
          <AlertDialogDescription>
            This browser has {importPrompt?.count} memor{importPrompt?.count === 1 ? "y" : "ies"} saved before you signed in.
            Move {importPrompt?.count === 1 ? "it" : "them"} into your account? Nothing is deleted either way.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handle(false)} data-testid="import-skip">Leave them out</AlertDialogCancel>
          <AlertDialogAction onClick={() => handle(true)} data-testid="import-confirm">Import into my account</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Shell() {
  const { user } = useAuth();

  if (user === null) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) return <AuthGate />;

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="all" element={<AllSaved />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <GlobalDialogs />
      <ImportPrompt />
    </>
  );
}

import { LandingPage } from "@/components/landing-page/landing-page";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/*" element={<Shell />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <StoreProvider>
            <AppRoutes />
            <Toaster position="bottom-right" />
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
