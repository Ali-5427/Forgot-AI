import { useState, useEffect, useRef } from "react";
import { Brain, Send, Plus, Loader2, ExternalLink, LogOut, X, Image as ImageIcon, Copy, Check, RotateCcw, Edit2, Square, Settings, Link, PenTool, Sparkles, MessageSquare, Calendar, Link2, Menu, SquarePen, PanelLeftClose, Folder, HelpCircle, MessageSquareQuote } from "lucide-react";
import { api, request, fetchStream } from "../lib/api";
import { CONFIG } from "../lib/config";
import { clearSession, getSession, onSessionChange } from "../lib/storage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function getNodeText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (node && typeof node === "object" && "props" in (node as any)) {
    return getNodeText((node as any).props?.children);
  }
  return "";
}

function isUrlLike(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (/^(https?:\/\/|www\.)/i.test(trimmed)) {
    return true;
  }
  return /^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/.*)?$/i.test(trimmed);
}

function isUrlOrMatchesHref(text: string, href?: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (href) {
    const cleanHref = href.trim();
    if (trimmed === cleanHref || trimmed === cleanHref.replace(/^https?:\/\//i, "")) {
      return true;
    }
  }
  return isUrlLike(trimmed);
}

function formatUrlDisplay(rawText: string, href?: string): string {
  try {
    const target = href || (isUrlLike(rawText) ? rawText : "") || rawText;
    const urlObj = new URL(
      target.startsWith("http://") || target.startsWith("https://") ? target : `https://${target}`
    );
    const host = urlObj.port
      ? `${urlObj.hostname.replace(/^www\./, "")}:${urlObj.port}`
      : urlObj.hostname.replace(/^www\./, "");
    const pathname = urlObj.pathname.replace(/\/$/, "");

    if (!pathname || pathname === "") {
      return urlObj.search ? `${host}/…` : host;
    }

    const pathSegments = pathname.split("/").filter(Boolean);
    if (pathSegments.length === 0) {
      return urlObj.search ? `${host}/…` : host;
    }

    if (pathSegments.length === 1) {
      let seg = pathSegments[0];
      try {
        seg = decodeURIComponent(seg);
      } catch {
        // use raw segment
      }
      const shortSeg = seg.length > 20 ? seg.slice(0, 17) + "…" : seg;
      return `${host}/${shortSeg}`;
    }

    let lastSegment = pathSegments[pathSegments.length - 1];
    try {
      lastSegment = decodeURIComponent(lastSegment);
    } catch {
      // use raw segment
    }
    const shortSegment = lastSegment.length > 20 ? lastSegment.slice(0, 17) + "…" : lastSegment;
    return `${host}/…/${shortSegment}`;
  } catch {
    const text = rawText || href || "";
    return text.length > 30 ? text.slice(0, 27) + "…" : text;
  }
}

function ChatLink({
  href,
  children,
  isUser = false,
  node,
  ...props
}: {
  href?: string;
  children?: React.ReactNode;
  isUser?: boolean;
  node?: any;
  [key: string]: any;
}) {
  const [copied, setCopied] = useState(false);

  const fullUrl = href
    ? (/^(https?:\/\/|mailto:)/i.test(href) ? href : `https://${href}`)
    : "";
  const childText = getNodeText(children).trim();

  let displayLabel: string;
  if (!childText || isUrlOrMatchesHref(childText, fullUrl)) {
    displayLabel = formatUrlDisplay(childText || fullUrl, fullUrl);
  } else {
    displayLabel = childText.length > 35 ? childText.slice(0, 32) + "…" : childText;
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const linkColor = isUser
    ? "text-blue-300 hover:text-blue-200"
    : "text-blue-600 hover:text-blue-800";

  const copyButtonColor = isUser
    ? "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
    : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100";

  const { className: _unused, ...domProps } = props;

  return (
    <span className="inline-flex items-center gap-1 max-w-full min-w-0 align-bottom my-0.5">
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={fullUrl}
        className={`${linkColor} underline font-medium truncate min-w-0 transition-colors`}
        {...domProps}
      >
        {displayLabel}
      </a>
      {fullUrl && (
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? "Copied URL!" : "Copy full URL"}
          className={`shrink-0 p-0.5 rounded transition-colors ${copyButtonColor}`}
          aria-label="Copy URL"
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
          ) : (
            <Copy className="w-3 h-3 shrink-0" />
          )}
        </button>
      )}
    </span>
  );
}

function renderMessageWithLinks(content: string, isUser = false) {
  if (!content) return null;

  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(content)) !== null) {
    const matchStart = match.index;
    let matchedUrl = match[0];

    if (matchStart > lastIndex) {
      parts.push(content.slice(lastIndex, matchStart));
    }

    let trailingPunct = "";
    while (matchedUrl.length > 0) {
      const lastChar = matchedUrl.slice(-1);
      if (
        lastChar === ")" &&
        (matchedUrl.match(/\(/g) || []).length >= (matchedUrl.match(/\)/g) || []).length
      ) {
        break;
      }
      if (/[.,;:!?)'"]/.test(lastChar)) {
        trailingPunct = lastChar + trailingPunct;
        matchedUrl = matchedUrl.slice(0, -1);
      } else {
        break;
      }
    }

    const fullHref = /^(https?:\/\/)/i.test(matchedUrl)
      ? matchedUrl
      : `https://${matchedUrl}`;

    parts.push(
      <ChatLink
        key={`${matchStart}-${matchedUrl}`}
        href={fullHref}
        isUser={isUser}
      >
        {matchedUrl}
      </ChatLink>
    );

    if (trailingPunct) {
      parts.push(trailingPunct);
    }

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

export default function PopupApp() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  
  const [chatQuery, setChatQuery] = useState("");
  const [chatting, setChatting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [contextIds, setContextIds] = useState<string[]>([]);

  useEffect(() => {
    chrome.storage.local.get(["extension_conv_id"], async (res) => {
      if (res.extension_conv_id) {
        try {
          const data = await api.getConversation(res.extension_conv_id);
          if (data && data.messages) {
             setConvId(res.extension_conv_id);
             setMessages(data.messages.map((m: any) => ({
               role: m.role,
               content: m.content
             })));
          }
        } catch (e) {
          // Conversation might be deleted or missing
          chrome.storage.local.remove("extension_conv_id");
        }
      }
    });
  }, []);

  
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
  const [inputHeight, setInputHeight] = useState(52);

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
      const MAX_CHAT_INPUT_PX = 160;
      const MIN_HEIGHT = 52;

      if (!chatQuery) {
        el.style.height = MIN_HEIGHT + "px";
        el.style.overflowY = "hidden";
        setInputHeight(MIN_HEIGHT);
        return;
      }
      
      el.style.height = "0px";
      let next = Math.min(el.scrollHeight, MAX_CHAT_INPUT_PX);
      next = Math.max(next, MIN_HEIGHT);
      el.style.height = next + "px";
      el.style.overflowY = el.scrollHeight > MAX_CHAT_INPUT_PX ? "auto" : "hidden";
      setInputHeight(next);
    }
  }, [chatQuery]);

  const startNewChat = () => {
    setMessages([]);
    setChatQuery("");
    setConvId(null);
    chrome.storage.local.remove("extension_conv_id");
  };

  const openAuth = () => {
    chrome.tabs.create({ url: `${CONFIG.APP_URL}/login?source=extension` });
  };
  const openApp = () => {
    chrome.tabs.create({ url: CONFIG.APP_URL });
  };
  const openSettings = () => {
    chrome.tabs.create({ url: `${CONFIG.APP_URL}/settings` });
  };
  const openGuide = () => {
    chrome.tabs.create({ url: `${CONFIG.APP_URL}/#faq` });
  };
  const openFeedback = () => {
    chrome.tabs.create({ url: `${CONFIG.APP_URL}/contact` });
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
      const basePayload: any = { user_note: userNote };

      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        if (userNote) fd.append("user_note", userNote);
        await api.saveImage(fd);
      } else if (saveText.trim().startsWith("http")) {
        await api.saveUrl({ url: saveText.trim(), ...basePayload });
      } else {
        await api.saveText({ text: saveText.trim(), ...basePayload });
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
    
    setChatQuery("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    
    setChatting(true);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetchStream("/api/chat/v2/stream", {
        method: "POST",
        body: JSON.stringify({ query: q, conversation_id: convId || undefined }),
        signal: controller.signal
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let answerText = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      
      let animationFrameId: number | null = null;
      const flushUpdate = () => {
        setMessages((prev) => {
          if (!prev.length) return prev;
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx].role === "assistant" && updated[lastIdx].content !== answerText) {
            updated[lastIdx] = { ...updated[lastIdx], content: answerText };
            return updated;
          }
          return prev;
        });
        animationFrameId = null;
      };

      const scheduleFlush = () => {
        if (animationFrameId === null) {
          animationFrameId = requestAnimationFrame(flushUpdate);
        }
      };

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "token") {
                answerText += data.text;
                scheduleFlush();
              } else if (data.type === "final") {
                if (data.conversation_id) {
                  setConvId(data.conversation_id);
                  chrome.storage.local.set({ extension_conv_id: data.conversation_id });
                }
              } else if (data.type === "error") {
                answerText += "\n\n*(Error: " + (data.text || "Stream error") + ")*";
                scheduleFlush();
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      flushUpdate();
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      let errorMessage = "Sorry, I couldn't process that right now.";
      if (e.message && e.message.includes("401")) {
        errorMessage = "Session expired. Please sign in again.";
      } else if (e.message && (e.message.includes("500") || e.message.includes("502") || e.message.includes("503") || e.message.includes("Failed to fetch"))) {
        errorMessage = "The server is currently busy. Please try again in a moment.";
      }
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === "assistant" && !updated[updated.length - 1].content) {
          updated[updated.length - 1].content = errorMessage;
        } else if (updated[updated.length - 1]?.role === "user") {
          updated.push({ role: "assistant", content: errorMessage });
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

              <div className="pt-2 space-y-2">
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

      {/* Slide-out Navigation Drawer (Apollo SaaS Style) */}
      {isMenuOpen && (
        <div className="absolute inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity duration-200" 
            onClick={() => setIsMenuOpen(false)} 
          />

          {/* Drawer Panel */}
          <div className="relative w-[85%] bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200 border-r border-neutral-200">
            {/* Top & Navigation Section */}
            <div className="flex-1 overflow-y-auto">
              {/* Drawer Header */}
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[15px] tracking-tight text-neutral-900">
                  <div className="w-7 h-7 bg-neutral-900 rounded-md flex items-center justify-center shadow-sm">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  Forgot AI
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)} 
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                  title="Close menu"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="p-3 space-y-1">
                <button 
                  onClick={() => { openApp(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                >
                  <Folder className="w-4 h-4 text-neutral-500" />
                  All Saved Notes
                </button>

                <button 
                  onClick={() => { openSettings(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-neutral-500" />
                  Settings
                </button>

                <button 
                  onClick={() => { openGuide(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                >
                  <HelpCircle className="w-4 h-4 text-neutral-500" />
                  Get Started Guide
                </button>

                <button 
                  onClick={() => { openFeedback(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                >
                  <MessageSquareQuote className="w-4 h-4 text-neutral-500" />
                  Feedback & Support
                </button>
              </div>

              {/* Web App Promo Card */}
              <div className="px-3 pt-2">
                <div className="bg-gradient-to-br from-neutral-50 to-neutral-100/80 border border-neutral-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 tracking-wider uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
                    Web Platform
                  </div>
                  <p className="text-[12px] text-neutral-600 leading-relaxed font-normal">
                    Manage your memory library, search & folders in the web app.
                  </p>
                  <button 
                    onClick={() => { openApp(); setIsMenuOpen(false); }}
                    className="w-full py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-[12px] font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    Open Dashboard
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </button>
                </div>
              </div>
            </div>

            {/* User Profile Footer */}
            <div className="p-3 border-t border-neutral-100 bg-neutral-50/50">
              {email ? (
                <div className="flex items-center justify-between gap-2 p-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-semibold text-[13px] flex items-center justify-center shrink-0 shadow-xs">
                      {email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <span className="text-[13px] font-medium text-neutral-900 truncate leading-tight" title={email}>
                        {email}
                      </span>
                      <span className="text-[11px] text-neutral-400">Signed in</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Log out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { openAuth(); setIsMenuOpen(false); }}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-none px-3.5 py-3 border-b border-neutral-200 bg-white flex items-center justify-between shadow-xs z-10 relative">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsMenuOpen(true)} 
            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            title="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 font-bold text-[15px] tracking-tight text-neutral-900">
            <div className="w-7 h-7 bg-neutral-900 rounded-md flex items-center justify-center shadow-sm">
              <Brain className="w-4 h-4 text-white" />
            </div>
            Forgot AI
          </div>
        </div>
        
        <button 
          onClick={startNewChat} 
          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors" 
          title="New Chat"
        >
          <SquarePen className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-8 pb-32" ref={scrollRef}>
        {/* Chat Thread */}
        <div className="space-y-4">
          {messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center pt-8 pb-4 w-full">
                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                  <div className="w-10 h-10 bg-neutral-100 rounded-2xl flex items-center justify-center mb-3 text-neutral-900 shadow-sm border border-neutral-200/50">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-neutral-800 font-semibold text-[15px]">What's on your mind?</h3>
                  <p className="text-neutral-500 text-[13px] mt-1">Save a memory or ask about your past saves.</p>
                </div>

                {/* Primary Actions Grid */}
                <div className="grid grid-cols-2 gap-3 w-full mb-8">
                  <button
                    onClick={() => {
                      if (window.chrome && chrome.tabs) {
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                          const activeTab = tabs[0];
                          if (activeTab && activeTab.url) {
                            setSaveText(activeTab.url);
                            setIsSaveModalOpen(true);
                          }
                        });
                      }
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-white border border-neutral-200/60 rounded-2xl hover:border-neutral-300 hover:shadow-md transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Link className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-medium text-neutral-800">Save Current Tab</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setSaveText("");
                      setIsSaveModalOpen(true);
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-white border border-neutral-200/60 rounded-2xl hover:border-neutral-300 hover:shadow-md transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <PenTool className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-medium text-neutral-800">Save Note</span>
                  </button>
                </div>

                {/* Suggestion Chips */}
                <div className="w-full flex flex-col items-center">
                  <div className="flex items-center gap-3 w-full mb-4">
                    <div className="h-px bg-neutral-200 flex-1"></div>
                    <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Or ask your memory</span>
                    <div className="h-px bg-neutral-200 flex-1"></div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 w-full px-2">
                    {[
                      { text: "What did I save today?", icon: <Calendar className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform duration-300" />, bgHover: "hover:border-amber-200 hover:bg-amber-50/50" },
                      { text: "Summarize my recent links", icon: <Link2 className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform duration-300" />, bgHover: "hover:border-blue-200 hover:bg-blue-50/50" },
                      { text: "Show me my notes on AI", icon: <Sparkles className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform duration-300" />, bgHover: "hover:border-indigo-200 hover:bg-indigo-50/50" }
                    ].map((chip) => (
                      <button
                        key={chip.text}
                        onClick={() => handleChat(null, chip.text)}
                        className={`group px-3.5 py-2 bg-white border border-neutral-200 rounded-full text-[12px] font-medium text-neutral-600 hover:text-neutral-900 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md ${chip.bgHover}`}
                      >
                        {chip.icon}
                        {chip.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`group flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-full min-w-0`}>
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full min-w-0`}>
                    {msg.role === 'assistant' && (
                       <div className="w-7 h-7 mr-3 mt-0.5 shrink-0 bg-neutral-900 rounded-full flex items-center justify-center shadow-sm">
                         <Brain className="w-3.5 h-3.5 text-white" />
                       </div>
                    )}
                    <div className={`text-[14px] leading-relaxed break-words min-w-0 ${
                      msg.role === 'user' ? 'max-w-[85%] bg-neutral-900 text-white rounded-3xl rounded-br-md px-4 py-3 shadow-sm whitespace-pre-wrap' : 'max-w-[90%] text-neutral-800'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-50 prose-pre:text-neutral-800 prose-headings:font-semibold break-words min-w-0">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({node, ...props}) => <ChatLink isUser={false} {...props} />
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        renderMessageWithLinks(msg.content, true)
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className={`flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'pr-2' : 'pl-10'}`}>
                    <button type="button" onClick={() => handleCopy(msg.content, i)} className="p-1 text-neutral-400 hover:text-neutral-800 transition-colors" title="Copy">
                      {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {msg.role === 'assistant' && !chatting && i === messages.length - 1 && (
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
              {chatting && messages[messages.length - 1]?.role !== 'assistant' && (
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
        <form onSubmit={handleChat} className={`relative group w-full pointer-events-auto shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${inputHeight > 56 ? 'rounded-[24px]' : 'rounded-full'} border border-neutral-200/70 bg-white/80 backdrop-blur-xl focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all duration-200`}>
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












