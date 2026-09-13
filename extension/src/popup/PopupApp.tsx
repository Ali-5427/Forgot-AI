import { useEffect, useState, useRef } from "react";
import { Brain, ExternalLink, LogOut, Send, Plus, Loader2 } from "lucide-react";
import { api, request } from "../lib/api";
import { CONFIG } from "../lib/config";
import { clearSession, getSession, onSessionChange } from "../lib/storage";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export default function PopupApp() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Save State
  const [saveText, setSaveText] = useState("");
  const [saving, setSaving] = useState(false);

  // Chat State
  const [chatQuery, setChatQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatting, setChatting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSession().then((s) => {
      setEmail(s?.user.email || null);
      setLoading(false);
    });
    const off = onSessionChange((s) => setEmail(s?.user.email || null));
    return off;
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatting]);

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

  const handleSave = async () => {
    if (!saveText.trim() || saving) return;
    setSaving(true);
    try {
      await api.createMemory({
        original_content: saveText.trim(),
        capture_type: "text",
        source_url: "",
        source_title: "Manual Note",
        source_domain: "forgot.ai"
      } as any);
      setSaveText("");
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setSaving(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim() || chatting) return;
    const q = chatQuery.trim();
    setChatQuery("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setChatting(true);
    try {
      const res = await request<{ answer: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ query: q }),
        auth: true,
      });
      setMessages((prev) => [...prev, { role: "ai", content: res.answer }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "ai", content: "Sorry, I couldn't process that right now." }]);
    } finally {
      setChatting(false);
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
    <div className="flex flex-col h-screen bg-bg text-textPrimary overflow-hidden font-sans">
      {/* Header */}
      <div className="flex-none p-4 border-b border-border bg-surface flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2 font-bold text-[15px]">
          <div className="w-7 h-7 bg-neutral-900 rounded-md flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          Forgot AI
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openApp} title="Open App" className="p-2 rounded-md text-textSecondary hover:bg-surfaceHover transition-colors">
            <ExternalLink className="w-4 h-4" />
          </button>
          <button onClick={logout} title="Log out" className="p-2 rounded-md text-textSecondary hover:bg-surfaceHover hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {/* Quick Save */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider text-textMuted uppercase">Quick Save</h3>
          <div className="relative">
            <textarea
              value={saveText}
              onChange={(e) => setSaveText(e.target.value)}
              placeholder="Paste a link or type a note..."
              className="w-full bg-surface border border-border rounded-xl p-3 pb-10 text-sm focus:outline-none focus:border-textPrimary resize-none min-h-[90px] shadow-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
            <button
              onClick={handleSave}
              disabled={!saveText.trim() || saving}
              className="absolute bottom-2 right-2 p-1.5 bg-textPrimary text-bg rounded-lg disabled:opacity-50 hover:bg-neutral-800 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <hr className="border-border" />

        {/* Chat Thread */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold tracking-wider text-textMuted uppercase">Ask your memory</h3>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-sm text-textMuted bg-surface/50 rounded-xl border border-dashed border-border">
              No messages yet.<br/> Ask me about what you've saved!
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === 'user' ? 'bg-neutral-900 text-white rounded-br-sm' : 'bg-surface border border-border rounded-bl-sm text-textPrimary'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatting && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-textMuted animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-textMuted animate-bounce" style={{animationDelay: '150ms'}} />
                    <div className="w-1.5 h-1.5 rounded-full bg-textMuted animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Input */}
      <div className="flex-none p-4 pt-2 bg-bg border-t border-border">
        <form onSubmit={handleChat} className="relative">
          <input
            type="text"
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            placeholder="Ask AI..."
            className="w-full bg-surface border border-border rounded-full py-2.5 pl-4 pr-10 text-[13px] focus:outline-none focus:border-textPrimary shadow-sm"
          />
          <button
            type="submit"
            disabled={!chatQuery.trim() || chatting}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-neutral-900 text-white rounded-full disabled:opacity-50 hover:bg-neutral-800 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}


