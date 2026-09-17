import "@/App.css";
import { useEffect, useState } from "react";
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
import { LandingPage } from "@/components/landing-page/landing-page";
import AuthGate from "@/pages/AuthGate";
import Home from "@/pages/Home";
import AllSaved from "@/pages/AllSaved";
import SearchPage from "@/pages/SearchPage";
import Settings from "@/pages/Settings";

// Legal Pages
import PrivacyPage from "@/pages/legal/PrivacyPage";
import TermsPage from "@/pages/legal/TermsPage";
import ContactPage from "@/pages/legal/ContactPage";
import SecurityPage from "@/pages/legal/SecurityPage";
import DataDeletionPage from "@/pages/legal/DataDeletionPage";

function GlobalDialogs() {
  const { saveOpen, setSaveOpen, openItem, reloadItems } = useStore();
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
      <SaveDialog open={saveOpen} onOpenChange={setSaveOpen} onSaved={() => reloadItems()} onOpenExisting={(id) => openItem(id)} />
    </>
  );
}

function ImportPrompt() {
  const { importPrompt, confirmImport } = useAuth();
  const { reloadItems } = useStore();
  const open = !!importPrompt;

  const handle = async (doImport) => {
    await confirmImport(doImport);
    if (doImport) reloadItems();
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

function LoggedOut() {
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) {
    return (
      <div className="relative min-h-screen">
        <button
          type="button"
          onClick={() => setShowAuth(false)}
          className="absolute left-4 top-4 z-10 text-sm text-muted-foreground hover:text-foreground"
          data-testid="auth-back"
        >
          Back
        </button>
        <AuthGate />
      </div>
    );
  }

  return <LandingPage onOpenApp={() => setShowAuth(true)} />;
}

function AppContent() {
  const { user } = useAuth();

  if (user === null) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <>
      <Routes>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/data-deletion" element={<DataDeletionPage />} />
        
        {user ? (
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/all" element={<AllSaved />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Home />} />
          </Route>
        ) : (
          <Route path="*" element={<LoggedOut />} />
        )}
      </Routes>
      
      {user && <GlobalDialogs />}
      {user && <ImportPrompt />}
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <StoreProvider>
            <AppContent />
            <Toaster position="bottom-right" />
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
