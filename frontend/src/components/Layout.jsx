import { NavLink, Outlet } from "react-router-dom";
import { Home, Layers, Search, Settings, Plus, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";

const nav = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/all", label: "All Saved", Icon: Layers },
  { to: "/search", label: "Search", Icon: Search },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export const Layout = () => {
  const { openSave } = useStore();
  return (
    <div className="min-h-screen flex bg-neutral-50 text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-white flex flex-col fixed h-screen">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-neutral-900 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
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
              data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
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

      <main className="flex-1 ml-60 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};
