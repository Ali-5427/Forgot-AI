import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api, fileUrl } from "@/api";
import { useStore } from "@/store";
import { typeMeta, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import {
  Loader2, Trash2, Pencil, ExternalLink, Sparkles, RefreshCw, AlertTriangle, X, Send, Check, Pin, Link as LinkIcon,
} from "lucide-react";

const QUICK = ["What is this?", "Why did I save this?", "Explain this simply.", "Key points?", "How can I use this?"];

export const ItemDetailDialog = ({ itemId, open, onOpenChange, onChanged }) => {
  const { openItem } = useStore();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (open && itemId) {
      setEditing(false);
      setAnswer("");
      setQuestion("");
      setRelated([]);
      api.getItem(itemId).then(setItem);
      api.related(itemId).then(setRelated).catch(() => setRelated([]));
    }
  }, [open, itemId]);

  if (!item) return null;
  const { label, Icon } = typeMeta(item.content_type);

  const startEdit = () => {
    setForm({
      title: item.title,
      summary: item.summary,
      category: item.category,
      keywords: (item.keywords || []).join(", "),
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    const updated = await api.updateItem(item.id, {
      title: form.title,
      summary: form.summary,
      category: form.category,
      keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
    });
    setItem(updated);
    setEditing(false);
    toast.success("Saved changes ✓");
    onChanged && onChanged();
  };

  const del = async () => {
    await api.deleteItem(item.id);
    toast.success("Deleted");
    onOpenChange(false);
    onChanged && onChanged();
  };

  const retry = async () => {
    const r = await api.retryItem(item.id);
    setItem(r);
    toast.message("Re-processing…");
    onChanged && onChanged();
  };

  const ask = async (q) => {
    const query = q || question;
    if (!query.trim()) return;
    setAsking(true);
    setAnswer("");
    setQuestion(query);
    try {
      const r = await api.ask(item.id, query);
      setAnswer(r.answer);
    } catch {
      setAnswer("Could not get an answer. Try again.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[88vh] overflow-y-auto p-0 gap-0"
        data-testid="item-detail-dialog"
      >
        <DialogTitle className="sr-only">{item.title}</DialogTitle>
        <DialogDescription className="sr-only">Saved item details, AI summary, and actions</DialogDescription>
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="mono-label text-[10px] text-muted-foreground flex items-center gap-1.5">
              <Icon className="h-3 w-3" /> {label} · {timeAgo(item.created_at)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const r = await api.pinItem(item.id, !item.pinned);
                  setItem(r);
                  toast.success(item.pinned ? "Unpinned" : "Pinned to top");
                  onChanged && onChanged();
                }}
                data-testid="pin-item-btn"
                title={item.pinned ? "Unpin" : "Pin to top"}
              >
                <Pin className={`h-3.5 w-3.5 ${item.pinned ? "fill-neutral-900" : ""}`} />
              </Button>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={startEdit} data-testid="edit-item-btn">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="delete-item-btn">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes it from your memory. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={del} data-testid="confirm-delete-btn">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {editing ? (
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="text-lg font-semibold"
              data-testid="edit-title-input"
            />
          ) : (
            <h2 className="text-lg font-semibold text-foreground" data-testid="detail-title">{item.title}</h2>
          )}

          {item.status === "failed" && (
            <div className="mt-3 flex items-center justify-between gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> AI processing failed. Your content is safe.
              </span>
              <Button size="sm" variant="outline" onClick={retry} data-testid="retry-btn">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
              </Button>
            </div>
          )}
          {item.status === "processing" && (
            <p className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Understanding your memory…
            </p>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Original content */}
          <section>
            <p className="mono-label text-[10px] text-muted-foreground mb-2">Original</p>
            {item.content_type === "image" && item.image_path && (
              <img src={fileUrl(item.image_path)} alt={item.title} className="rounded-lg border border-border max-h-80 object-contain bg-neutral-50 w-full" />
            )}
            {item.content_type === "text" && (
              <p className="text-sm whitespace-pre-wrap text-foreground bg-neutral-50 border border-border rounded-lg p-3">
                {item.original_text}
              </p>
            )}
            {item.content_type === "url" && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noreferrer"
                data-testid="open-source-url"
                className="text-sm text-blue-700 hover:underline flex items-center gap-1.5 break-all"
              >
                {item.source_title || item.source_url} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            )}
          </section>

          {/* AI summary + metadata */}
          <section className="space-y-3">
            <div>
              <p className="mono-label text-[10px] text-muted-foreground mb-1">AI Summary</p>
              {editing ? (
                <Textarea value={form.summary} rows={3} onChange={(e) => setForm({ ...form, summary: e.target.value })} data-testid="edit-summary-input" />
              ) : (
                <p className="text-sm text-foreground">{item.summary || "—"}</p>
              )}
            </div>

            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <p className="mono-label text-[10px] text-muted-foreground mb-1">Category</p>
                {editing ? (
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="edit-category-input" />
                ) : (
                  <Badge variant="secondary">{item.category}</Badge>
                )}
              </div>
            </div>

            <div>
              <p className="mono-label text-[10px] text-muted-foreground mb-1">Keywords</p>
              {editing ? (
                <Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="comma, separated" data-testid="edit-keywords-input" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(item.keywords || []).map((k) => (
                    <span key={k} className="text-xs text-muted-foreground bg-neutral-100 rounded px-1.5 py-0.5">#{k}</span>
                  ))}
                  {(item.keywords || []).length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                </div>
              )}
            </div>

            {editing && (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} data-testid="save-edit-btn"><Check className="h-3.5 w-3.5 mr-1.5" />Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5 mr-1.5" />Cancel</Button>
              </div>
            )}
          </section>

          {/* Ask AI */}
          {!editing && (
            <section className="border-t border-border pt-4">
              <p className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Sparkles className="h-4 w-4 text-amber-600" /> Ask AI about this
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="text-xs border border-border rounded-full px-2.5 py-1 hover:bg-neutral-100 transition-colors"
                    data-testid={`quick-ask-${q}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask()}
                  placeholder="Ask anything about this item…"
                  data-testid="ask-input"
                />
                <Button onClick={() => ask()} disabled={asking} data-testid="ask-submit-btn">
                  {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {(asking || answer) && (
                <div className="mt-3 text-sm bg-neutral-50 border border-border rounded-lg p-3 whitespace-pre-wrap" data-testid="ask-answer">
                  {asking ? <span className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</span> : answer}
                </div>
              )}
            </section>
          )}

          {/* Related memories */}
          {!editing && related.length > 0 && (
            <section className="border-t border-border pt-4" data-testid="related-section">
              <p className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <LinkIcon className="h-4 w-4 text-neutral-600" /> Related memories
              </p>
              <div className="space-y-2">
                {related.map((r) => {
                  const rt = typeMeta(r.content_type);
                  return (
                    <button
                      key={r.id}
                      onClick={() => openItem(r.id)}
                      data-testid={`related-${r.id}`}
                      className="w-full text-left border border-border rounded-lg p-2.5 hover:border-neutral-400 transition-colors flex items-center gap-2"
                    >
                      <rt.Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{r.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{r.category}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
