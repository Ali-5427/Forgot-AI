import re

path = "frontend/src/components/ItemCard.jsx"
with open(path, "r", encoding="utf8") as f: content = f.read()

imports_old = """import { Badge } from "@/components/ui/badge";
import { fileUrl } from "@/api";
import { typeMeta, timeAgo } from "@/lib/format";
import { Loader2, AlertTriangle, Pin } from "lucide-react";"""

imports_new = """import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { api, fileUrl } from "@/api";
import { typeMeta, timeAgo } from "@/lib/format";
import { Loader2, AlertTriangle, Pin, FolderPlus } from "lucide-react";
import { useStore } from "@/store";"""

content = content.replace(imports_old, imports_new)

# Add group dropdown state
comp_old = """export const ItemCard = ({ item, onClick, onPin }) => {
  const { label, Icon } = typeMeta(item.content_type);
  const preview = item.summary || item.original_text || item.source_url || "";"""

comp_new = """export const ItemCard = ({ item, onClick, onPin }) => {
  const { label, Icon } = typeMeta(item.content_type);
  const preview = item.summary || item.original_text || item.source_url || "";
  
  const { groups, reloadItems } = useStore();
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  
  const handleMove = async (e, groupId) => {
    e.stopPropagation();
    try {
      // Find the group to grab the name and color (or let backend handle it, but for instant UI we can just send group_id)
      // Actually backend handles syncing name/color in PATCH /items if we only pass group_id?
      // Wait, in server.py, update_item accepts group_id, group_name, group_color.
      // Let's pass them all.
      let updatePayload = { group_id: null, group_name: null, group_color: null };
      if (groupId) {
        const g = groups.find(x => x.id === groupId);
        if (g) updatePayload = { group_id: g.id, group_name: g.name, group_color: g.color };
      }
      
      await api.updateItem(item.id, updatePayload);
      setShowFolderMenu(false);
      reloadItems();
    } catch (err) {
      console.error(err);
    }
  };"""

content = content.replace(comp_old, comp_new)

# Add Folder button and menu next to the pin button
pin_old = """      {onPin && (
        <button
          data-testid={`pin-btn-${item.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onPin(item);
          }}
          title={item.pinned ? "Unpin" : "Pin to top"}
          className={`absolute right-2 top-2 z-10 h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
            item.pinned
              ? "bg-neutral-900 text-white"
              : "bg-white/80 text-neutral-500 opacity-0 group-hover:opacity-100 hover:bg-neutral-100 border border-border"
          }`}
        >
          <Pin className={`h-3.5 w-3.5 ${item.pinned ? "fill-white" : ""}`} />
        </button>
      )}"""

pin_new = pin_old + """
      <div className="absolute right-10 top-2 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFolderMenu(!showFolderMenu);
          }}
          title="Move to Group"
          className="h-7 w-7 rounded-md flex items-center justify-center transition-colors bg-white/80 text-neutral-500 opacity-0 group-hover:opacity-100 hover:bg-neutral-100 border border-border"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
        
        {showFolderMenu && (
          <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-xl border border-border py-1 z-30 flex flex-col max-h-64 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Move to...</div>
            <button 
              onClick={(e) => handleMove(e, null)}
              className="px-3 py-2 text-xs text-left hover:bg-neutral-50 text-neutral-600 transition-colors"
            >
              No Group (Unorganized)
            </button>
            {groups.map(g => (
              <button 
                key={g.id}
                onClick={(e) => handleMove(e, g.id)}
                className="px-3 py-2 text-xs text-left hover:bg-neutral-50 text-neutral-800 transition-colors flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }}></span>
                <span className="truncate">{g.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>"""
content = content.replace(pin_old, pin_new)

with open(path, "w", encoding="utf8") as f: f.write(content)
print("itemcard patched")
