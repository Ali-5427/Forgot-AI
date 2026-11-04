import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Pin, RefreshCw, Bookmark, Zap, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useItems } from "@/lib/useItems";
import { useStore } from "@/store";
import { FeedbackPrompt } from "@/components/FeedbackPrompt";
import { filterAndRankItems } from "@/lib/search";
import { typeMeta, timeAgo } from "@/lib/format";

export default function Home() {
  const { openSave, openItem, togglePin, openImporter } = useStore();
  const { items, loading } = useItems();
  const [q, setQ] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const navigate = useNavigate();

  const pinned = items.filter((i) => i.pinned);

  // 0ms In-Memory Instant Search
  const matchingItems = useMemo(() => {
    if (!q.trim()) return [];
    return filterAndRankItems(items, q);
  }, [items, q]);

  // Click outside to close instant preview
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const submit = (e) => {
    if (e) e.preventDefault();
    if (q.trim()) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-14">
      <FeedbackPrompt />
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Forgot AI</h1>
          <p className="text-muted-foreground mt-2 text-base">Save anything now. Find it later.</p>
        </div>
        <SyncButton />
      </div>

      {/* Instant Search Bar with Live 0ms Preview Dropdown */}
      <div className="mt-8 relative max-w-2xl" ref={searchContainerRef}>
        <form onSubmit={submit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            data-testid="home-search-input"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (q.trim()) setIsOpen(true);
            }}
            placeholder="Search anything you've saved…"
            className="w-full h-12 pl-11 pr-28 rounded-xl border border-border bg-white text-sm outline-none focus:border-neutral-900 transition-colors shadow-sm"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setIsOpen(false);
              }}
              className="absolute right-24 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 rounded-md transition-colors"
              title="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg" data-testid="home-search-btn">
            Search
          </Button>
        </form>

        {/* 0ms Instant Quick Preview Dropdown */}
        {isOpen && q.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-neutral-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-4 py-2.5 bg-neutral-50/80 border-b border-neutral-100 flex items-center justify-between text-xs text-neutral-500 font-medium">
              <span className="flex items-center gap-1.5 text-neutral-700 font-semibold">
                <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Instant Results
              </span>
              <span>
                {matchingItems.length} {matchingItems.length === 1 ? "match" : "matches"}
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
              {matchingItems.slice(0, 5).map((item) => {
                const { Icon } = typeMeta(item.content_type);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      openItem(item);
                    }}
                    className="w-full text-left p-3.5 hover:bg-neutral-50 transition-colors flex items-start gap-3 group"
                  >
                    <div className="p-2 rounded-lg bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200 transition-colors shrink-0 mt-0.5">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                          {item.title || item.source_title || "Untitled Memory"}
                        </p>
                        <span className="text-[11px] text-neutral-400 shrink-0 font-medium">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">
                        {item.summary || item.user_note || item.source_url || item.extracted_text || "No preview"}
                      </p>
                    </div>
                  </button>
                );
              })}

              {matchingItems.length === 0 && (
                <div className="py-8 text-center px-4">
                  <p className="text-sm font-medium text-neutral-700">No instant matches found</p>
                  <p className="text-xs text-neutral-400 mt-1">Press Enter to search with deep AI semantic meaning.</p>
                </div>
              )}
            </div>

            <div
              onClick={() => submit()}
              className="p-3 bg-neutral-50/80 hover:bg-neutral-100/80 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer transition-colors"
            >
              <span>View all results for &ldquo;{q}&rdquo;</span>
              <span className="flex items-center gap-1 text-neutral-500 text-[11px]">
                Press Enter <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        )}
      </div>

      {pinned.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Pin className="h-4 w-4 fill-neutral-900" /> Pinned
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="pinned-grid">
            {pinned.map((item) => (
              <ItemCard key={item.id} item={item} onClick={openItem} onPin={togglePin} />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-12 mb-4">
        <h2 className="text-lg font-semibold">Recent saves</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openImporter}
            className="text-xs text-neutral-600 hover:text-neutral-900 border-neutral-200 rounded-lg shadow-sm"
          >
            <Bookmark className="h-3.5 w-3.5 mr-1.5" /> Import Bookmarks
          </Button>
          <Button size="sm" onClick={openSave} data-testid="home-save-btn" className="rounded-lg shadow-sm">
            <Plus className="h-4 w-4 mr-1.5" /> Save
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard count={6} />
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl py-16 text-center bg-white shadow-sm">
          <div className="h-12 w-12 mx-auto mb-4">
            <img src="/logo.jpg" alt="Forgot AI Logo" className="w-full h-full object-cover rounded-xl shadow-sm" />
          </div>
          <h3 className="text-base font-semibold">Save your first thing.</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Screenshots, text and links you want to remember later.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <Button onClick={openSave} className="rounded-full px-5" data-testid="empty-save-btn">
              <Plus className="h-4 w-4 mr-1.5" /> Save something
            </Button>
            <Button variant="outline" onClick={openImporter} className="rounded-full px-5">
              <Bookmark className="h-4 w-4 mr-1.5" /> Import Bookmarks
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.slice(0, 9).map((item) => (
            <ItemCard key={item.id} item={item} onClick={openItem} onPin={togglePin} />
          ))}
        </div>
      )}
    </div>
  );
}

const SyncButton = () => {
  const { reloadItems } = useStore();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    await reloadItems();
    setTimeout(() => setSyncing(false), 400);
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      title="Sync latest saves"
      className="flex items-center gap-2 p-2 px-4 rounded-full border border-neutral-200 hover:bg-neutral-50 transition-colors disabled:opacity-50 text-neutral-600 font-medium text-sm shadow-sm"
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin text-neutral-900" : ""}`} />
      {syncing ? "Syncing..." : "Sync"}
    </button>
  );
};
