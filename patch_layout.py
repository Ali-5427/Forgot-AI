import re

path = "frontend/src/components/Layout.jsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

# 1. Add imports
imports_new = """import { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Home, Layers, Search, Settings, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import { ItemDetailView } from "./ItemDetailView";
import { FeedbackWidget } from "./FeedbackWidget";
import { api } from "@/api";"""
content = re.sub(r'import { NavLink, Outlet } from "react-router-dom";.*?import { FeedbackWidget } from "\./FeedbackWidget";', imports_new, content, flags=re.DOTALL)

# 2. Add State inside Layout component
state_code = """export const Layout = () => {
  const { openSave, detailOpen, detailId, setDetailOpen } = useStore();
  
  const [groups, setGroups] = useState([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3b82f6");

  useEffect(() => {
    api.getGroups().then(setGroups).catch(console.error);
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const created = await api.createGroup(newGroupName.trim(), newGroupColor);
      setGroups([created, ...groups]);
      setIsCreatingGroup(false);
      setNewGroupName("");
    } catch (e) {
      console.error("Failed to create group", e);
    }
  };"""
content = content.replace("""export const Layout = () => {
  const { openSave, detailOpen, detailId, setDetailOpen } = useStore();""", state_code)

# 3. Inject Groups Sidebar Section
sidebar_groups = """        </nav>

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
        </div>"""
content = content.replace("        </nav>", sidebar_groups)

# 4. Inject Modal at the bottom of Layout
modal_code = """      <FeedbackWidget />

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
};"""
content = content.replace("""      <FeedbackWidget />
    </div>
  );
};""", modal_code)

with open(path, "w", encoding="utf8") as f:
    f.write(content)

print("Layout.jsx patched")
