import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, fileUrl } from "@/api";
import { useStore } from "@/store";
import { typeMeta, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import {
  Loader2, Trash2, Pencil, ExternalLink, Sparkles, RefreshCw, AlertTriangle, X, Send, Check, Pin, Link as LinkIcon, MessageSquare
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const QUICK = ["What is this?", "Why did I save this?", "Explain this simply.", "Key points?", "How can I use this?"];

export const ItemDetailDialog = ({ itemId, open, onOpenChange, onChanged }) => {
  const { openItem } = useStore();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [asking, setAsking] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (open && itemId) {
      setEditing(false);
      setQuestion("");
      setChatHistory([]);
      setRelated([]);
      api.getItem(itemId).then(setItem);
      api.related(itemId).then(setRelated).catch(() => setRelated([]));
    }
  }, [open, itemId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

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
    if (!query.trim() || asking) return;
    
    setQuestion("");
    setAsking(true);
    
    setChatHistory(prev => [
      ...prev, 
      { role: "user", content: query },
      { role: "ai", content: "", thinking: true }
    ]);

    try {
      await api.ask(item.id, query, (chunk) => {
        setChatHistory(prev => {
          const newHistory = [...prev];
          const lastMsg = newHistory[newHistory.length - 1];
          lastMsg.content = chunk;
          lastMsg.thinking = false;
          return newHistory;
        });
      });
    } catch {
      setChatHistory(prev => {
        const newHistory = [...prev];
        const lastMsg = newHistory[newHistory.length - 1];
        lastMsg.content = "Could not get an answer. Please try again.";
        lastMsg.thinking = false;
        lastMsg.error = true;
        return newHistory;
      });
    } finally {
      setAsking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background"
        data-testid="item-detail-dialog"
      >
        <DialogTitle className="sr-only">{item.title}</DialogTitle>
        <DialogDescription className="sr-only">Saved item details, AI summary, and actions</DialogDescription>
        
        {/* Header - Fixed */}
        <div className="p-5 border-b border-border shrink-0 bg-background z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="mono-label text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center gap-1.5 bg-neutral-100 px-2 py-1 rounded-md">
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
                className="hover:bg-neutral-100"
              >
                <Pin className={`h-4 w-4 ${item.pinned ? "fill-neutral-900" : "text-neutral-500"}`} />
              </Button>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={startEdit} data-testid="edit-item-btn" className="hover:bg-neutral-100 text-neutral-500">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="delete-item-btn" className="hover:bg-red-50 hover:text-red-600 text-neutral-500">
                    <Trash2 className="h-4 w-4" />
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
                    <AlertDialogAction onClick={del} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-btn">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {editing ? (
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="text-xl font-semibold shadow-sm"
              data-testid="edit-title-input"
            />
          ) : (
            <h2 className="text-2xl font-bold text-neutral-900 leading-tight" data-testid="detail-title">{item.title}</h2>
          )}

          {item.status === "failed" && (
            <div className="flex items-center justify-between gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
              <span className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" /> AI processing failed. Your content is safe.
              </span>
              <Button size="sm" variant="outline" onClick={retry} className="bg-white" data-testid="retry-btn">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
              </Button>
            </div>
          )}
          {item.status === "processing" && (
            <p className="text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 flex items-center gap-2 font-medium">
              <Loader2 className="h-4 w-4 animate-spin" /> Understanding your memory…
            </p>
          )}
        </div>

        {/* 2-Column Split Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* LEFT COLUMN: Original Content */}
          <div className="md:w-5/12 flex flex-col overflow-y-auto border-r border-border bg-neutral-50/30 p-6">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-4 flex items-center gap-2">
              <span className="h-px w-4 bg-neutral-200"></span>
              Original Source
              <span className="h-px flex-1 bg-neutral-200"></span>
            </h3>
            
            {item.content_type === "image" && item.image_path && (
              <div className="rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
                <img src={fileUrl(item.image_path)} alt={item.title} className="rounded-lg max-h-[60vh] object-contain w-full" />
              </div>
            )}
            
            {item.content_type === "text" && (
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-700 bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
                {item.original_text}
              </div>
            )}
            
            {item.content_type === "url" && (
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="open-source-url"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-start gap-2 break-all bg-blue-50/50 p-3 rounded-lg border border-blue-100 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 shrink-0 mt-0.5" />
                  {item.source_title || item.source_url} 
                </a>
                {item.original_text && (
                  <div className="text-sm text-neutral-600 line-clamp-[20]">
                    {item.original_text}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: AI Analysis & Chat */}
          <div className="md:w-7/12 flex flex-col overflow-hidden bg-white">
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* AI Analysis Section */}
              <section className="space-y-5">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-neutral-400 flex items-center gap-2">
                  <span className="h-px w-4 bg-neutral-200"></span>
                  AI Analysis
                  <span className="h-px flex-1 bg-neutral-200"></span>
                </h3>
                
                <div>
                  <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-2">Summary</p>
                  {editing ? (
                    <Textarea value={form.summary} rows={3} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="shadow-sm" data-testid="edit-summary-input" />
                  ) : (
                    <p className="text-[15px] text-neutral-700 leading-relaxed">{item.summary || "—"}</p>
                  )}
                </div>

                <div className="flex gap-6 flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-2">Category</p>
                    {editing ? (
                      <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="shadow-sm" data-testid="edit-category-input" />
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-2">Tags & Keywords</p>
                  {editing ? (
                    <Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="comma, separated" className="shadow-sm" data-testid="edit-keywords-input" />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(item.keywords || []).map((k) => (
                        <span key={k} className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                          #{k}
                        </span>
                      ))}
                      {(item.keywords || []).length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                    </div>
                  )}
                </div>

                {editing && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={saveEdit} className="bg-neutral-900 text-white shadow-sm" data-testid="save-edit-btn"><Check className="h-4 w-4 mr-1.5" />Save changes</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1.5" />Cancel</Button>
                  </div>
                )}
              </section>

              {/* Related Memories */}
              {!editing && related.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-neutral-400 flex items-center gap-2">
                    <span className="h-px w-4 bg-neutral-200"></span>
                    Related Memories
                    <span className="h-px flex-1 bg-neutral-200"></span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {related.map((r) => {
                      const rt = typeMeta(r.content_type);
                      return (
                        <button
                          key={r.id}
                          onClick={() => openItem(r.id)}
                          data-testid={`related-${r.id}`}
                          className="text-left border border-neutral-200 bg-white rounded-xl p-3 hover:border-blue-300 hover:shadow-sm hover:ring-1 hover:ring-blue-100 transition-all flex flex-col gap-1.5 group"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <rt.Icon className="h-3.5 w-3.5 text-neutral-400 group-hover:text-blue-500 transition-colors shrink-0" />
                            <span className="text-[10px] font-medium text-neutral-500 group-hover:text-blue-600 transition-colors uppercase tracking-wider">{r.category}</span>
                          </div>
                          <span className="text-sm font-medium text-neutral-800 truncate w-full">{r.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Chat History */}
              {!editing && chatHistory.length > 0 && (
                <section className="space-y-4 pt-4">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-neutral-400 flex items-center gap-2">
                    <span className="h-px w-4 bg-neutral-200"></span>
                    Chat
                    <span className="h-px flex-1 bg-neutral-200"></span>
                  </h3>
                  <div className="space-y-5">
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm overflow-hidden ${
                            msg.role === 'user' 
                              ? 'bg-neutral-900 text-white rounded-br-sm' 
                              : msg.error 
                                ? 'bg-red-50 text-red-700 border border-red-100 rounded-bl-sm' 
                                : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-sm'
                          }`}
                        >
                          {msg.thinking ? (
                            <span className="flex items-center gap-2 text-neutral-500 font-medium">
                              <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                            </span>
                          ) : msg.role === 'user' ? (
                            msg.content
                          ) : (
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                                a: ({node, ...props}) => <a className="text-blue-600 hover:underline font-medium" target="_blank" rel="noreferrer" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                                h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-2 mt-3" {...props} />,
                                table: ({node, ...props}) => <div className="overflow-x-auto mb-3 border border-neutral-200 rounded"><table className="w-full text-left border-collapse text-[13px]" {...props} /></div>,
                                th: ({node, ...props}) => <th className="border-b border-neutral-200 p-2 font-semibold bg-neutral-50" {...props} />,
                                td: ({node, ...props}) => <td className="border-b border-neutral-200 p-2" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-3 border-neutral-300 pl-3 italic text-neutral-500 mb-3" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-semibold text-neutral-900" {...props} />,
                                code: ({node, inline, ...props}) => inline 
                                  ? <code className="bg-neutral-100 text-pink-600 px-1 py-0.5 rounded text-[12px] font-mono" {...props} />
                                  : <code className="block bg-neutral-900 text-neutral-100 p-3 rounded-lg text-[13px] font-mono overflow-x-auto mb-3" {...props} />
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </section>
              )}
            </div>

            {/* Fixed Bottom Input Area */}
            {!editing && (
              <div className="shrink-0 p-5 bg-white border-t border-neutral-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-10">
                {chatHistory.length === 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {QUICK.map((q) => (
                      <button
                        key={q}
                        onClick={() => ask(q)}
                        className="text-[12px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-colors rounded-full px-3.5 py-1.5 flex items-center gap-1.5 border border-amber-200/50"
                        data-testid={`quick-ask-${q}`}
                      >
                        <Sparkles className="h-3 w-3" />
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2 bg-neutral-50 p-1 rounded-xl border border-neutral-200 focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-100 transition-all">
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), ask())}
                    placeholder="Ask AI anything about this memory..."
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-[14px]"
                    data-testid="ask-input"
                  />
                  <Button 
                    onClick={() => ask()} 
                    disabled={asking || !question.trim()} 
                    className="rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white shrink-0 h-10 w-10 p-0"
                    data-testid="ask-submit-btn"
                  >
                    {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
