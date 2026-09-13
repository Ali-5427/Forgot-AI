import { Puzzle, Database, Sparkles, LogOut, User } from "lucide-react";
import { API } from "@/api";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>

      <div className="space-y-6">
        <section className="bg-white border border-neutral-200/60 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-neutral-50/50 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-neutral-600" />
            <h2 className="font-semibold text-[15px]">Account & Profile</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-neutral-900">Signed in as</p>
                <p className="text-sm text-muted-foreground" data-testid="account-email">{user?.email}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={logout} 
                data-testid="logout-btn"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-white border border-neutral-200/60 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-neutral-50/50 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-amber-600" />
            <h2 className="font-semibold text-[15px]">AI Processing</h2>
          </div>
          <div className="p-6">
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Every saved item is automatically read, summarized, keyworded and categorized so you can find it later with
              natural language or the Ask mode. Original content is always preserved exactly as you saved it.
            </p>
          </div>
        </section>

        <section className="bg-white border border-neutral-200/60 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-neutral-50/50 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-2">
            <Puzzle className="h-4.5 w-4.5 text-neutral-600" />
            <h2 className="font-semibold text-[15px]">Browser Extension</h2>
          </div>
          <div className="p-6">
            <p className="text-[15px] leading-relaxed text-muted-foreground mb-4">
              Save pages, selected text and screenshots from any website using the right-side sidebar. It uses your account
              automatically when you're signed in to Forgot AI in this browser. To install it:
            </p>
            <ol className="text-[14px] text-muted-foreground list-decimal pl-5 space-y-2 bg-neutral-50/50 p-4 rounded-lg border border-neutral-100">
              <li>Open <code>chrome://extensions</code> in your browser</li>
              <li>Toggle <b>Developer mode</b> in the top right</li>
              <li>Click <b>Load unpacked</b> and select the <code>extension</code> folder</li>
              <li>Open the Forgot AI side panel from your toolbar!</li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
