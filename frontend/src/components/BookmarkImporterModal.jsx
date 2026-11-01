import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bookmark, Upload, Check, AlertCircle, Loader2, Sparkles, HelpCircle } from "lucide-react";
import { api } from "@/api";
import { useStore } from "@/store";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export function parseBookmarksHtml(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const links = doc.querySelectorAll("a");
  const bookmarks = [];
  const seenUrls = new Set();

  links.forEach((a) => {
    const href = a.getAttribute("href")?.trim();
    const title = a.textContent?.trim() || "";
    if (
      href &&
      (href.startsWith("http://") || href.startsWith("https://")) &&
      !seenUrls.has(href)
    ) {
      seenUrls.add(href);
      bookmarks.push({
        url: href,
        title: title || href,
        user_note: "Imported from browser bookmarks",
      });
    }
  });

  return bookmarks;
}

export function BookmarkImporterModal({ open, onOpenChange }) {
  const { reloadItems } = useStore();
  const [file, setFile] = useState(null);
  const [parsedBookmarks, setParsedBookmarks] = useState([]);
  const [importing, setImporting] = useState(false);
  const [resultStats, setResultStats] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [done, setDone] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith(".html") && !selected.name.endsWith(".htm")) {
      toast.error("Please select a valid HTML bookmarks file.");
      return;
    }

    setFile(selected);
    setErrorMessage("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        const parsed = parseBookmarksHtml(content);
        if (parsed.length === 0) {
          toast.error("No valid bookmarks found in this file.");
          setFile(null);
          return;
        }
        setParsedBookmarks(parsed);
      }
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    if (parsedBookmarks.length === 0 || importing) return;
    setImporting(true);
    setErrorMessage("");

    try {
      const res = await api.bulkImportBookmarks(parsedBookmarks);
      setResultStats(res);
      setDone(true);
      toast.success(`Successfully imported ${res.imported} bookmarks!`);
      await reloadItems();
    } catch (err) {
      console.error("Bulk bookmark import failed:", err);
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 402) {
        setErrorMessage(
          detail ||
            "Active trial or subscription required to save and search memories. Please activate or subscribe to a plan."
        );
      } else if (status === 401) {
        setErrorMessage("Please sign in to Forgot AI to import your bookmarks.");
      } else {
        setErrorMessage(
          detail || "Failed to import bookmarks. Please check your network and try again."
        );
      }
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedBookmarks([]);
    setImporting(false);
    setResultStats(null);
    setErrorMessage("");
    setDone(false);
  };

  const handleClose = () => {
    if (importing) return;
    onOpenChange(false);
    setTimeout(handleReset, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white border border-border p-6 rounded-2xl shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
              <Bookmark className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-semibold">Import Browser Bookmarks</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Instantly turn your existing Chrome, Safari, Edge, or Brave bookmarks into searchable AI memories.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-8 text-center space-y-3 animate-in fade-in duration-200">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900">Import Complete!</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              <strong>{resultStats?.imported || 0} bookmarks</strong> have been successfully saved to your Forgot AI vault.
              {resultStats?.skipped_duplicates > 0 && (
                <span className="block mt-1 text-neutral-500">
                  ({resultStats.skipped_duplicates} already existed in your vault and were skipped)
                </span>
              )}
            </p>
            <Button onClick={handleClose} className="rounded-full px-6 mt-4 bg-neutral-900 text-white">
              View My Memories
            </Button>
          </div>
        ) : errorMessage ? (
          <div className="py-6 text-center space-y-4 animate-in fade-in duration-200">
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-neutral-900">Import Unsuccessful</h3>
              <p className="text-xs text-neutral-600 max-w-xs mx-auto leading-relaxed">{errorMessage}</p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setErrorMessage("")} className="rounded-xl text-xs">
                Try Again
              </Button>
              {errorMessage.toLowerCase().includes("subscription") || errorMessage.toLowerCase().includes("plan") ? (
                <Link to="/pricing" onClick={handleClose}>
                  <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs">
                    View Plans &rarr;
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        ) : importing ? (
          <div className="py-8 text-center space-y-4 animate-in fade-in duration-200">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-900 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-neutral-900">Importing your bookmarks…</h4>
              <p className="text-xs text-muted-foreground">
                Saving {parsedBookmarks.length} links to your memory vault and queueing AI enrichment.
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Please wait a moment while we process the batch.
            </p>
          </div>
        ) : parsedBookmarks.length > 0 ? (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-900 block truncate max-w-[200px]">
                  {file?.name}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Found <strong className="text-neutral-900">{parsedBookmarks.length} bookmarks</strong> ready to import.
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-neutral-500 h-8">
                Change
              </Button>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleClose} className="rounded-full text-xs">
                Cancel
              </Button>
              <Button onClick={handleImport} className="rounded-full text-xs flex items-center gap-1.5 px-5 bg-neutral-900 text-white">
                <Sparkles className="w-3.5 h-3.5" />
                Import {parsedBookmarks.length} Bookmarks
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-200 hover:border-neutral-400 rounded-xl p-8 text-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-neutral-50 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-8 w-8 text-neutral-400 group-hover:text-neutral-700 mx-auto mb-2 transition-colors" />
              <p className="text-sm font-medium text-neutral-800">
                Click to upload <code className="bg-neutral-200/60 px-1.5 py-0.5 rounded text-xs">bookmarks.html</code>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Exported from Chrome, Safari, Brave, Edge, or Arc
              </p>
            </div>

            {/* Quick Export Guide Toggle */}
            <div className="text-xs text-muted-foreground pt-1">
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-neutral-700 font-medium hover:underline flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showHelp ? "Hide export instructions" : "How to export bookmarks from your browser?"}
              </button>

              {showHelp && (
                <div className="mt-3 p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-[11px] text-neutral-600 leading-relaxed">
                  <p><strong>In Google Chrome / Brave / Edge:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 pl-1">
                    <li>Press <kbd className="bg-white border rounded px-1">Ctrl+Shift+O</kbd> (or <kbd className="bg-white border rounded px-1">Cmd+Option+B</kbd> on Mac).</li>
                    <li>Click the <strong>three vertical dots (⋮)</strong> in the top right.</li>
                    <li>Click <strong>Export bookmarks</strong> and save the file.</li>
                  </ol>
                  <p className="pt-1"><strong>In Safari:</strong> Choose <em>File → Export Bookmarks</em>.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
