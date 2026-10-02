import { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Home, Layers, Search, Settings, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import { ItemDetailView } from "./ItemDetailView";
import { FeedbackWidget } from "./FeedbackWidget";
import { api } from "@/api";

const nav = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/all", label: "All Saved", Icon: Layers },
  { to: "/search", label: "Search", Icon: Search },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export const Layout = () => {
  const { openSave, detailOpen, detailId, setDetailOpen, groups, reloadGroups } = useStore();
  
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3b82f6");

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await api.createGroup(newGroupName.trim(), newGroupColor);
      await reloadGroups();
      setIsCreatingGroup(false);
      setNewGroupName("");
    } catch (e) {
      console.error("Failed to create group", e);
    }
  };
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

        <div className="mt-6 px-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            My Groups
            <button onClick={() => setIsCreatingGroup(true)} className="hover:text-neutral-900" title="Create Group"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <nav className="flex flex-col gap-0.5 max-h-[30vh] overflow-y-auto">
            {groups.length === 0 && <div className="text-xs text-neutral-400 px-2 py-1">No groups yet</div>}
            {groups.map(g => (
              <NavLink
                key={g.id}
                to={`/all?group=${g.id}`}
                onClick={() => setDetailOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors text-neutral-600 hover:bg-neutral-100`
                }
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }}></span>
                {g.name}
              </NavLink>
            ))}
          </nav>
        </div>

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

      <FeedbackWidget />

      {/* Create Group Modal */}
      {isCreatingGroup && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 w-80 shadow-2xl">
            <h3 className="font-bold text-[15px] mb-4">Create New Group</h3>
            <input 
              type="text" 
              placeholder="Group Name (e.g. Best IG)" 
              value={newGroupName} 
              onChange={e => setNewGroupName(e.target.value)} 
              className="w-full border border-neutral-200 focus:border-neutral-800 outline-none rounded-xl p-3 mb-4 text-[13px]" 
              autoFocus 
            />
            <div className="flex items-center justify-between mb-6 px-1">
              <label className="text-[13px] font-medium text-neutral-600">Badge Color</label>
              <input 
                type="color" 
                value={newGroupColor} 
                onChange={e => setNewGroupColor(e.target.value)} 
                className="w-8 h-8 rounded-md cursor-pointer border-0 p-0" 
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreatingGroup(false)}>Cancel</Button>
              <Button onClick={handleCreateGroup}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
