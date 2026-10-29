import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Bookmark, Upload, Check, AlertCircle, Loader2, Sparkles, HelpCircle } from "lucide-react";
import { api } from "@/api";
import { useStore } from "@/store";
import { toast } from "sonner";

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
  const [progress, setProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
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
    setProgress(0);
    setCompletedCount(0);

    const total = parsedBookmarks.length;
    let completed = 0;
    const CHUNK_SIZE = 4; // Run in small concurrent chunks to avoid rate limits

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = parsedBookmarks.slice(i, i + CHUNK_SIZE);
      await Promise.allSettled(
        chunk.map(async (bm) => {
          try {
            await api.saveUrl({
              url: bm.url,
              title: bm.title,
              user_note: bm.user_note,
            });
          } catch (err) {
            // Ignore single failure, keep going
          } finally {
            completed++;
            setCompletedCount(completed);
            setProgress(Math.round((completed / total) * 100));
          }
        })
      );
    }

    setDone(true);
    setImporting(false);
    toast.success(`Successfully imported ${completed} bookmarks!`);
    await reloadItems();
  };

  const handleReset = () => {
    setFile(null);
    setParsedBookmarks([]);
    setImporting(false);
    setProgress(0);
    setCompletedCount(0);
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
          <div className="py-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900">Import Complete!</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              <strong>{completedCount} bookmarks</strong> have been saved to your Forgot AI account and are now indexing for semantic search.
            </p>
            <Button onClick={handleClose} className="rounded-full px-6 mt-4">
              View My Memories
            </Button>
          </div>
        ) : importing ? (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-900 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Importing your bookmarks…</h4>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {parsedBookmarks.length} saved ({progress}%)
              </p>
            </div>
            <Progress value={progress} className="h-2 w-full rounded-full" />
            <p className="text-[11px] text-muted-foreground">
              Please keep this window open while we index your links.
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
              <Button onClick={handleImport} className="rounded-full text-xs flex items-center gap-1.5 px-5">
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
