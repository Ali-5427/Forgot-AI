import { Puzzle, Database, Sparkles, LogOut, User } from "lucide-react";
import { API } from "@/api";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Settings</h1>

      <div className="space-y-4">
        <div className="border border-border rounded-lg bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-neutral-700" />
            <h2 className="font-semibold text-sm">Account</h2>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" data-testid="account-email">{user?.email}</p>
            <Button variant="outline" size="sm" onClick={logout} data-testid="logout-btn">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Log out
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
            Save pages, selected text and screenshots from any website using the right-side sidebar. It uses your account
            automatically when you're signed in to Forgot AI in this browser; otherwise sign in from the sidebar. To install:
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
