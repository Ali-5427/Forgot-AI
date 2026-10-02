import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { api, fileUrl } from "@/api";
import { typeMeta, timeAgo } from "@/lib/format";
import { Loader2, AlertTriangle, Pin, FolderPlus } from "lucide-react";
import { useStore } from "@/store";

export const ItemCard = ({ item, onClick, onPin }) => {
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
  };

  return (
    <div
      data-testid={`item-card-${item.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => (e.key === "Enter" ? onClick(item) : null)}
      className="group relative w-full text-left border border-border rounded-lg bg-card hover:border-neutral-400 hover:shadow-sm transition-[border-color,box-shadow] overflow-hidden flex flex-col cursor-pointer"
    >
      {onPin && (
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
      )}
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
      </div>

      {item.image_path && (
        <div className="h-36 w-full bg-neutral-100 border-b border-border overflow-hidden shrink-0 relative">
          <img 
            src={item.content_type === "image" ? fileUrl(item.image_path) : item.image_path} 
            alt={item.title} 
            className="absolute inset-0 h-full w-full object-cover" 
            loading="lazy" 
            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="mono-label text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Icon className="h-3 w-3" /> {label}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</span>
        </div>

                {item.group_name && (
          <span 
            className="inline-block px-2 py-0.5 mb-2 w-max text-[11px] font-bold rounded-md"
            style={{ 
              backgroundColor: `${item.group_color}20`,
              color: item.group_color 
            }}
          >
            {item.group_name}
          </span>
        )}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground pr-6">{item.title}</h3>

        {item.status === "processing" ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Understanding…
          </p>
        ) : item.status === "failed" ? (
          <p className="text-xs text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Processing failed — open to retry
          </p>
        ) : (
          <p className="text-xs text-muted-foreground line-clamp-2">{preview}</p>
        )}

        <div className="mt-auto flex items-center gap-1.5 flex-wrap pt-1">
          {item.category && item.status === "ready" && (
            <Badge variant="secondary" className="text-[10px] font-medium">
              {item.category}
            </Badge>
          )}
          {(item.keywords || []).slice(0, 3).map((k) => (
            <span key={k} className="text-[10px] text-muted-foreground">
              #{k}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
