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
  Loader2, Trash2, Pencil, ExternalLink, Sparkles, RefreshCw, AlertTriangle, X, Send, Check, Pin, Link as LinkIcon, MessageSquare, ArrowLeft, FileText, Image as ImageIcon, Link2, Network, Copy, RotateCcw, Edit2, Square
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ItemCard } from "@/components/ItemCard";

const QUICK = ["What is this?", "Key points?", "How can I use this?"];

export const ItemDetailView = ({ itemId, onClose }) => {
  const { updateItemLocal, deleteItemLocal, togglePin, openItem, items } = useStore();
  const cachedItem = items.find(i => i.id === itemId);
  const [item, setItem] = useState(cachedItem || null);
  const [related, setRelated] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);

  const [copiedIdx, setCopiedIdx] = useState(null);

  const abortControllerRef = useRef(null);
  const chatInputRef = useRef(null);

  const handleMsgCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleRetry = (index) => {
    const targetUserMsg = chatHistory[index - 1];
    if (targetUserMsg && targetUserMsg.role === 'user') {
      setChatHistory(prev => prev.slice(0, index - 1));
      ask(targetUserMsg.content);
    }
  };

  const handleEdit = (text) => {
    setQuestion(text);
    chatInputRef.current?.focus();
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (itemId) {
      setEditing(false);
      setQuestion("");
      setChatHistory([]);
      setRelated([]);
      
      // Instantly load from cache to eliminate the 5s loading delay
      const cached = items.find(i => i.id === itemId);
      if (cached) setItem(cached);
      
      api.getItem(itemId).then(setItem).catch(console.error);
      api.related(itemId).then(setRelated).catch(() => setRelated([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const updates = {
      title: form.title,
      summary: form.summary,
      category: form.category,
      keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
    };
    // Optimistic local update
    setItem((prev) => ({ ...prev, ...updates }));
    updateItemLocal(item.id, updates);
    setEditing(false);
    toast.success("Saved changes ✓");
    
    // Background sync
    try {
      await api.updateItem(item.id, updates);
    } catch (err) {
      toast.error("Failed to save changes");
    }
  };

  const del = async () => {
    // Optimistic local update
    deleteItemLocal(item.id);
    toast.success("Deleted");
    onClose();
    
    // Background sync
    try {
      await api.deleteItem(item.id);
    } catch (err) {
      toast.error("Failed to delete item");
    }
  };

  const retry = async () => {
    // Optimistic local update for status
    setItem((prev) => ({ ...prev, status: "processing" }));
    updateItemLocal(item.id, { status: "processing" });
    toast.message("Re-processing…");
    
    try {
      const r = await api.retryItem(item.id);
      setItem(r);
      updateItemLocal(item.id, r);
    } catch (err) {
      setItem((prev) => ({ ...prev, status: "failed" }));
      updateItemLocal(item.id, { status: "failed" });
      toast.error("Failed to retry");
    }
  };

  const ask = async (q) => {
    const query = q || question;
    if (!query.trim() || asking) return;
    
    setQuestion("");
    setAsking(true);
    
    // Create a copy of the history *before* adding the current question to send to the API
    const historyToSend = chatHistory.map(m => ({ role: m.role, content: m.content }));
    
    setChatHistory(prev => [
      ...prev, 
      { role: "user", content: query },
      { role: "ai", content: "", thinking: true }
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await api.ask(item.id, query, historyToSend, (chunk) => {
        setChatHistory(prev => {
          const newHistory = [...prev];
          const lastMsg = newHistory[newHistory.length - 1];
          lastMsg.content = chunk;
          lastMsg.thinking = false;
          return newHistory;
        });
      }, controller.signal);
    } catch (e) {
      if (e.name === 'AbortError') return;
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
      abortControllerRef.current = null;
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
        <div className="md:w-1/2 flex flex-col overflow-y-auto border-r border-neutral-100 bg-neutral-50/50 p-4 md:p-6">
          <h3 className="text-[11px] uppercase tracking-widest font-bold text-neutral-400 mb-4 flex items-center gap-3 shrink-0">
            <span className="h-px w-6 bg-neutral-200"></span>
            Original Source
            <span className="h-px flex-1 bg-neutral-200"></span>
          </h3>
          
          {item.content_type === "image" && item.image_path && (
            <div className="rounded-2xl border border-neutral-200/60 bg-white p-2 shadow-sm shrink-0">
              <img src={fileUrl(item.image_path)} alt={item.title} className="rounded-xl max-h-[70vh] object-contain w-full" />
            </div>
          )}
          
          {item.content_type === "text" && (
            <div className="relative group text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-700 bg-white border border-neutral-200/60 rounded-2xl p-5 md:p-6 shadow-sm font-serif max-h-[70vh] overflow-auto">
              <Button variant="ghost" size="sm" onClick={() => handleCopy(item.original_text)} className="absolute top-3 right-3 h-8 w-8 p-0 text-neutral-400 hover:text-neutral-900 bg-white/80 backdrop-blur-sm border border-neutral-200/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm rounded-lg" title="Copy">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
              {item.original_text}
            </div>
          )}
          
          {item.content_type === "url" && (
            <div className="bg-white border border-neutral-200/60 rounded-2xl shadow-sm flex flex-col group relative max-h-[70vh] overflow-auto">
              {item.image_path && (
                <div className="w-full h-48 bg-neutral-100 border-b border-neutral-200/60 overflow-hidden shrink-0">
                  <img src={item.image_path} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}
              {item.original_text && (
                <Button variant="ghost" size="sm" onClick={() => handleCopy(item.original_text)} className="absolute top-3 right-3 h-8 w-8 p-0 text-neutral-400 hover:text-neutral-900 bg-white/80 backdrop-blur-sm border border-neutral-200/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm rounded-lg" title="Copy text">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
              <div className="p-6 space-y-4">
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
                  <div className="text-[15px] leading-relaxed text-neutral-600 line-clamp-[25] font-serif pt-2">
                    {item.original_text}
                  </div>
                )}
              </div>
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
              
              {item.why_saved && !editing && (
                <div className="bg-amber-50/80 border border-amber-100 p-5 rounded-2xl flex gap-3">
                  <div className="mt-0.5 text-amber-500">💡</div>
                  <p className="text-[15px] text-amber-900 leading-relaxed font-medium">
                    {item.why_saved}
                  </p>
                </div>
              )}
              
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

            {/* Related Memories */}
            {!editing && related.length > 0 && (
              <section className="pt-6 border-t border-neutral-100">
                <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Network className="w-3.5 h-3.5" /> Related Memories
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {related.map((r) => (
                    <ItemCard key={r.id} item={r} onClick={() => openItem(r)} onPin={() => togglePin(r)} />
                  ))}
                </div>
              </section>
            )}

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
                
                  <div className="space-y-6 pb-6">
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`group flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                          {msg.role === 'ai' && (
                             <img src="/logo.jpg" alt="AI Avatar" className="w-7 h-7 mr-3 mt-0.5 shrink-0 rounded-full object-cover shadow-sm border border-neutral-200" />
                          )}
                          <div 
                            className={`text-[15px] leading-relaxed ${
                              msg.role === 'user' 
                                ? 'max-w-[85%] bg-neutral-900 text-white rounded-3xl rounded-br-md px-5 py-3 shadow-sm' 
                                : msg.error 
                                  ? 'text-red-700' 
                                  : 'max-w-[90%] text-neutral-800'
                            }`}
                          >
                            {msg.thinking ? (
                              <div className="flex items-center gap-1.5 py-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
                                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{animationDelay: '150ms'}} />
                                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{animationDelay: '300ms'}} />
                              </div>
                            ) : msg.role === 'user' ? (
                              msg.content
                            ) : (
                              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-50 prose-pre:text-neutral-800 prose-headings:font-semibold">
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
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className={`flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'pr-2' : 'pl-10'}`}>
                          <button type="button" onClick={() => handleMsgCopy(msg.content, idx)} className="p-1 text-neutral-400 hover:text-neutral-800 transition-colors" title="Copy">
                            {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          {msg.role === 'ai' && !asking && idx === chatHistory.length - 1 && !msg.thinking && (
                            <button type="button" onClick={() => handleRetry(idx)} className="p-1 text-neutral-400 hover:text-neutral-800 transition-colors" title="Retry">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {msg.role === 'user' && !asking && (
                            <button type="button" onClick={() => handleEdit(msg.content)} className="p-1 text-neutral-400 hover:text-neutral-800 transition-colors" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
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
            <div className="shrink-0 p-6 bg-transparent z-10">
              {chatHistory.length === 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="text-[13px] font-medium bg-white hover:bg-neutral-50 text-neutral-700 transition-colors rounded-xl px-2 py-3 border border-neutral-200 text-center shadow-sm"
                      data-testid={`quick-ask-${q}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="relative group w-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full border border-neutral-200/70 bg-white/80 backdrop-blur-xl focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all duration-200">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), ask())}
                  placeholder="Message Forgot AI..."
                  className="w-full bg-transparent py-4 pl-6 pr-14 text-[14px] focus:outline-none placeholder:text-neutral-400 rounded-full"
                  data-testid="ask-input"
                />
                
                {asking ? (
                  <button 
                    type="button"
                    onClick={handleStop} 
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors shadow-sm"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => ask()} 
                    disabled={!question.trim()} 
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 bg-neutral-900 text-white rounded-full disabled:opacity-50 hover:bg-neutral-800 transition-colors shadow-sm"
                    data-testid="ask-submit-btn"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
