import { useState, useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home,
  Layers,
  Search,
  Settings,
  Plus,
  RefreshCw,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
  Inbox,
  BookOpen,
  Code,
  Image as ImageIcon,
  FileText,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import { ItemDetailView } from "./ItemDetailView";
import { FeedbackWidget } from "./FeedbackWidget";
import ProductTour, { startTour } from "./ProductTour";
import { api } from "@/api";

const nav = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/all", label: "All Saved", Icon: Layers, end: true },
  { to: "/search", label: "Search", Icon: Search },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export const Layout = () => {
  const {
    openSave,
    openImporter,
    detailOpen,
    detailId,
    setDetailOpen,
    groups,
    reloadGroups,
    addGroupLocal,
    updateGroupLocal,
    deleteGroupLocal,
    items,
  } = useStore();

  const location = useLocation();

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3b82f6");

  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupColor, setEditGroupColor] = useState("");

  // Calculate live smart view counts
  const smartCounts = useMemo(() => {
    const now = Date.now();
    const TWO_DAYS = 48 * 60 * 60 * 1000;
    const safeItems = items || [];
    return {
      inbox: safeItems.filter((i) => now - new Date(i.created_at).getTime() < TWO_DAYS && !i.group_id).length,
      reading: safeItems.filter((i) => i.content_type === "url" || i.content_type === "article" || Boolean(i.source_url)).length,
      code: safeItems.filter(
        (i) =>
          i.content_type === "code" ||
          (i.original_text &&
            (i.original_text.includes("import ") ||
              i.original_text.includes("def ") ||
              i.original_text.includes("const ") ||
              i.original_text.startsWith("```")))
      ).length,
      visuals: safeItems.filter((i) => i.content_type === "image" || i.content_type === "screenshot" || Boolean(i.image_path)).length,
      notes: safeItems.filter((i) => i.content_type === "note" || i.content_type === "text").length,
    };
  }, [items]);

  const smartViews = [
    { to: "/all?view=inbox", viewKey: "inbox", label: "Inbox", Icon: Inbox, count: smartCounts.inbox },
    { to: "/all?view=reading", viewKey: "reading", label: "Reading List", Icon: BookOpen, count: smartCounts.reading },
    { to: "/all?view=code", viewKey: "code", label: "Code & Tools", Icon: Code, count: smartCounts.code },
    { to: "/all?view=visuals", viewKey: "visuals", label: "Visuals", Icon: ImageIcon, count: smartCounts.visuals },
    { to: "/all?view=notes", viewKey: "notes", label: "Thoughts", Icon: FileText, count: smartCounts.notes },
  ];

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const name = newGroupName.trim();
    const color = newGroupColor;
    
    // 1. Instant UI update (create temp group)
    setIsCreatingGroup(false);
    setNewGroupName("");
    const tempId = "temp-" + Date.now();
    addGroupLocal({ id: tempId, name, color });

    try {
      // 2. Background Sync
      await api.createGroup(name, color);
      await reloadGroups(); // pull real ID from server
    } catch (e) {
      deleteGroupLocal(tempId);
      console.error("Failed to create group", e);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editGroupName.trim()) return;
    const name = editGroupName.trim();
    const color = editGroupColor;
    const groupToUpdate = editingGroup;
    
    // 1. Instant UI update
    setEditingGroup(null);
    updateGroupLocal(groupToUpdate.id, { name, color });

    try {
      // 2. Background Sync
      await api.updateGroup(groupToUpdate.id, { name, color });
    } catch (e) {
      // Rollback
      updateGroupLocal(groupToUpdate.id, { name: groupToUpdate.name, color: groupToUpdate.color });
      console.error(e);
    }
  };

  const handleDeleteGroup = async () => {
    const groupToDelete = editingGroup;
    
    // 1. Instant UI update
    setEditingGroup(null);
    deleteGroupLocal(groupToDelete.id);

    try {
      // 2. Background Sync
      await api.deleteGroup(groupToDelete.id);
    } catch (e) {
      // Rollback
      addGroupLocal(groupToDelete);
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-white flex-col fixed inset-y-0 left-0 z-20">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Forgot AI Logo" className="h-7 w-7 rounded-md object-cover shadow-sm" />
            <span className="font-semibold text-[15px] tracking-tight">Forgot AI</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">Save anything. Find it later.</p>
        </div>

        <div className="p-3">
          <Button onClick={openSave} className="w-full justify-start rounded-xl shadow-sm" data-testid="sidebar-save-btn">
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
                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isActive && !detailOpen ? "bg-neutral-900 text-white font-medium" : "text-neutral-600 hover:bg-neutral-100"
                }`
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-feedback"))}
            data-testid="nav-feedback"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-neutral-600 hover:bg-neutral-100 w-full text-left"
          >
            <MessageSquare className="h-4 w-4" /> Feedback
          </button>
          <button
            onClick={startTour}
            data-testid="nav-take-tour"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-neutral-600 hover:bg-neutral-100 w-full text-left"
          >
            <Sparkles className="h-4 w-4" /> Take Tour
          </button>
        </nav>

        {/* ------------------------------------------------------------- */}
        {/* Smart Auto-Collections Views */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-5 px-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            Smart Views
          </div>
          <nav className="flex flex-col gap-0.5">
            {smartViews.map(({ to, viewKey, label, Icon, count }) => {
              const isCurrentView = location.pathname === "/all" && location.search.includes(`view=${viewKey}`);
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setDetailOpen(false)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    isCurrentView
                      ? "bg-neutral-100 text-neutral-900 font-semibold"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-neutral-500" />
                    <span>{label}</span>
                  </div>
                  {count > 0 && (
                    <span className="text-[10px] bg-neutral-100 text-neutral-500 font-mono px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* User Groups */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-5 px-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            My Groups
            <button onClick={() => setIsCreatingGroup(true)} className="hover:text-neutral-900" title="Create Group">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <nav className="flex flex-col gap-0.5 max-h-[22vh] overflow-y-auto overscroll-contain">
            {groups?.length === 0 && <div className="text-xs text-neutral-400 px-2 py-1">No groups yet</div>}
            {groups?.map((g) => (
              <NavLink
                key={g.id}
                to={`/all?group=${g.id}`}
                onClick={() => setDetailOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    isActive ? "text-neutral-900 bg-neutral-100 font-semibold" : "text-neutral-600 hover:bg-neutral-50"
                  }`
                }
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }}></span>
                  <span className="truncate">{g.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingGroup(g);
                    setEditGroupName(g.name);
                    setEditGroupColor(g.color);
                  }}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-900 transition-all rounded"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Bottom Tools (Bookmark Importer) */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-auto p-3 border-t border-border/80">
          <button
            onClick={openImporter}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl w-full transition-colors"
          >
            <Bookmark className="h-3.5 w-3.5 text-neutral-500" />
            <span>Import Bookmarks</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-0 md:ml-60 min-h-screen relative bg-white pb-28 md:pb-0">
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
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-feedback"))}
          className="flex flex-col items-center justify-center w-16 gap-1 transition-colors text-neutral-400 hover:text-neutral-900"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] font-medium">Feedback</span>
        </button>
      </nav>

      <FeedbackWidget />
      <ProductTour />

      {/* Create Group Modal */}
      {isCreatingGroup && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-5 w-[90vw] md:w-80 max-h-[85vh] overflow-y-auto overscroll-contain shadow-2xl border border-border">
            <h3 className="font-bold text-[15px] mb-4">Create New Group</h3>
            <input 
              type="text" 
              placeholder="Group Name (e.g. Design Systems)" 
              value={newGroupName} 
              onChange={(e) => setNewGroupName(e.target.value)} 
              className="w-full border border-neutral-200 focus:border-neutral-800 outline-none rounded-xl p-3 mb-4 text-[13px]" 
              autoFocus 
            />
            <div className="flex items-center justify-between mb-6 px-1">
              <label className="text-[13px] font-medium text-neutral-600">Badge Color</label>
              <input 
                type="color" 
                value={newGroupColor} 
                onChange={(e) => setNewGroupColor(e.target.value)} 
                className="w-8 h-8 rounded-md cursor-pointer border-0 p-0" 
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreatingGroup(false)} className="py-2 px-4 rounded-full">Cancel</Button>
              <Button onClick={handleCreateGroup} className="py-2 px-4 rounded-full">Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-5 w-[90vw] md:w-80 max-h-[85vh] overflow-y-auto overscroll-contain shadow-2xl border border-border">
            <h3 className="font-bold text-[15px] mb-4">Edit Group</h3>
            <input 
              type="text" 
              placeholder="Group Name" 
              value={editGroupName} 
              onChange={(e) => setEditGroupName(e.target.value)} 
              className="w-full border border-neutral-200 focus:border-neutral-800 outline-none rounded-xl p-3 mb-4 text-[13px]" 
              autoFocus 
            />
            <div className="flex items-center justify-between mb-6 px-1">
              <label className="text-[13px] font-medium text-neutral-600">Badge Color</label>
              <input 
                type="color" 
                value={editGroupColor} 
                onChange={(e) => setEditGroupColor(e.target.value)} 
                className="w-8 h-8 rounded-md cursor-pointer border-0 p-0" 
              />
            </div>
            <div className="flex justify-between items-center">
              <button 
                onClick={handleDeleteGroup}
                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditingGroup(null)} className="py-2 px-4 rounded-full">Cancel</Button>
                <Button onClick={handleUpdateGroup} className="py-2 px-4 rounded-full">Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
