import { useState, useEffect, useRef } from "react";
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
  Loader2, Trash2, Pencil, ExternalLink, Sparkles, RefreshCw, AlertTriangle, X, Send, Check, Pin, Link as LinkIcon, MessageSquare, ArrowLeft
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const QUICK = ["What is this?", "Why did I save this?", "Explain this simply.", "Key points?", "How can I use this?"];

export const ItemDetailView = ({ itemId, onClose, onChanged }) => {
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
    if (itemId) {
      setEditing(false);
      setQuestion("");
      setChatHistory([]);
      setRelated([]);
      api.getItem(itemId).then(setItem);
      api.related(itemId).then(setRelated).catch(() => setRelated([]));
    }
  }, [itemId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  if (!item) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }
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
    onClose();
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
    <div className="flex flex-col h-screen bg-white w-full overflow-hidden animate-in slide-in-from-right-8 duration-300">
      {/* Header - Fixed */}
      <div className="p-6 border-b border-neutral-100 shrink-0 bg-white z-10 flex flex-col gap-4 shadow-sm">
        
        {/* Top Actions Row */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-neutral-100 text-neutral-500 -ml-2 h-8 px-2 gap-1.5" data-testid="back-btn">
            <ArrowLeft className="h-4 w-4" /> Back to memories
          </Button>

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
                  <AlertDialogDescription>
                    This permanently removes it from your system. This cannot be undone.
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

        {/* Title and Metadata */}
        <div className="flex flex-col gap-2">
          {editing ? (
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="text-2xl font-bold shadow-sm h-12"
              data-testid="edit-title-input"
            />
          ) : (
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight leading-tight" data-testid="detail-title">{item.title}</h2>
          )}

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[11px] uppercase text-neutral-500 font-semibold tracking-wider flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-md">
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
            <span className="text-sm text-neutral-400">·</span>
            <span className="text-sm text-neutral-500">{timeAgo(item.created_at)}</span>
            
            {/* Metadata Tags */}
            {item.category && !editing && (
              <>
                <span className="text-sm text-neutral-400">·</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                  {item.category}
                </span>
              </>
            )}
            {!editing && (item.keywords || []).slice(0, 3).map((k) => (
              <span key={k} className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100/50 rounded-md px-2 py-1">
                #{k}
              </span>
            ))}
          </div>
        </div>

        {item.status === "failed" && (
          <div className="flex items-center justify-between gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-2">
            <span className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" /> AI processing failed. Your content is safe.
            </span>
            <Button size="sm" variant="outline" onClick={retry} className="bg-white" data-testid="retry-btn">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
            </Button>
          </div>
        )}
        {item.status === "processing" && (
          <p className="text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mt-2 flex items-center gap-2 font-medium">
            <Loader2 className="h-4 w-4 animate-spin" /> Understanding your memory…
          </p>
        )}
      </div>

      {/* 2-Column Split Content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        {/* LEFT COLUMN: Original Content */}
        <div className="md:w-1/2 flex flex-col overflow-y-auto border-r border-neutral-100 bg-neutral-50/50 p-8">
          <h3 className="text-[11px] uppercase tracking-widest font-bold text-neutral-400 mb-6 flex items-center gap-3">
            <span className="h-px w-6 bg-neutral-200"></span>
            Original Source
            <span className="h-px flex-1 bg-neutral-200"></span>
          </h3>
          
          {item.content_type === "image" && item.image_path && (
            <div className="rounded-2xl border border-neutral-200/60 bg-white p-2 shadow-sm">
              <img src={fileUrl(item.image_path)} alt={item.title} className="rounded-xl max-h-[70vh] object-contain w-full" />
            </div>
          )}
          
          {item.content_type === "text" && (
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-700 bg-white border border-neutral-200/60 rounded-2xl p-6 shadow-sm font-serif">
              {item.original_text}
            </div>
          )}
          
          {item.content_type === "url" && (
            <div className="bg-white border border-neutral-200/60 rounded-2xl p-6 shadow-sm space-y-4">
              <a
                href={item.source_url}
                target="_blank"
                rel="noreferrer"
                data-testid="open-source-url"
                className="text-[15px] font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-start gap-2 break-all bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 transition-colors"
              >
                <ExternalLink className="h-4 w-4 shrink-0 mt-0.5" />
                {item.source_title || item.source_url} 
              </a>
              {item.original_text && (
                <div className="text-[15px] leading-relaxed text-neutral-600 line-clamp-[25] font-serif">
                  {item.original_text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AI Analysis & Chat */}
        <div className="md:w-1/2 flex flex-col overflow-hidden bg-white">
          
          <div className="flex-1 overflow-y-auto p-8 space-y-10">
            {/* AI Summary Section (Only show if not editing, or always show editor) */}
            <section className="space-y-4">
              <h3 className="text-[11px] uppercase tracking-widest font-bold text-neutral-400 flex items-center gap-3">
                <span className="h-px w-6 bg-neutral-200"></span>
                AI Summary
                <span className="h-px flex-1 bg-neutral-200"></span>
              </h3>
              
              <div>
                {editing ? (
                  <Textarea value={form.summary} rows={4} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="shadow-sm bg-neutral-50" data-testid="edit-summary-input" />
                ) : (
                  <p className="text-[15px] text-neutral-700 leading-relaxed bg-neutral-50/50 border border-neutral-100 p-5 rounded-2xl">{item.summary || "—"}</p>
                )}
              </div>

              {editing && (
                <>
                  <div className="flex gap-6 flex-wrap pt-2">
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Category</p>
                      <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="shadow-sm bg-neutral-50" data-testid="edit-category-input" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Tags & Keywords</p>
                    <Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="comma, separated" className="shadow-sm bg-neutral-50" data-testid="edit-keywords-input" />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button size="sm" onClick={saveEdit} className="bg-neutral-900 text-white shadow-sm" data-testid="save-edit-btn"><Check className="h-4 w-4 mr-1.5" />Save changes</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1.5" />Cancel</Button>
                  </div>
                </>
              )}
            </section>

            {/* Chat History */}
            {!editing && (
              <section className="space-y-6">
                {chatHistory.length > 0 && (
                  <h3 className="text-[11px] uppercase tracking-widest font-bold text-neutral-400 flex items-center gap-3">
                    <span className="h-px w-6 bg-neutral-200"></span>
                    Chat
                    <span className="h-px flex-1 bg-neutral-200"></span>
                  </h3>
                )}
                
                <div className="space-y-6">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[88%] rounded-[20px] px-5 py-4 text-[15px] leading-relaxed shadow-sm overflow-hidden ${
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
                              p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                              a: ({node, ...props}) => <a className="text-blue-600 hover:underline font-medium" target="_blank" rel="noreferrer" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1.5" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1.5" {...props} />,
                              h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 mt-5 first:mt-0" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3 mt-5 first:mt-0" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-4" {...props} />,
                              table: ({node, ...props}) => <div className="overflow-x-auto mb-4 border border-neutral-200 rounded-lg"><table className="w-full text-left border-collapse text-[14px]" {...props} /></div>,
                              th: ({node, ...props}) => <th className="border-b border-neutral-200 p-3 font-semibold bg-neutral-50" {...props} />,
                              td: ({node, ...props}) => <td className="border-b border-neutral-200 p-3" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className="border-l-3 border-neutral-300 pl-4 italic text-neutral-500 mb-4" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold text-neutral-900" {...props} />,
                              code: ({node, inline, ...props}) => inline 
                                ? <code className="bg-neutral-100 text-pink-600 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props} />
                                : <code className="block bg-neutral-900 text-neutral-100 p-4 rounded-xl text-[14px] font-mono overflow-x-auto mb-4 leading-normal" {...props} />
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
            <div className="shrink-0 p-6 bg-white border-t border-neutral-100 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.03)] z-10">
              {chatHistory.length === 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="text-[13px] font-medium bg-neutral-50 hover:bg-neutral-100 text-neutral-700 transition-colors rounded-full px-4 py-2 border border-neutral-200"
                      data-testid={`quick-ask-${q}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2 bg-neutral-50 p-1.5 rounded-2xl border border-neutral-200 focus-within:border-neutral-400 focus-within:ring-4 focus-within:ring-neutral-100/50 transition-all shadow-sm">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), ask())}
                  placeholder="Message Forgot AI..."
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-[15px] shadow-none h-11"
                  data-testid="ask-input"
                />
                <Button 
                  onClick={() => ask()} 
                  disabled={asking || !question.trim()} 
                  className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white shrink-0 h-11 w-11 p-0 transition-transform active:scale-95"
                  data-testid="ask-submit-btn"
                >
                  {asking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
