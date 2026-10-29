import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { api, fileUrl } from "@/api";
import { typeMeta, timeAgo } from "@/lib/format";
import {
  Loader2,
  AlertTriangle,
  Pin,
  FolderPlus,
  Clock,
  Copy,
  Check,
  Code as CodeIcon,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useStore } from "@/store";
import { toast } from "sonner";

export const ItemCard = ({ item, onClick, onPin }) => {
  const { label, Icon } = typeMeta(item.content_type);
  const preview = item.summary || item.original_text || item.source_url || "";
  
  const { groups, updateItemLocal } = useStore();
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Helper to extract clean domain from source_url
  const getDomain = (url) => {
    if (!url) return null;
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  };

  const domain = getDomain(item.source_url);
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

  // Estimated reading time
  const wordCount = (item.original_text || item.summary || "").split(/\s+/).filter(Boolean).length;
  const readTime = wordCount > 80 ? `${Math.max(1, Math.ceil(wordCount / 200))} min read` : null;

  // Detect if item is code-like
  const isCode =
    item.content_type === "code" ||
    (item.original_text &&
      (item.original_text.startsWith("```") ||
        item.original_text.includes("import ") ||
        item.original_text.includes("def ") ||
        item.original_text.includes("const ") ||
        item.original_text.includes("function ") ||
        item.original_text.includes("SELECT ") ||
        item.original_text.includes("class ")));

  // Detect code language hint
  const codeLang = (() => {
    const text = item.original_text || "";
    if (text.startsWith("```")) {
      const firstLine = text.split("\n")[0].replace("```", "").trim();
      if (firstLine) return firstLine;
    }
    if (text.includes("import React") || text.includes("const ") || text.includes("function ")) return "JavaScript/TS";
    if (text.includes("def ") || text.includes("import os") || text.includes("print(")) return "Python";
    if (text.includes("SELECT ") || text.includes("FROM ") || text.includes("WHERE ")) return "SQL";
    if (text.includes("curl ") || text.includes("npm ") || text.includes("docker ")) return "Shell";
    return "Code";
  })();

  const cleanCodeText = (item.original_text || "")
    .replace(/^```[a-zA-Z]*\n?/, "")
    .replace(/```$/, "")
    .trim();

  const handleCopyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(cleanCodeText);
    setCopiedCode(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleMove = async (e, groupId) => {
    e.stopPropagation();
    
    let updatePayload = { group_id: null, group_name: null, group_color: null };
    if (groupId) {
      const g = (groups || []).find((x) => x.id === groupId);
      if (g) updatePayload = { group_id: g.id, group_name: g.name, group_color: g.color };
    }
    
    // 1. Instant optimistic UI update
    updateItemLocal(item.id, updatePayload);
    setShowFolderMenu(false);
    toast.success("Moved to group");

    try {
      // 2. Background sync
      await api.updateItem(item.id, updatePayload);
    } catch (err) {
      console.error(err);
      toast.error("Failed to move");
    }
  };

  return (
    <div
      data-testid={`item-card-${item.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => (e.key === "Enter" ? onClick(item) : null)}
      className="group relative w-full text-left border border-border/80 rounded-xl bg-card hover:border-neutral-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Pin Button */}
      {onPin && (
        <button
          data-testid={`pin-btn-${item.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onPin(item);
          }}
          title={item.pinned ? "Unpin" : "Pin to top"}
          className={`absolute right-2 top-2 z-10 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
            item.pinned
              ? "bg-neutral-900 text-white shadow-sm"
              : "bg-white/90 text-neutral-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-neutral-100 border border-border shadow-sm"
          }`}
        >
          <Pin className={`h-3.5 w-3.5 ${item.pinned ? "fill-white" : ""}`} />
        </button>
      )}

      {/* Move to Group Button */}
      <div className="absolute right-11 top-2 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFolderMenu(!showFolderMenu);
          }}
          title="Move to Group"
          className="h-8 w-8 rounded-lg flex items-center justify-center transition-all bg-white/90 text-neutral-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-neutral-100 border border-border shadow-sm"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
        
        {showFolderMenu && (
          <div className="absolute right-0 top-9 w-48 bg-white rounded-xl shadow-xl border border-border py-1.5 z-30 flex flex-col max-h-64 overflow-y-auto overscroll-contain">
            <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Move to...</div>
            <button 
              onClick={(e) => handleMove(e, null)}
              className="px-3 py-2 text-xs text-left hover:bg-neutral-50 text-neutral-600 transition-colors"
            >
              No Group (Unorganized)
            </button>
            {groups?.map((g) => (
              <button 
                key={g.id}
                onClick={(e) => handleMove(e, g.id)}
                className="px-3 py-2 text-xs text-left hover:bg-neutral-50 text-neutral-800 transition-colors flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }}></span>
                <span className="truncate">{g.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. Image / Screenshot Content Card */}
      {/* ------------------------------------------------------------- */}
      {item.image_path && (
        <div className="h-40 w-full bg-neutral-100 border-b border-border overflow-hidden shrink-0 relative group/img">
          <img 
            src={item.content_type === "image" ? fileUrl(item.image_path) : item.image_path} 
            alt={item.title} 
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105" 
            loading="lazy" 
            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.display = 'none'; }}
          />
          {item.summary && (
            <span className="absolute bottom-2.5 left-2.5 z-10 text-[10px] font-medium bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Sparkles className="w-2.5 h-2.5 text-amber-300" /> Text Recognized
            </span>
          )}
        </div>
      )}

      {/* Card Body */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Top Meta Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                className="h-3.5 w-3.5 rounded-sm shrink-0 object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            
            {domain ? (
              <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[130px]">
                {domain}
              </span>
            ) : (
              <span className="mono-label text-[10px] text-muted-foreground">
                {label}
              </span>
            )}

            {readTime && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="w-2.5 h-2.5" /> {readTime}
                </span>
              </>
            )}
          </div>

          <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(item.created_at)}</span>
        </div>

        {/* Group Pill if assigned */}
        {item.group_name && (
          <span 
            className="inline-block px-2 py-0.5 w-max text-[10px] font-semibold rounded-md"
            style={{ 
              backgroundColor: `${item.group_color}18`,
              color: item.group_color 
            }}
          >
            {item.group_name}
          </span>
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground pr-8 group-hover:text-primary transition-colors">
          {item.title}
        </h3>

        {/* ------------------------------------------------------------- */}
        {/* 2. Code Snippet Preview (if code-like) */}
        {/* ------------------------------------------------------------- */}
        {isCode && cleanCodeText ? (
          <div className="my-1 bg-neutral-900 text-neutral-200 rounded-lg p-2.5 font-mono text-[11px] border border-neutral-800 relative group/code overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-800 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1">
                <CodeIcon className="w-3 h-3 text-cyan-400" />
                {codeLang}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copy code"
                className="hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-800 text-[10px]"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="line-clamp-3 leading-relaxed text-neutral-300 select-none overflow-x-hidden">
              {cleanCodeText}
            </pre>
          </div>
        ) : item.content_type === "note" || item.content_type === "text" ? (
          /* ----------------------------------------------------------- */
          /* 3. Text / Note Editorial Styling */
          /* ----------------------------------------------------------- */
          <div className="py-1">
            <p className="text-xs text-neutral-700 leading-relaxed line-clamp-3 font-serif bg-neutral-50/80 p-2.5 rounded-lg border border-neutral-100">
              "{preview}"
            </p>
          </div>
        ) : item.status === "processing" ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
            <Loader2 className="h-3 w-3 animate-spin text-primary" /> Understanding memory…
          </p>
        ) : item.status === "failed" ? (
          <p className="text-xs text-amber-700 flex items-center gap-1.5 py-1">
            <AlertTriangle className="h-3 w-3" /> Processing failed — open to retry
          </p>
        ) : (
          /* ----------------------------------------------------------- */
          /* 4. Standard Link Summary Preview */
          /* ----------------------------------------------------------- */
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {preview}
          </p>
        )}

        {/* Bottom Metadata Tags */}
        <div className="mt-auto flex items-center gap-1.5 flex-wrap pt-1.5">
          {item.category && item.status === "ready" && (
            <Badge variant="secondary" className="text-[10px] font-medium py-0 px-1.5 h-4 bg-neutral-100 text-neutral-700 hover:bg-neutral-200">
              {item.category}
            </Badge>
          )}
          {(item.keywords || []).slice(0, 3).map((k) => (
            <span key={k} className="text-[10px] text-muted-foreground hover:text-foreground">
              #{k}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
