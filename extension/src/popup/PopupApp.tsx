import { useState, useEffect, useRef } from "react";
import { 
  Brain, Send, Plus, Loader2, ExternalLink, LogOut, X, Image as ImageIcon, 
  Copy, Check, RotateCcw, Edit2, Square, Settings, Link, PenTool, Sparkles, 
  MessageSquare, Calendar, Link2, Menu, SquarePen, PanelLeftClose, Folder, 
  HelpCircle, MessageSquareQuote, ArrowLeft, Search, Trash2, FileText, 
  RefreshCw, Globe, CheckCircle2, ShieldCheck, ToggleLeft, ToggleRight, Keyboard
} from "lucide-react";
import { api, request, fetchStream, SavedItem } from "../lib/api";
import { CONFIG } from "../lib/config";
import { clearSession, getSession, onSessionChange, getProPass, setProPass } from "../lib/storage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ExtensionTour, { resetExtensionTour } from "./ExtensionTour";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  items?: SavedItem[];
}

const SocialIcons = {
  X: ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  LinkedIn: ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  ),
  WhatsApp: ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  ),
  Email: ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
};

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


function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}


function getFaviconUrl(urlStr?: string): string | null {
  if (!urlStr) return null;
  try {
    const u = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return null;
  }
}

export default function PopupApp() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [billing, setBilling] = useState<{ plan_type: string; status: string; has_access: boolean } | null>(null);
  
  // Navigation View: "chat" | "saved" | "settings" | "feedback"
  const [currentView, setCurrentView] = useState<"chat" | "saved" | "settings" | "feedback">("chat");

  // Chat State
  const [chatQuery, setChatQuery] = useState("");
  const [chatting, setChatting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convId, setConvId] = useState<string | null>(null);

  // In-Extension Saved Notes State
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsSearchQuery, setItemsSearchQuery] = useState("");
  const [itemFilter, setItemFilter] = useState<"all" | "link" | "text">("all");
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [itemSourceView, setItemSourceView] = useState<"chat" | "saved">("saved");

  const handleOpenItemFromChat = (item: SavedItem) => {
    setSelectedItem(item);
    setItemSourceView("chat");
    setCurrentView("saved");
  };

  // In-Extension Settings State
  const [dockEnabled, setDockEnabled] = useState(true);
  const [syncingPlan, setSyncingPlan] = useState(false);
  const [syncPlanSuccess, setSyncPlanSuccess] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  // In-Extension Feedback State
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

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

  // 1. 0ms INSTANT HYDRATION: Read Local Pro Pass from disk immediately
  useEffect(() => {
    getProPass().then((cachedPass) => {
      if (cachedPass && cachedPass.has_access) {
        setBilling(cachedPass);
      }
    });

    chrome.storage.local.get(["extension_conv_id", "forgot_ai_dock_disabled"], async (res) => {
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
          chrome.storage.local.remove("extension_conv_id");
        }
      }
      setDockEnabled(!res.forgot_ai_dock_disabled);
    });
  }, []);

  // 2. Fetch / Sync Session and Silent Background Revalidation
  useEffect(() => {
    getSession().then(async (s) => {
      if (s?.user?.email) {
        setEmail(s.user.email);
        setLoading(false);
        // Silent background check - never resets or blocks user if Render is asleep
        api.billingStatus().then(b => {
          if (b) setBilling(b);
        }).catch(() => {});
        return;
      }

      // Check if open in another tab
      try {
        if (typeof chrome !== "undefined" && chrome.tabs?.query) {
          const tabs = await chrome.tabs.query({
            url: [
              "*://forgot-ai.vercel.app/*",
              "*://localhost/*",
              "*://127.0.0.1/*",
            ],
          });
          if (tabs && tabs.length > 0) {
            for (const tab of tabs) {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: "REQUEST_AUTH_FROM_PAGE" }).catch(() => {});
              }
            }
            await new Promise((r) => setTimeout(r, 250));
            const refreshed = await getSession();
            if (refreshed?.user?.email) {
              setEmail(refreshed.user.email);
              setLoading(false);
              api.billingStatus().then(b => {
                if (b) setBilling(b);
              }).catch(() => {});
              return;
            }
          }
        }
      } catch (e) {
        // Fall back gracefully
      }

      setEmail(null);
      setLoading(false);
    });
    const off = onSessionChange((s) => setEmail(s?.user?.email || null));
    return off;
  }, []);

  // Load Saved Notes when opening "saved" view
  const loadSavedItems = async () => {
    try {
      setLoadingItems(true);
      const items = await api.listItems(100);
      setSavedItems(items || []);
    } catch (e) {
      console.warn("Failed to load saved items", e);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (currentView === "saved" && email) {
      loadSavedItems();
    }
  }, [currentView, email]);

  useEffect(() => {
    if (scrollRef.current && currentView === "chat") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatting, currentView]);

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
  const openPricing = () => {
    chrome.tabs.create({ url: `${CONFIG.APP_URL}/pricing` });
  };
  const logout = async () => {
    await api.logout();
    await clearSession();
    setEmail(null);
    setCurrentView("chat");
  };

  // Toggle Floating Save Pill on Host Pages
  const handleToggleDock = () => {
    const nextVal = !dockEnabled;
    setDockEnabled(nextVal);
    chrome.storage.local.set({ forgot_ai_dock_disabled: !nextVal });
  };

  // Re-sync Pro / Trial plan from backend
  const handleSyncPlan = async () => {
    try {
      setSyncingPlan(true);
      const b = await api.billingStatus();
      if (b) setBilling(b);
      setSyncPlanSuccess(true);
      setTimeout(() => setSyncPlanSuccess(false), 2500);
    } catch (e) {
      console.warn("Failed to sync plan status", e);
    } finally {
      setSyncingPlan(false);
    }
  };

  // Open Dodo Customer Portal
  const handleOpenBillingPortal = async () => {
    try {
      setOpeningPortal(true);
      const res = await api.billingPortal();
      if (res?.portal_url) {
        chrome.tabs.create({ url: res.portal_url });
      }
    } catch (e) {
      chrome.tabs.create({ url: `${CONFIG.APP_URL}/settings` });
    } finally {
      setOpeningPortal(false);
    }
  };

  // Delete saved item
  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setSavedItems(prev => prev.filter(item => item.id !== id));
      await api.deleteItem(id);
    } catch (err) {
      console.warn("Failed to delete item", err);
      loadSavedItems();
    }
  };

  // Copy URL or Note content
  const handleCopyItem = (item: SavedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const toCopy = item.source_url || item.original_content || item.title || "";
    if (!toCopy) return;
    navigator.clipboard.writeText(toCopy);
    setCopiedItemId(item.id);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  // Submit native in-extension feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim() || submittingFeedback) return;
    try {
      setSubmittingFeedback(true);
      await (api as any).submitFeedback(feedbackMessage.trim());
      setFeedbackSent(true);
      setFeedbackMessage("");
      setTimeout(() => {
        setFeedbackSent(false);
        setCurrentView("chat");
      }, 2500);
    } catch (err) {
      alert("Failed to send feedback. Please try reaching founder directly.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const socials = [
    {
      name: "X (formerly Twitter)",
      url: "https://x.com/mohammad_j43370",
      icon: SocialIcons.X,
      color: "text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border-neutral-200/80",
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/in/j-mohammad-ali-ai",
      icon: SocialIcons.LinkedIn,
      color: "text-[#0A66C2] bg-blue-50/80 hover:bg-blue-100/80 border-blue-200/60",
    },
    {
      name: "WhatsApp",
      url: "https://wa.me/918688697765",
      icon: SocialIcons.WhatsApp,
      color: "text-[#25D366] bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200/60",
    },
    {
      name: "Email",
      url: "mailto:founder@tesima-media.com",
      icon: SocialIcons.Email,
      color: "text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border-neutral-200/80",
    },
  ];

  const handleSmartSave = async () => {
    if (!saveText.trim() && !file) return;
    try {
      setSaving(true);
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        if (userNote.trim()) fd.append("user_note", userNote.trim());
        await api.saveImage(fd);
      } else {
        const text = saveText.trim();
        const isUrl = isUrlLike(text);
        if (isUrl) {
          const urlObj = new URL(text.startsWith("http") ? text : `https://${text}`);
          await api.saveUrl({
            url: urlObj.href,
            source_url: urlObj.href,
            source_title: urlObj.hostname,
            user_note: userNote.trim() || undefined
          });
        } else {
          await api.saveText({
            text: text,
            original_content: text,
            user_note: userNote.trim() || undefined
          });
        }
      }

      setSaveText("");
      setUserNote("");
      setFile(null);
      setIsSaveModalOpen(false);
      
      if (currentView === "saved") {
        loadSavedItems();
      }
    } catch (e: any) {
      alert("Failed to save: " + (e?.message || "Please check connection."));
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleRetry = (index: number) => {
    const targetUserMsg = messages[index - 1];
    if (targetUserMsg && targetUserMsg.role === "user") {
      setMessages((prev) => prev.slice(0, index - 1));
      handleChat(null, targetUserMsg.content);
    }
  };

  const handleEdit = (text: string) => {
    setChatQuery(text);
    chatInputRef.current?.focus();
  };

  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setChatting(false);
    }
  };

  const handleChat = async (e: React.FormEvent | null, retryQuery?: string) => {
    if (e) e.preventDefault();
    const q = retryQuery || chatQuery.trim();
    if (!q || chatting) return;
    
    setChatQuery("");
    if (chatInputRef.current) {
      chatInputRef.current.style.height = "52px";
      setInputHeight(52);
    }
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    
    setChatting(true);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetchStream("/api/chat/v2/stream", {
        method: "POST",
        body: JSON.stringify({
          query: q,
          conversation_id: convId || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let answerText = "";
      let finalResults: SavedItem[] | null = null;
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      
      let animationFrameId: number | null = null;
      const flushUpdate = (resultsToAttach?: SavedItem[] | null) => {
        setMessages((prev) => {
          if (!prev.length) return prev;
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx].role === "assistant") {
            const currentObj = updated[lastIdx];
            const toAttach = resultsToAttach !== undefined ? resultsToAttach : finalResults;
            const needsContentUpdate = currentObj.content !== answerText;
            const needsItemsUpdate = toAttach && toAttach.length > 0 && !currentObj.items;
            if (needsContentUpdate || needsItemsUpdate) {
              updated[lastIdx] = {
                ...currentObj,
                content: answerText,
                items: toAttach && toAttach.length > 0 ? toAttach : currentObj.items,
              };
              return updated;
            }
          }
          return prev;
        });
        animationFrameId = null;
      };

      const scheduleFlush = () => {
        if (animationFrameId === null) {
          animationFrameId = requestAnimationFrame(() => flushUpdate());
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
                if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                  finalResults = data.results;
                  setSavedItems((prev) => {
                    const existingIds = new Set(prev.map((i) => i.id));
                    const toAdd = data.results.filter((i: any) => i && i.id && !existingIds.has(i.id));
                    return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
                  });
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
      flushUpdate(finalResults);
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
    return <div className="p-4 text-sm text-neutral-500 flex items-center justify-center min-h-screen gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Loading Forgot AI...</div>;
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 space-y-6 text-center">
        <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center shadow-sm">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Forgot AI</h2>
          <p className="text-sm text-neutral-500">Sign in to sync and search your memory vault.</p>
        </div>
        <button onClick={openAuth} className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm rounded-xl py-3 px-4 shadow-xs transition-colors">
          Sign In
        </button>
      </div>
    );
  }

  // Filtered saved items for "saved" view
  const filteredSavedItems = savedItems.filter(item => {
    const matchesFilter = 
      itemFilter === "all" ? true :
      itemFilter === "link" ? (item.content_type === "url" || !!item.source_url) :
      (item.content_type === "text" || !item.source_url);

    if (!matchesFilter) return false;
    if (!itemsSearchQuery.trim()) return true;

    const q = itemsSearchQuery.toLowerCase();
    const title = (item.title || item.source_title || "").toLowerCase();
    const url = (item.source_url || "").toLowerCase();
    const note = (item.user_note || "").toLowerCase();
    const content = (item.original_content || "").toLowerCase();

    return title.includes(q) || url.includes(q) || note.includes(q) || content.includes(q);
  });

  return (
    <div className="flex flex-col h-screen bg-white text-neutral-900 overflow-hidden font-sans relative">
      
      {/* Save Overlay Modal */}
      {isSaveModalOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs z-50 flex flex-col justify-end animate-in fade-in duration-200">
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

      {/* Slide-out Navigation Drawer */}
      <div 
        className={`fixed inset-0 z-50 flex transition-all duration-300 ${
          isMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            isMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMenuOpen(false)} 
        />

        {/* Drawer Panel */}
        <div 
          className={`relative w-[85%] bg-white h-full shadow-2xl flex flex-col justify-between z-10 border-r border-neutral-200 transform transition-transform duration-300 ease-in-out ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
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

              {/* Navigation Items (Exact structure requested) */}
              <div className="p-3 space-y-1">
                <button 
                  onClick={() => { setCurrentView("saved"); setSelectedItem(null); setItemSourceView("saved"); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                >
                  <Folder className="w-4 h-4 text-neutral-500" />
                  All Saved Notes
                </button>

                <button 
                  onClick={() => { setIsMenuOpen(false); setTimeout(() => resetExtensionTour(), 200); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                >
                  <Sparkles className="w-4 h-4 text-neutral-500" />
                  Replay Tour
                </button>

                <button 
                  onClick={() => { setCurrentView("feedback"); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                >
                  <MessageSquareQuote className="w-4 h-4 text-neutral-500" />
                  Feedback
                </button>

                <button 
                  onClick={() => { openApp(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors text-left"
                >
                  <ExternalLink className="w-4 h-4 text-neutral-500" />
                  Open Web Dashboard ↗
                </button>
              </div>
            </div>

            {/* Bottom Section: Plan Badge + Account + Settings */}
            <div>
              {/* Subscription / Plan Badge Card */}
              {email && (
                <div className="px-3 pb-2">
                  <div className={`border rounded-2xl p-3 flex items-center justify-between shadow-xs ${
                    billing?.has_access 
                      ? 'bg-emerald-50/60 border-emerald-200/80' 
                      : 'bg-amber-50/60 border-amber-200/80'
                  }`}>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                        Current Plan
                      </div>
                      <div className="text-[13px] font-semibold text-neutral-900 mt-0.5">
                        {billing?.status === 'lifetime' ? 'Founding Lifetime' :
                         billing?.status === 'active_pro' ? 'Pro Active' :
                         billing?.status === 'trial' ? '7–Day Free Trial' :
                         'Inactive / Expired'}
                      </div>
                    </div>
                    {!billing?.has_access ? (
                      <button 
                        onClick={() => { openPricing(); setIsMenuOpen(false); }}
                        className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[11px] font-semibold shadow-xs transition-colors"
                      >
                        Upgrade
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full uppercase">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* User Profile & Settings Footer */}
              <div className="p-3 border-t border-neutral-100 bg-neutral-50/50 space-y-1">
                {email ? (
                  <>
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

                    <button 
                      onClick={() => { setCurrentView("settings"); setIsMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100/80 rounded-xl transition-colors text-left"
                    >
                      <Settings className="w-4 h-4 text-neutral-500" />
                      Extension Settings
                    </button>
                  </>
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
      </div>

      {/* Main Top Header */}
      <div className="flex-none px-3.5 py-3 border-b border-neutral-200 bg-white flex items-center justify-between shadow-xs z-10 relative">
        <div className="flex items-center gap-2.5">
          {currentView === "chat" ? (
            <>
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
                <span>Forgot AI</span>
                {billing && (
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full tracking-wide ${
                    billing.has_access
                      ? 'bg-neutral-100 text-neutral-700 border border-neutral-200/80'
                      : 'bg-amber-100 text-amber-800 border border-amber-200/80'
                  }`}>
                    {billing.status === 'lifetime' ? 'Lifetime' :
                     billing.status === 'active_pro' ? 'Pro' :
                     billing.status === 'trial' ? 'Trial' :
                     'Expired'}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (currentView === "saved" && selectedItem) {
                    setSelectedItem(null);
                    if (itemSourceView === "chat") {
                      setCurrentView("chat");
                    }
                  } else {
                    setCurrentView("chat");
                  }
                }} 
                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-1 text-[13px] font-medium"
                title={currentView === "saved" && selectedItem ? (itemSourceView === "chat" ? "Back to Chat" : "Back to saved list") : "Back to Chat"}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div className="h-4 w-px bg-neutral-200 mx-1" />
              <span className="font-bold text-[15px] tracking-tight text-neutral-900 truncate max-w-[200px]">
                {currentView === "saved" ? (selectedItem ? "Memory Details" : "All Saved Notes") :
                 currentView === "settings" ? "Settings" :
                 "Feedback & Support"}
              </span>
            </div>
          )}
        </div>
        
        {currentView === "chat" ? (
          <button 
            onClick={startNewChat} 
            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors" 
            title="New Chat"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        ) : currentView === "saved" ? (
          selectedItem ? (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => handleCopyItem(selectedItem, e)}
                className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Copy link / text"
              >
                {copiedItemId === selectedItem.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
              {selectedItem.source_url && (
                <button
                  onClick={() => chrome.tabs.create({ url: selectedItem.source_url })}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                  title="Open URL in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={async (e) => {
                  await handleDeleteItem(selectedItem.id, e);
                  setSelectedItem(null);
                }}
                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={loadSavedItems} 
              disabled={loadingItems}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors" 
              title="Refresh saves"
            >
              <RefreshCw className={`w-4 h-4 ${loadingItems ? 'animate-spin text-neutral-900' : ''}`} />
            </button>
          )
        ) : null}
      </div>

      {/* VIEW 1: IN-EXTENSION ALL SAVED NOTES & DETAIL VIEW */}
      {currentView === "saved" && (
        selectedItem ? (
          /* FULL DETAIL VIEW FOR SELECTED ITEM */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {/* Metadata Bar */}
            <div className="flex items-center justify-between text-[11.5px] text-neutral-500 pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2 truncate">
                {selectedItem.source_url ? (
                  <>
                    <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="font-semibold text-neutral-800 truncate">
                      {new URL(selectedItem.source_url.startsWith("http") ? selectedItem.source_url : `https://${selectedItem.source_url}`).hostname.replace(/^www\./, "")}
                    </span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-neutral-800">Quick Note</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2 py-0.5 bg-neutral-100 rounded-full font-medium text-[11px] uppercase tracking-wide">
                  {selectedItem.content_type === "url" || selectedItem.source_url ? "Link" : "Note"}
                </span>
                <span>{formatTimeAgo(selectedItem.created_at)}</span>
              </div>
            </div>

            {/* Full Title */}
            <div>
              <h2 className="text-[17px] font-bold text-neutral-900 leading-snug">
                {selectedItem.title || selectedItem.source_title || (selectedItem.source_url ? selectedItem.source_url : selectedItem.original_content) || "Saved Memory"}
              </h2>
            </div>

            {/* Source Link Pill (if URL) */}
            {selectedItem.source_url && (
              <div className="p-2.5 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-center justify-between gap-2">
                <span className="text-[12px] font-mono text-neutral-600 truncate">
                  {selectedItem.source_url}
                </span>
                <button
                  onClick={() => chrome.tabs.create({ url: selectedItem.source_url })}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-800 rounded-lg text-[11.5px] font-medium border border-neutral-200/80 flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                >
                  <span>Open URL</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* User Note (if user added one) */}
            {selectedItem.user_note && (
              <div className="p-3.5 bg-amber-50/70 border-l-4 border-amber-400 rounded-r-2xl space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                  Your Note
                </div>
                <div className="text-[13px] text-amber-950 font-normal leading-relaxed whitespace-pre-wrap">
                  {selectedItem.user_note}
                </div>
              </div>
            )}

            {/* AI Summary (if available) */}
            {selectedItem.summary && (
              <div className="p-3.5 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 border border-indigo-100 rounded-2xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-indigo-700">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  AI Summary & Insights
                </div>
                <div className="text-[13px] text-neutral-800 leading-relaxed whitespace-pre-wrap font-normal">
                  {selectedItem.summary}
                </div>
              </div>
            )}

            {/* Full Captured Content / Note Body */}
            {(selectedItem.original_content || selectedItem.text) && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-neutral-700">
                    {selectedItem.content_type === "url" ? "Captured Text / Highlights" : "Note Content"}
                  </span>
                  <button
                    onClick={(e) => handleCopyItem(selectedItem, e)}
                    className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
                  >
                    {copiedItemId === selectedItem.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Content</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-[13px] text-neutral-800 leading-relaxed whitespace-pre-wrap max-h-[220px] overflow-y-auto select-text font-normal">
                  {selectedItem.original_content || selectedItem.text}
                </div>
              </div>
            )}

            {/* "Ask AI About This Memory" Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  const query = `What is this memory about? ${selectedItem.title || selectedItem.source_title || selectedItem.source_url || ""}`;
                  setChatQuery(query);
                  setCurrentView("chat");
                  setSelectedItem(null);
                }}
                className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-medium text-[13px] flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Ask AI about this memory</span>
              </button>
            </div>
          </div>
        ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50/50">
          {/* Search & Filter Header */}
          <div className="p-3 bg-white border-b border-neutral-200/80 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={itemsSearchQuery}
                onChange={(e) => setItemsSearchQuery(e.target.value)}
                placeholder="Search saved memories..."
                className="w-full bg-neutral-100 border border-transparent rounded-xl py-2 pl-9 pr-8 text-[13px] focus:outline-none focus:bg-white focus:border-neutral-300 transition-all placeholder:text-neutral-400"
              />
              {itemsSearchQuery && (
                <button onClick={() => setItemsSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {(["all", "link", "text"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setItemFilter(tab)}
                  className={`px-3 py-1 rounded-lg text-[11.5px] font-medium capitalize transition-colors ${
                    itemFilter === tab 
                      ? "bg-neutral-900 text-white shadow-xs" 
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {tab === "all" ? "All Saves" : tab === "link" ? "Links" : "Notes"}
                </button>
              ))}
              <span className="ml-auto text-[11px] font-medium text-neutral-400">
                {filteredSavedItems.length} {filteredSavedItems.length === 1 ? "item" : "items"}
              </span>
            </div>
          </div>

          {/* List of Saved Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loadingItems ? (
              <div className="py-12 flex flex-col items-center justify-center text-neutral-400 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[13px]">Loading your memories...</span>
              </div>
            ) : filteredSavedItems.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                  <Folder className="w-5 h-5" />
                </div>
                <div className="text-[13px] font-semibold text-neutral-700">
                  {itemsSearchQuery ? "No matching memories" : "No memories saved yet"}
                </div>
                <p className="text-[12px] text-neutral-400 max-w-[220px] mx-auto">
                  {itemsSearchQuery 
                    ? "Try searching for a different keyword or domain." 
                    : "Save tabs, articles, or notes using the + button or Alt+S shortcut."}
                </p>
              </div>
            ) : (
              filteredSavedItems.map((item) => {
                const isUrl = item.content_type === "url" || !!item.source_url;
                const displayTitle = item.title || item.source_title || (isUrl ? item.source_url : item.original_content) || "Saved Memory";
                const hostname = isUrl ? (item.source_url ? new URL(item.source_url.startsWith("http") ? item.source_url : `https://${item.source_url}`).hostname.replace(/^www\./, "") : "") : "Quick Note";
                const faviconUrl = isUrl ? getFaviconUrl(item.source_url) : null;
                const showFavicon = faviconUrl && !imgErrorMap[item.id];
                const snippet = item.summary || (isUrl && item.original_content && item.original_content !== item.source_url ? item.original_content : null);

                return (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className="p-3.5 bg-white border border-neutral-200/90 hover:border-neutral-400 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all space-y-2.5 group cursor-pointer"
                  >
                    {/* Header: Real Favicon + Domain name + Category Pill + Relative Time */}
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <div className="flex items-center gap-1.5 truncate min-w-0 pr-2">
                        {showFavicon ? (
                          <img 
                            src={faviconUrl!} 
                            className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain" 
                            onError={() => setImgErrorMap(prev => ({ ...prev, [item.id]: true }))}
                            alt=""
                          />
                        ) : isUrl ? (
                          <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        <span className="font-semibold text-neutral-700 truncate tracking-tight text-[11.5px]">{hostname}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0 text-[10.5px]">
                        <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500 font-medium">
                          {isUrl ? "Link" : "Note"}
                        </span>
                        <span>{formatTimeAgo(item.created_at)}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-[13.5px] font-semibold text-neutral-900 group-hover:text-black leading-snug line-clamp-2">
                      {displayTitle}
                    </div>

                    {/* Snippet preview if available */}
                    {snippet && (
                      <p className="text-[12px] text-neutral-500 line-clamp-2 leading-relaxed">
                        {snippet}
                      </p>
                    )}

                    {/* User Note highlighted pill */}
                    {item.user_note && (
                      <div className="text-[11.5px] text-amber-900 bg-amber-50/80 border-l-2 border-amber-400 pl-2.5 py-1 rounded-r-lg italic">
                        "{item.user_note}"
                      </div>
                    )}

                    {/* Sleek Action Toolbar */}
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-100/80 text-neutral-500">
                      <div className="text-[11px] text-neutral-400">
                        {isUrl && item.source_url ? (
                          <span className="truncate max-w-[180px] inline-block font-mono text-[10.5px]">
                            {item.source_url.replace(/^https?:\/\//, "").slice(0, 28)}...
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleCopyItem(item, e)}
                          className="px-2 py-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-1"
                          title="Copy Link / Content"
                        >
                          {copiedItemId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {isUrl && item.source_url && (
                          <button
                            onClick={() => chrome.tabs.create({ url: item.source_url })}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                            title="Open URL in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        )
      )}

      {/* VIEW 2: IN-EXTENSION SETTINGS */}
      {currentView === "settings" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50">
          
          {/* Section 1: Floating Save Button */}
          <div className="bg-white p-4 border border-neutral-200/80 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-[13.5px] text-neutral-900">
                  Floating Save Button
                </div>
                <div className="text-[12px] text-neutral-500 mt-0.5">
                  Show quick-save floating dock on websites & articles
                </div>
              </div>
              <button
                onClick={handleToggleDock}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  dockEnabled ? "bg-neutral-900" : "bg-neutral-200"
                }`}
                title={dockEnabled ? "Enabled" : "Disabled"}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    dockEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11.5px] text-neutral-400 leading-relaxed">
              When enabled, a draggable quick-access button appears on webpages for 1-click captures and notes.
            </p>
          </div>

          {/* Section 2: Keyboard Shortcut */}
          <div className="bg-white p-4 border border-neutral-200/80 rounded-2xl shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-[13.5px] text-neutral-900">
                <Keyboard className="w-4 h-4 text-neutral-500" />
                Keyboard Shortcut
              </div>
              <kbd className="px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-lg font-mono text-[11px] font-semibold text-neutral-800 shadow-2xs">
                Alt + S
              </kbd>
            </div>
            <p className="text-[12px] text-neutral-500 leading-relaxed">
              Press <span className="font-semibold text-neutral-700">Alt + S</span> on any webpage to save it to your memory library instantly.
            </p>
            <button
              onClick={() => chrome.tabs.create({ url: "chrome://extensions/shortcuts" })}
              className="text-[12px] font-medium text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1 pt-1"
            >
              Customize in Chrome Shortcuts ↗
            </button>
          </div>

          {/* Section 3: Plan & Subscription */}
          <div className="bg-white p-4 border border-neutral-200/80 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-[13.5px] text-neutral-900">
                <ShieldCheck className="w-4 h-4 text-neutral-500" />
                Subscription Status
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                billing?.has_access
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {billing?.status === 'lifetime' ? 'Lifetime' :
                 billing?.status === 'active_pro' ? 'Pro Active' :
                 billing?.status === 'trial' ? '7-Day Trial' :
                 'Inactive'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleSyncPlan}
                disabled={syncingPlan}
                className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                {syncingPlan ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : syncPlanSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
                )}
                <span>{syncPlanSuccess ? "Plan Synced!" : "Sync Plan"}</span>
              </button>

              <button
                onClick={handleOpenBillingPortal}
                disabled={openingPortal}
                className="py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                {openingPortal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                <span>Manage Billing</span>
              </button>
            </div>
          </div>

          {/* Section 4: Account Details */}
          <div className="bg-white p-4 border border-neutral-200/80 rounded-2xl shadow-xs space-y-3">
            <div className="font-semibold text-[13.5px] text-neutral-900">
              Account
            </div>
            <div className="text-[12px] text-neutral-600 truncate">
              Signed in as <span className="font-medium text-neutral-900">{email}</span>
            </div>
            <button
              onClick={logout}
              className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      )}

      {/* VIEW 3: IN-EXTENSION FEEDBACK (Exact Web App Replica) */}
      {currentView === "feedback" && (
        <div className="flex-1 overflow-y-auto p-4 bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-[16px] text-neutral-900">Feedback & Support</h3>
              <p className="text-[12.5px] text-neutral-500 mt-0.5">Help me improve Forgot AI</p>
            </div>

            {feedbackSent ? (
              <div className="py-12 flex flex-col items-center text-center space-y-3 animate-in fade-in duration-300">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-1">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-neutral-900 text-[15px]">Message Received!</h4>
                <p className="text-[12.5px] text-neutral-500 max-w-[220px]">Thanks for helping make Forgot AI better.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-3">
                <div>
                  <label className="block text-[12.5px] font-medium text-neutral-700 mb-1.5">
                    How can I help you?
                  </label>
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Found a bug? Have a feature request? Just want to say hi?"
                    className="w-full h-32 p-3 border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all text-[13.5px] placeholder:text-neutral-400"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingFeedback || !feedbackMessage.trim()}
                  className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-medium text-[13px] flex justify-center items-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
                >
                  {submittingFeedback ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send directly to founder</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Social Links Footer */}
          <div className="pt-4 border-t border-neutral-100 text-center">
            <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2.5">
              Or reach me directly
            </p>
            <div className="flex justify-center gap-2.5">
              {socials.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${s.color}`}
                  title={s.name}
                  aria-label={s.name}
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: CHAT & QUICK SAVE (Main Default Screen) */}
      {currentView === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-8 pb-32" ref={scrollRef}>
            {/* Chat Thread */}
            <div className="space-y-4">
              {billing && !billing.has_access && (
                <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl text-amber-900 shadow-xs mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[13px]">Subscription Inactive</span>
                    <span className="text-[10px] font-semibold uppercase bg-amber-200/80 px-2 py-0.5 rounded-full text-amber-900">Paid Only</span>
                  </div>
                  <p className="text-[12px] text-amber-800 leading-relaxed mb-2.5">
                    Forgot AI requires an active 7-day trial, Pro subscription, or Lifetime purchase to save new memories.
                  </p>
                  <button
                    onClick={openPricing}
                    className="w-full py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    Choose a Plan ($5/mo or $49)
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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
                            <div className="w-full min-w-0">
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

                              {/* Interactive Memory / Note Cards attached to this response */}
                              {msg.items && msg.items.length > 0 && (
                                <div className="mt-3.5 space-y-2 w-full not-prose">
                                  <div className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 px-0.5">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    <span>Referenced Memory</span>
                                  </div>
                                  {msg.items.map((item, itemIdx) => {
                                    const isUrl = Boolean(item.source_url && (item.source_url.startsWith("http://") || item.source_url.startsWith("https://")));
                                    let hostname = "Saved Note";
                                    if (isUrl && item.source_url) {
                                      try {
                                        hostname = new URL(item.source_url).hostname.replace(/^www\./, "");
                                      } catch {
                                        hostname = "Web Link";
                                      }
                                    }
                                    const faviconUrl = isUrl ? getFaviconUrl(item.source_url) : null;
                                    const displayTitle = item.title || item.source_title || (isUrl ? hostname : "Quick Note");
                                    const snippet = item.summary || item.original_content || "";

                                    return (
                                      <div
                                        key={item.id || itemIdx}
                                        onClick={() => handleOpenItemFromChat(item)}
                                        className="p-3 bg-neutral-50/90 hover:bg-white border border-neutral-200/90 hover:border-neutral-400 rounded-2xl shadow-xs hover:shadow-md transition-all space-y-1.5 group cursor-pointer text-left"
                                      >
                                        <div className="flex items-center justify-between text-[11px] text-neutral-400">
                                          <div className="flex items-center gap-1.5 truncate min-w-0 pr-2">
                                            {faviconUrl && !imgErrorMap[item.id] ? (
                                              <img
                                                src={faviconUrl}
                                                className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain"
                                                onError={() => setImgErrorMap(prev => ({ ...prev, [item.id]: true }))}
                                                alt=""
                                              />
                                            ) : isUrl ? (
                                              <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                            ) : (
                                              <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            )}
                                            <span className="font-semibold text-neutral-700 truncate tracking-tight text-[11px]">{hostname}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                                            <span className="px-1.5 py-0.5 bg-neutral-200/60 rounded text-neutral-600 font-medium">
                                              {isUrl ? "Link" : "Note"}
                                            </span>
                                            {item.created_at && <span>{formatTimeAgo(item.created_at)}</span>}
                                          </div>
                                        </div>

                                        <div className="text-[13px] font-semibold text-neutral-900 group-hover:text-black leading-snug line-clamp-1">
                                          {displayTitle}
                                        </div>

                                        {snippet && (
                                          <p className="text-[11.5px] text-neutral-500 line-clamp-2 leading-relaxed">
                                            {snippet}
                                          </p>
                                        )}

                                        {item.user_note && (
                                          <div className="text-[11px] text-amber-900 bg-amber-50/90 border-l-2 border-amber-400 pl-2 py-0.5 rounded-r-md italic line-clamp-1">
                                            "{item.user_note}"
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between pt-1 border-t border-neutral-200/50 text-[11px] text-neutral-400 group-hover:text-neutral-700 font-medium transition-colors">
                                          <span>Click to view full note</span>
                                          <span className="group-hover:translate-x-0.5 transition-transform text-neutral-600">➔</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            renderMessageWithLinks(msg.content, true)
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className={`flex items-center gap-1.5 mt-1.5 ${msg.role === 'user' ? 'pr-2' : 'pl-10'}`}>
                        <button 
                          type="button" 
                          onClick={() => handleCopy(msg.content, i)} 
                          className="p-1 text-neutral-700 rounded-md" 
                          title="Copy message"
                        >
                          {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        {msg.role === 'assistant' && !chatting && i === messages.length - 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRetry(i)} 
                            className="p-1 text-neutral-700 rounded-md" 
                            title="Retry response"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {msg.role === 'user' && !chatting && (
                          <button 
                            type="button" 
                            onClick={() => handleEdit(msg.content)} 
                            className="p-1 text-neutral-700 rounded-md" 
                            title="Edit message"
                          >
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
        </>
      )}

      <ExtensionTour />
    </div>
  );
}
