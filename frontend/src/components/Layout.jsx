import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home,
  Layers,
  Search,
  Settings,
  Plus,
  MessageSquare,
  MoreHorizontal,
  LogOut,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import { useAuth } from "@/auth";
import { ItemDetailView } from "./ItemDetailView";
import { FeedbackWidget } from "./FeedbackWidget";
import ProductTour from "./ProductTour";
import { api } from "@/api";

// Core destinations in Option A order: Search -> Home -> All Saved
const nav = [
  {
    to: "/search",
    label: "Search",
    Icon: Search,
    animation: "group-hover:-rotate-12 group-hover:scale-110",
  },
  {
    to: "/",
    label: "Home",
    Icon: Home,
    end: true,
    animation: "group-hover:-translate-y-0.5 group-hover:scale-105",
  },
  {
    to: "/all",
    label: "All Saved",
    Icon: Layers,
    end: true,
    animation: "group-hover:-translate-y-1 group-hover:scale-105",
  },
];

export const Layout = () => {
  const { user, logout } = useAuth();
  const {
    openSave,
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

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3b82f6");

  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupColor, setEditGroupColor] = useState("");

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
      await reloadGroups();
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

  // User display name & initials
  const userEmail = user?.email || "";
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-foreground">
      {/* ------------------------------------------------------------- */}
      {/* Top-Tier Desktop Sidebar (w-64 / 256px) */}
      {/* ------------------------------------------------------------- */}
      <aside className="hidden md:flex w-64 border-r border-border bg-white flex-col fixed inset-y-0 left-0 z-20 select-none shadow-[1px_0_0_0_rgba(0,0,0,0.02)]">
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Forgot AI Logo" className="h-7 w-7 rounded-lg object-cover shadow-sm ring-1 ring-black/5" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-neutral-900 leading-none">Forgot AI</span>
              <span className="text-[10px] text-neutral-400 font-mono tracking-wide mt-1">PERSONAL MEMORY</span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="p-3">
          <Button
            onClick={openSave}
            className="group w-full justify-start rounded-xl h-10 px-3.5 shadow-sm text-sm font-medium bg-neutral-900 hover:bg-neutral-800 text-white transition-all duration-150"
            data-testid="sidebar-save-btn"
          >
            <Plus className="h-4 w-4 mr-2 stroke-[2.5] transition-transform duration-200 ease-out group-hover:rotate-90 group-hover:scale-110" />
            Save something
          </Button>
        </div>

        {/* Primary Navigation: Search -> Home -> All Saved (Option A) */}
        <div className="px-3 pt-1">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 px-2.5">
            Navigation
          </div>
          <nav className="flex flex-col gap-0.5">
            {nav.map(({ to, label, Icon, end, animation }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setDetailOpen(false)}
                data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
                    isActive && !detailOpen
                      ? "bg-neutral-900 text-white font-medium shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80"
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 ease-out ${animation || ""}`} />
                  <span>{label}</span>
                </div>
                {/* Live total count badge on All Saved */}
                {label === "All Saved" && items && items.length > 0 && (
                  <span
                    className={`text-[11px] font-mono px-1.5 py-0.2 rounded-md ${
                      location.pathname === "/all" && !detailOpen
                        ? "text-neutral-300 bg-white/10"
                        : "text-neutral-400 bg-neutral-100"
                    }`}
                  >
                    {items.length}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Collections / My Groups */}
        <div className="mt-6 px-3 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 px-2.5">
            <span>My Groups</span>
            <button
              onClick={() => setIsCreatingGroup(true)}
              className="group text-neutral-400 hover:text-neutral-900 p-0.5 rounded transition-colors"
              title="Create new group"
            >
              <Plus className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:rotate-90 group-hover:scale-110" />
            </button>
          </div>

          <nav className="flex flex-col gap-0.5 overflow-y-auto overscroll-contain pr-1 flex-1">
            {groups?.length === 0 && (
              <div className="group text-xs text-neutral-400 px-3 py-2 italic flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 opacity-40 transition-transform duration-200 ease-out group-hover:rotate-6" />
                No groups yet
              </div>
            )}
            {groups?.map((g) => (
              <NavLink
                key={g.id}
                to={`/all?group=${g.id}`}
                onClick={() => setDetailOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-colors ${
                    isActive
                      ? "text-neutral-900 bg-neutral-100 font-semibold"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  }`
                }
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="w-2 h-2 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-125" style={{ backgroundColor: g.color }}></span>
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
                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-900 transition-opacity rounded"
                  title="Group options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Pinned Utility & User Footer */}
        <div className="mt-auto border-t border-border/80 bg-neutral-50/50 p-2.5 flex flex-col gap-1">
          {/* Feedback & Settings buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-feedback"))}
              data-testid="nav-feedback"
              className="group flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-white transition-all shadow-xs"
            >
              <MessageSquare className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:-rotate-12 group-hover:-translate-y-0.5" />
              <span>Feedback</span>
            </button>
            <NavLink
              to="/settings"
              onClick={() => setDetailOpen(false)}
              className={({ isActive }) =>
                `group flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all shadow-xs ${
                  isActive
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-white"
                }`
              }
            >
              <Settings className="h-3.5 w-3.5 transition-transform duration-500 ease-out group-hover:rotate-90" />
              <span>Settings</span>
            </NavLink>
          </div>

          {/* User Account Info & Quick Signout */}
          <div className="mt-1 pt-2 border-t border-border/60 px-2 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-6 w-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {userInitial}
              </div>
              <span className="text-[11px] font-medium text-neutral-700 truncate max-w-[130px]" title={userEmail}>
                {userEmail || "Account"}
              </span>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="group p-1.5 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* Main Content Area (ml-64 matching the w-64 sidebar) */}
      {/* ------------------------------------------------------------- */}
      <main className="ml-0 md:ml-64 min-h-screen relative bg-white pb-28 md:pb-0">
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
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <NavLink
          to="/search"
          onClick={() => setDetailOpen(false)}
          className={({ isActive }) =>
            `group flex flex-col items-center justify-center w-16 gap-1 transition-colors ${
              isActive && !detailOpen ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-900"
            }`
          }
        >
          <Search className="h-5 w-5 transition-transform duration-200 ease-out group-hover:-rotate-12 group-hover:scale-110 active:scale-95" />
          <span className="text-[10px] font-medium">Search</span>
        </NavLink>

        <NavLink
          to="/"
          end
          onClick={() => setDetailOpen(false)}
          className={({ isActive }) =>
            `group flex flex-col items-center justify-center w-16 gap-1 transition-colors ${
              isActive && !detailOpen ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-900"
            }`
          }
        >
          <Home className="h-5 w-5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-105 active:scale-95" />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>

        <NavLink
          to="/all"
          end
          onClick={() => setDetailOpen(false)}
          className={({ isActive }) =>
            `group flex flex-col items-center justify-center w-16 gap-1 transition-colors ${
              isActive && !detailOpen ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-900"
            }`
          }
        >
          <Layers className="h-5 w-5 transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-105 active:scale-95" />
          <span className="text-[10px] font-medium">All Saved</span>
        </NavLink>

        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-feedback"))}
          className="group flex flex-col items-center justify-center w-16 gap-1 transition-colors text-neutral-400 hover:text-neutral-900"
        >
          <MessageSquare className="h-5 w-5 transition-transform duration-200 ease-out group-hover:-rotate-12 group-hover:-translate-y-0.5 active:scale-95" />
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
              <Button variant="ghost" onClick={() => setIsCreatingGroup(false)} className="py-2 px-4 rounded-full">
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} className="py-2 px-4 rounded-full">
                Create
              </Button>
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
                <Button variant="ghost" onClick={() => setEditingGroup(null)} className="py-2 px-4 rounded-full">
                  Cancel
                </Button>
                <Button onClick={handleUpdateGroup} className="py-2 px-4 rounded-full">
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
