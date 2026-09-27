import { NavLink, Outlet } from "react-router-dom";
import { Home, Layers, Search, Settings, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import { ItemDetailView } from "./ItemDetailView";

const nav = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/all", label: "All Saved", Icon: Layers },
  { to: "/search", label: "Search", Icon: Search },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export const Layout = () => {
  const { openSave, detailOpen, detailId, setDetailOpen } = useStore();
  return (
    <div className="min-h-screen w-full bg-neutral-50 text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-white flex-col fixed inset-y-0 left-0 z-20">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Forgot AI Logo" className="h-7 w-7 rounded-md object-cover" />
            <span className="font-semibold text-[15px] tracking-tight">Forgot AI</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">Save anything. Find it later.</p>
        </div>

        <div className="p-3">
          <Button onClick={openSave} className="w-full justify-start" data-testid="sidebar-save-btn">
            <Plus className="h-4 w-4 mr-2" /> Save something
          </Button>
        </div>

        <nav className="px-2 flex flex-col gap-0.5">
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setDetailOpen(false)}
              data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive && !detailOpen ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
                }`
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-4 text-[11px] text-muted-foreground">
          Your personal memory system.
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-0 md:ml-60 min-h-screen relative bg-white pb-20 md:pb-0">
        {detailOpen && detailId ? (
          <ItemDetailView itemId={detailId} onClose={() => setDetailOpen(false)} />
        ) : (
          <Outlet />
        )}
      </main>

      {/* Mobile Floating Action Button */}
      {!detailOpen && (
        <Button 
          onClick={openSave} 
          className="md:hidden fixed bottom-20 right-5 rounded-full w-14 h-14 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-0 z-40 bg-neutral-900 hover:bg-neutral-800 transition-all"
          data-testid="mobile-save-fab"
        >
          <Plus className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Mobile Bottom Navigation */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-border flex justify-around items-center px-1 pb-3 pt-2 z-50"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {nav.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setDetailOpen(false)}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-16 gap-1 transition-colors ${
                isActive && !detailOpen ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-900"
              }`
            }
          >
            <Icon className="h-6 w-6" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
