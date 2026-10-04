# -*- coding: utf-8 -*-
import re

path = "frontend/src/components/ItemDetailView.jsx"
with open(path, "r", encoding="utf8") as f: content = f.read()

# 1. Update imports
imports_old = """import {
  Loader2, Trash2, Pencil, ExternalLink, Sparkles, RefreshCw, AlertTriangle, X, Send, Check, Pin, Link as LinkIcon, MessageSquare, ArrowLeft, FileText, Image as ImageIcon, Link2, Network, Copy, RotateCcw, Edit2, Square
} from "lucide-react";"""
imports_new = """import {
  Loader2, Trash2, Pencil, ExternalLink, Sparkles, RefreshCw, AlertTriangle, X, Send, Check, Pin, Link as LinkIcon, MessageSquare, ArrowLeft, FileText, Image as ImageIcon, Link2, Network, Copy, RotateCcw, Edit2, Square, FolderPlus
} from "lucide-react";"""
content = content.replace(imports_old, imports_new)


# 2. Update state and store variables
store_old = """  const { updateItemLocal, deleteItemLocal, togglePin, openItem, items } = useStore();
  const cachedItem = items.find(i => i.id === itemId);
  const [item, setItem] = useState(cachedItem || null);"""
store_new = """  const { updateItemLocal, deleteItemLocal, togglePin, openItem, items, groups, reloadItems } = useStore();
  const cachedItem = items.find(i => i.id === itemId);
  const [item, setItem] = useState(cachedItem || null);
  const [showFolderMenu, setShowFolderMenu] = useState(false);

  const handleMove = async (groupId) => {
    try {
      let updatePayload = { group_id: null, group_name: null, group_color: null };
      if (groupId) {
        const g = groups?.find(x => x.id === groupId);
        if (g) updatePayload = { group_id: g.id, group_name: g.name, group_color: g.color };
      }
      setItem(prev => ({ ...prev, ...updatePayload }));
      updateItemLocal(item.id, updatePayload);
      await api.updateItem(item.id, updatePayload);
      setShowFolderMenu(false);
      reloadItems();
      toast.success("Moved to group");
    } catch (err) {
      console.error(err);
      toast.error("Failed to move");
    }
  };"""
content = content.replace(store_old, store_new)


# 3. Replace the entire Header block
header_old_pattern = re.compile(r'\{/\* Header - Fixed \*/\}.*?(?=\{/\* 2-Column Split Content \*/\})', re.DOTALL)

header_new = """{/* Header - Fixed */}
      <div className="p-4 md:p-5 border-b border-neutral-100 shrink-0 bg-white z-10 flex flex-col gap-2 shadow-sm">
        
        {/* Row 1: App Bar */}
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-neutral-100 text-neutral-500 -ml-2 h-8 px-2 gap-1.5 shrink-0" data-testid="back-btn">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="flex-1 min-w-0 flex items-center justify-center">
            {editing ? (
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="text-lg font-bold shadow-sm h-9 w-full max-w-md text-center"
                data-testid="edit-title-input"
              />
            ) : (
              <h2 className="text-2xl font-bold text-neutral-900 tracking-tight leading-tight truncate text-center" data-testid="detail-title">{item.title}</h2>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0 relative">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFolderMenu(!showFolderMenu)}
                title="Move to Group"
                className="hover:bg-neutral-100 h-8 w-8 p-0 text-neutral-500"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
              {showFolderMenu && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-xl border border-border py-1 z-50 flex flex-col max-h-64 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Move to...</div>
                  <button onClick={() => handleMove(null)} className="px-3 py-2 text-xs text-left hover:bg-neutral-50 text-neutral-600 transition-colors">No Group</button>
                  {groups?.map(g => (
                    <button key={g.id} onClick={() => handleMove(g.id)} className="px-3 py-2 text-xs text-left hover:bg-neutral-50 text-neutral-800 transition-colors flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }}></span>
                      <span className="truncate">{g.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setItem((prev) => ({ ...prev, pinned: !item.pinned }));
                togglePin(item);
              }}
              data-testid="pin-item-btn"
              title={item.pinned ? "Unpin" : "Pin to top"}
              className="hover:bg-neutral-100 h-8 w-8 p-0"
            >
              <Pin className={`h-4 w-4 ${item.pinned ? "fill-neutral-900" : "text-neutral-500"}`} />
            </Button>
            {!editing && (
              <Button variant="ghost" size="sm" onClick={startEdit} data-testid="edit-item-btn" className="hover:bg-neutral-100 text-neutral-500 h-8 w-8 p-0">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="delete-item-btn" className="hover:bg-red-50 hover:text-red-600 text-neutral-500 h-8 w-8 p-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
                  <AlertDialogDescription>This permanently removes it from your system. This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={del} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-btn">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Row 2: Metadata */}
        <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
          <span className="text-[11px] uppercase text-neutral-500 font-semibold tracking-wider flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-md">
            <Icon className="h-3.5 w-3.5" /> {label}
          </span>
          <span className="text-sm text-neutral-300">&middot;</span>
          <span className="text-xs text-neutral-500">{timeAgo(item.created_at)}</span>
          
          {item.group_name && !editing && (
            <>
              <span className="text-sm text-neutral-300">&middot;</span>
              <span 
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase"
                style={{ backgroundColor: `${item.group_color}20`, color: item.group_color }}
              >
                {item.group_name}
              </span>
            </>
          )}

          {item.category && !editing && (
            <>
              <span className="text-sm text-neutral-300">&middot;</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                {item.category}
              </span>
            </>
          )}
          
          {!editing && (item.keywords || []).slice(0, 3).map((k) => (
            <span key={k} className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100/50 rounded-md px-2 py-0.5">
              #{k}
            </span>
          ))}
        </div>

        {item.status === "failed" && (
          <div className="flex items-center justify-between gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-1">
            <span className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" /> AI processing failed. Your content is safe.
            </span>
            <Button size="sm" variant="outline" onClick={retry} className="bg-white" data-testid="retry-btn">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
            </Button>
          </div>
        )}
        {item.status === "processing" && (
          <p className="text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mt-1 flex items-center gap-2 font-medium">
            <Loader2 className="h-4 w-4 animate-spin" /> Understanding your memory...
          </p>
        )}
      </div>

      """
content = header_old_pattern.sub(header_new, content)

with open(path, "w", encoding="utf8") as f: f.write(content)

print("ItemDetailView patched")
