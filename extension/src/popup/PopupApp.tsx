import { useState, useEffect, useRef } from "react";
import { Brain, Send, Plus, Loader2, ExternalLink, LogOut, X, Image as ImageIcon, Copy, Check, RotateCcw, Edit2, Square, Settings } from "lucide-react";
import { api, request, fetchStream } from "../lib/api";
import { CONFIG } from "../lib/config";
import { clearSession, getSession, onSessionChange } from "../lib/storage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export default function PopupApp() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  
  const [chatQuery, setChatQuery] = useState("");
  const [chatting, setChatting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contextIds, setContextIds] = useState<string[]>([]);
  
  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveText, setSaveText] = useState("");
  const [userNote, setUserNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getSession().then((s) => {
      setEmail(s?.user?.email || null);
      setLoading(false);
    });
    const off = onSessionChange((s) => setEmail(s?.user?.email || null));
    return off;
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatting]);

  useEffect(() => {
    if (chatInputRef.current) {
      const el = chatInputRef.current;
      if (!chatQuery) {
        el.style.height = "auto";
        el.style.overflowY = "hidden";
        return;
      }
      const MAX_CHAT_INPUT_PX = 160;
      el.style.height = "0px";
      const next = Math.min(el.scrollHeight, MAX_CHAT_INPUT_PX);
      el.style.height = next + "px";
      el.style.overflowY = el.scrollHeight > MAX_CHAT_INPUT_PX ? "auto" : "hidden";
    }
  }, [chatQuery]);

  const openAuth = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/auth/index.html") });
  };
  const openApp = () => {
    chrome.tabs.create({ url: CONFIG.APP_URL });
  };
  const logout = async () => {
    await api.logout();
    await clearSession();
    setEmail(null);
  };

  const handleSmartSave = async () => {
    if (saving) return;
    if (!file && !saveText.trim()) return;
    
    setSaving(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        if (userNote) fd.append("user_note", userNote);
        await api.saveImage(fd);
      } else if (saveText.trim().startsWith("http")) {
        await api.saveUrl({ url: saveText.trim(), user_note: userNote });
      } else {
        await api.saveText({ text: saveText.trim(), user_note: userNote });
      }
      // Reset and close
      setSaveText("");
      setUserNote("");
      setFile(null);
      setIsSaveModalOpen(false);
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleRetry = (index: number) => {
    const targetUserMsg = messages[index - 1];
    if (targetUserMsg && targetUserMsg.role === 'user') {
      setMessages(prev => prev.slice(0, index - 1));
      handleChat(null, targetUserMsg.content);
    }
  };

  const handleEdit = (text: string) => {
    setChatQuery(text);
    chatInputRef.current?.focus();
  };

  const handleChat = async (e: React.FormEvent | null, retryQuery?: string) => {
    if (e) e.preventDefault();
    const q = retryQuery || chatQuery.trim();
    if (!q || chatting) return;
    
    const historyToSend = messages.map(m => ({ role: m.role, content: m.content }));

    if (!retryQuery) {
      setChatQuery("");
      setMessages((prev) => [...prev, { role: "user", content: q }]);
    }
    setChatting(true);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetchStream("/api/chat", {
        method: "POST",
        body: JSON.stringify({ query: q, stream: true, history: historyToSend, context_item_ids: contextIds }),
        signal: controller.signal
      });

      if (!res.body) throw new Error("No response body");
      const idsHeader = res.headers.get("X-Context-Ids");
      if (idsHeader) setContextIds(idsHeader.split(",").filter(Boolean));

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let answerText = "";
      setMessages((prev) => [...prev, { role: "ai", content: "" }]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        answerText += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "ai", content: answerText };
          return updated;
        });
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === "ai" && updated[updated.length - 1].content) {
          updated[updated.length - 1].content += "\n\n*(Error: Connection lost)*";
        } else if (updated[updated.length - 1]?.role === "user") {
          updated.push({ role: "ai", content: "Sorry, I couldn't process that right now." });
        }
        return updated;
      });
    } finally {
      setChatting(false);
      abortControllerRef.current = null;
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-textMuted flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Loading...</div>;
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg p-6 space-y-6 text-center">
        <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-textPrimary">Forgot AI</h2>
          <p className="text-sm text-textSecondary">Sign in to start saving your memory.</p>
        </div>
        <button onClick={openAuth} className="w-full bg-textPrimary text-bg font-semibold text-sm rounded-lg py-3 px-4">
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white text-neutral-900 overflow-hidden font-sans relative">
      
      {/* Save Overlay Modal */}
      {isSaveModalOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex-none p-4 border-b border-neutral-100 flex justify-between items-center bg-white">
              <h2 className="font-bold text-[15px]">Save to Memory</h2>
              <button onClick={() => setIsSaveModalOpen(false)} className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {!file ? (
                <textarea
                  value={saveText}
                  onChange={(e) => setSaveText(e.target.value)}
                  placeholder="Paste a link or type a note..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-[14px] min-h-[120px] focus:outline-none focus:border-neutral-300 focus:bg-white transition-all placeholder:text-neutral-400"
                />
              ) : (
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <button onClick={() => setFile(null)} className="text-neutral-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              )}

              {!file && !saveText && (
                <button onClick={() => fileRef.current?.click()} className="w-full py-4 border-2 border-dashed border-neutral-200 rounded-2xl text-neutral-500 text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors">
                  <ImageIcon className="w-4 h-4" /> Upload Screenshot / Image
                </button>
              )}
              <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />

              <div className="pt-2">
                <input
                  type="text"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="Why are you saving this? (Optional)"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 text-[13px] focus:outline-none focus:border-neutral-300 focus:bg-white transition-all placeholder:text-neutral-400"
                />
              </div>
            </div>
            
            <div className="flex-none p-4 pb-6 bg-white border-t border-neutral-100">
              <button
                onClick={handleSmartSave}
                disabled={(!file && !saveText.trim()) || saving}
                className="w-full py-3.5 bg-neutral-900 text-white rounded-2xl font-semibold disabled:opacity-50 hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-none p-4 border-b border-neutral-200 bg-white flex items-center justify-between shadow-sm z-10 relative">
        <div className="flex items-center gap-2 font-bold text-[15px] tracking-tight">
          <div className="w-7 h-7 bg-neutral-900 rounded-md flex items-center justify-center shadow-sm">
            <Brain className="w-4 h-4 text-white" />
          </div>
          Forgot AI
        </div>
        
        {/* Settings Menu */}
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className={`p-2 rounded-full transition-colors ${isMenuOpen ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
            title="Menu"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          {isMenuOpen && (
            <>
              {/* Invisible overlay to catch clicks outside */}
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              
              <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={() => { openApp(); setIsMenuOpen(false); }} 
                  className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-neutral-500" />
                  Open Dashboard
                </button>
                <div className="h-[1px] bg-neutral-100 w-full my-0.5"></div>
                <button 
                  onClick={() => { logout(); setIsMenuOpen(false); }} 
                  className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-32" ref={scrollRef}>
        {/* Chat Thread */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10 text-sm text-neutral-400 bg-white rounded-2xl border border-dashed border-neutral-200">
              No messages yet.<br/> Ask me about what you've saved!
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`group flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                    {msg.role === 'ai' && (
                       <div className="w-7 h-7 mr-3 mt-0.5 shrink-0 bg-neutral-900 rounded-full flex items-center justify-center shadow-sm">
                         <Brain className="w-3.5 h-3.5 text-white" />
                       </div>
                    )}
                    <div className={`text-[14px] leading-relaxed ${
                      msg.role === 'user' ? 'max-w-[85%] bg-neutral-900 text-white rounded-3xl rounded-br-md px-4 py-3 shadow-sm' : 'max-w-[90%] text-neutral-800'
                    }`}>
                      {msg.role === 'ai' ? (
                        <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-50 prose-pre:text-neutral-800 prose-headings:font-semibold">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({node, ...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className={`flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'pr-2' : 'pl-10'}`}>
                    <button type="button" onClick={() => handleCopy(msg.content, i)} className="p-1 text-neutral-400 hover:text-neutral-800 transition-colors" title="Copy">
                      {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {msg.role === 'ai' && !chatting && i === messages.length - 1 && (
                      <button type="button" onClick={() => handleRetry(i)} className="p-1 text-neutral-400 hover:text-neutral-800 transition-colors" title="Retry">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {msg.role === 'user' && !chatting && (
                      <button type="button" onClick={() => handleEdit(msg.content)} className="p-1 text-neutral-400 hover:text-neutral-800 transition-colors" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {chatting && messages[messages.length - 1]?.role !== 'ai' && (
                <div className="flex justify-start items-center">
                   <div className="w-7 h-7 mr-3 shrink-0 bg-neutral-900 rounded-full flex items-center justify-center shadow-sm">
                     <Brain className="w-3.5 h-3.5 text-white" />
                   </div>
                  <div className="flex items-center gap-1.5 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{animationDelay: '150ms'}} />
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Glass Chat Input */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none z-10">
        <form onSubmit={handleChat} className="relative group w-full pointer-events-auto shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[24px] border border-neutral-200/70 bg-white/80 backdrop-blur-xl focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all duration-200">
          {/* Plus Button inside left edge */}
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            className="absolute left-1.5 bottom-[5px] p-2.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100/50 transition-colors rounded-full"
            title="Save to Memory"
          >
            <Plus className="w-5 h-5" />
          </button>

          <textarea ref={chatInputRef} rows={1} value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (chatQuery.trim()) handleChat(null); } }} placeholder="Ask AI..." className="w-full bg-transparent py-4 pl-14 pr-14 text-[14px] focus:outline-none placeholder:text-neutral-400 resize-none" />
          
          {chatting ? (
            <button
              type="button"
              onClick={stopStream}
              className="absolute right-1.5 bottom-[5px] p-2.5 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!chatQuery.trim()}
              className="absolute right-1.5 bottom-[5px] p-2.5 bg-neutral-900 text-white rounded-full disabled:opacity-50 hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}




