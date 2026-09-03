import { useState } from "react";
import { Puzzle, Database, Sparkles, Copy, Check, KeyRound } from "lucide-react";
import { API, getLibraryId } from "@/api";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const [copied, setCopied] = useState(false);
  const libId = getLibraryId();

  const copy = () => {
    navigator.clipboard.writeText(libId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Settings</h1>

      <div className="space-y-4">
        <div className="border border-border rounded-lg bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="h-4 w-4 text-neutral-700" />
            <h2 className="font-semibold text-sm">Your library</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            This browser has its own private, anonymous memory library — no signup needed. Paste this code into the
            browser extension if it doesn't link automatically. Anyone with this code can load this library, so keep it private.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-neutral-50 border border-border rounded-md px-3 py-2 break-all" data-testid="library-code">
              {libId}
            </code>
            <Button variant="outline" size="sm" onClick={copy} data-testid="copy-library-btn">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold text-sm">AI understanding</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Every saved item is automatically read, summarized, keyworded and categorized so you can find it later with
            natural language or the Ask mode. Original content is always preserved.
          </p>
        </div>

        <div className="border border-border rounded-lg bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <Puzzle className="h-4 w-4 text-neutral-700" />
            <h2 className="font-semibold text-sm">Browser extension</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Save pages, selected text and screenshots from any website using the right-side sidebar. It links to this
            library automatically when the Forgot AI site is open; otherwise paste the code above. To install:
          </p>
          <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
            <li>Open <code>chrome://extensions</code></li>
            <li>Enable <b>Developer mode</b></li>
            <li>Click <b>Load unpacked</b> and select the <code>extension</code> folder</li>
            <li>Open the Forgot AI side panel from the toolbar</li>
          </ol>
        </div>

        <div className="border border-border rounded-lg bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-neutral-700" />
            <h2 className="font-semibold text-sm">API</h2>
          </div>
          <p className="text-sm text-muted-foreground break-all">
            Endpoint: <code>{API}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
