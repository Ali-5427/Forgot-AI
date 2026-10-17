import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MessageSquare, Plus, Loader2, Sparkles, Sidebar, FileText, Link as LinkIcon, Image as ImageIcon, Trash2 } from "lucide-react";
import { api } from "@/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatV2() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentConvId = searchParams.get("c") || null;
  
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contextItems, setContextItems] = useState([]); // Maps ID to item details
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Load specific conversation when URL changes
  useEffect(() => {
    if (currentConvId) {
      loadChat(currentConvId);
    } else {
      setMessages([]);
      setContextItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConvId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "52px";
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = Math.min(scrollHeight, 160) + "px";
    }
  }, [query]);

  const loadChat = async (id) => {
    try {
      const data = await api.getConversation(id);
      setMessages(data.messages || []);
      // Preload context items if they exist? Currently we fetch them dynamically or rely on the final response, but this is fine for history.
    } catch (e) {
      console.error("Failed to load chat", e);
      navigate("/chat", { replace: true });
    }
  };

  const deleteChat = async (e, id) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      if (currentConvId === id) navigate("/chat");
      loadConversations();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const startNewChat = () => {
    navigate("/chat");
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    const currentQ = query.trim();
    setQuery("");
    
    const newMsg = { role: "user", content: currentQ };
    setMessages(prev => [...prev, newMsg]);
    
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const res = await api.chatV2Stream(currentConvId, currentQ, abortRef.current.signal);
      if (!res.ok) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let aiText = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      let newConvId = currentConvId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.type === "token") {
                aiText += data.text;
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { ...copy[copy.length - 1], content: aiText };
                  return copy;
                });
              } else if (data.type === "final") {
                if (data.conversation_id && data.conversation_id !== currentConvId) {
                  newConvId = data.conversation_id;
                  setSearchParams({ c: newConvId });
                  loadConversations(); // refresh list to show new chat
                }
                
                // Attach citations
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { 
                    ...copy[copy.length - 1], 
                    content: aiText,
                    cited_item_ids: data.context_ids,
                    results: data.results
                  };
                  return copy;
                });
              }
            } catch (err) {
              // skip parse errors
            }
          }
        }
      }
      
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err);
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong while processing your request." }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getIcon = (type) => {
    if (type === "url") return <LinkIcon className="h-4 w-4" />;
    if (type === "image") return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-white">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex w-full md:w-64 flex-col border-r border-neutral-200 bg-neutral-50/50 absolute md:relative z-20 h-full`}>
        <div className="p-4 border-b border-neutral-200">
          <button 
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white rounded-lg px-4 py-2 hover:bg-neutral-800 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-sm text-neutral-400 text-center py-4">No past chats</div>
          ) : (
            conversations.map(c => (
              <div 
                key={c.id} 
                onClick={() => {
                  navigate(`/chat?c=${c.id}`);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`flex items-center justify-between group cursor-pointer px-3 py-2.5 rounded-lg text-sm transition-colors ${currentConvId === c.id ? 'bg-neutral-200/60 font-medium' : 'hover:bg-neutral-100'}`}
              >
                <div className="flex items-center gap-3 truncate">
                  <MessageSquare className={`h-4 w-4 shrink-0 ${currentConvId === c.id ? 'text-neutral-700' : 'text-neutral-400'}`} />
                  <span className="truncate">{c.title || "New Chat"}</span>
                </div>
                <button 
                  onClick={(e) => deleteChat(e, c.id)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Mobile Sidebar Toggle */}
        <div className="md:hidden p-4 border-b border-neutral-100 flex items-center bg-white z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 rounded-lg hover:bg-neutral-100">
            <Sidebar className="h-5 w-5 text-neutral-600" />
          </button>
          <span className="font-semibold text-neutral-800 ml-2">Chat</span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth pb-32">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
              <Sparkles className="h-12 w-12 text-indigo-400" />
              <div className="text-xl font-semibold">Ask your memory</div>
              <p className="max-w-xs text-sm">Use natural language to find exactly what you saved, or brainstorm based on your past research.</p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div key={idx} className={`flex flex-col max-w-3xl mx-auto ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 text-indigo-500 font-semibold text-sm">
                    <Sparkles className="h-4 w-4" /> Forgot AI
                  </div>
                )}
                
                <div className={`px-5 py-3.5 rounded-2xl max-w-[90%] text-[15px] leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-neutral-100 text-neutral-900 rounded-tr-sm' 
                    : 'bg-white border border-neutral-100 shadow-sm rounded-tl-sm prose prose-sm max-w-none'
                }`}>
                  {m.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({node, ...props}) => <a className="text-indigo-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  )}
                </div>

                {/* Citations / Memory Cards */}
                {m.role === 'assistant' && m.results && m.results.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {m.results.map((r, i) => (
                      <a key={i} href={`/?open=${r.id}`} target="_blank" rel="noopener noreferrer" 
                         className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50/50 border border-indigo-100/50 hover:bg-indigo-50 transition-colors text-xs text-indigo-900 max-w-[200px]">
                        {getIcon(r.type)}
                        <span className="truncate font-medium">{r.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6 px-4 md:px-8">
          <div className="max-w-3xl mx-auto relative group">
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask anything about your memories..."
              className="w-full bg-white border border-neutral-200 rounded-2xl pl-5 pr-14 py-3.5 resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all scrollbar-hide text-[15px]"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!query.trim() || loading}
              className="absolute right-2.5 bottom-2.5 p-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>}
            </button>
          </div>
          <div className="text-center mt-3 text-xs text-neutral-400">
            Forgot AI can make mistakes. Check important info.
          </div>
        </div>
      </div>
    </div>
  );
}

