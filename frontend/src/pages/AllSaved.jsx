import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Plus, Layers, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useItems } from "@/lib/useItems";
import { useStore } from "@/store";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

const TYPES = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "text", label: "Text" },
  { id: "url", label: "Links" },
];

const VIEW_TITLES = {
  inbox: { title: "Inbox", desc: "Items saved in the last 48 hours" },
  reading: { title: "Reading List", desc: "Articles, blogs, and web links" },
  code: { title: "Code & Tools", desc: "Code snippets, terminal commands, and repositories" },
  visuals: { title: "Visuals & Screenshots", desc: "Screenshots, design inspiration, and images" },
  notes: { title: "Thoughts & Notes", desc: "Quick ideas, quotes, and personal notes" },
};

export default function AllSaved() {
  const [searchParams] = useSearchParams();
  const activeGroupId = searchParams.get("group");
  const activeView = searchParams.get("view");
  const { openSave, openItem, togglePin, groups } = useStore();
  const { items, loading } = useItems();
  const [type, setType] = useState("all");
  const [recent, setRecent] = useState(false);
  const [sort, setSort] = useState("newest");
  const [category, setCategory] = useState("all");

  const currentGroup = useMemo(() => {
    return groups?.find((g) => g.id === activeGroupId);
  }, [groups, activeGroupId]);

  const collections = useMemo(() => {
    const counts = {};
    items.forEach((i) => {
      if (i.status === "ready" && i.category) counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = useMemo(() => {
    const now = Date.now();
    let list = items.filter((i) => {
      if (activeGroupId && i.group_id !== activeGroupId) return false;

      // Smart view filters
      if (activeView === "inbox") {
        const isRecent = now - new Date(i.created_at).getTime() < TWO_DAYS_MS;
        if (!isRecent || i.group_id) return false;
      } else if (activeView === "reading") {
        if (i.content_type !== "url" && i.content_type !== "article" && !i.source_url) return false;
      } else if (activeView === "code") {
        const isCodeLike =
          i.content_type === "code" ||
          (i.original_text &&
            (i.original_text.includes("import ") ||
              i.original_text.includes("def ") ||
              i.original_text.includes("const ") ||
              i.original_text.includes("function ") ||
              i.original_text.startsWith("```")));
        if (!isCodeLike) return false;
      } else if (activeView === "visuals") {
        if (i.content_type !== "image" && i.content_type !== "screenshot" && !i.image_path) return false;
      } else if (activeView === "notes") {
        if (i.content_type !== "note" && i.content_type !== "text") return false;
      }

      if (type !== "all" && i.content_type !== type) return false;
      if (recent && now - new Date(i.created_at).getTime() > WEEK_MS) return false;
      if (category !== "all" && i.category !== category) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return list;
  }, [items, type, recent, category, sort, activeGroupId, activeView]);

  const chip = (active) =>
    `text-xs rounded-full px-3 py-1.5 border transition-colors ${
      active
        ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
        : "border-border text-muted-foreground hover:bg-neutral-100"
    }`;

  const currentViewInfo = activeView ? VIEW_TITLES[activeView] : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 relative pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {currentGroup ? currentGroup.name : currentViewInfo ? currentViewInfo.title : "All Saved"}
            </h1>
            {(activeGroupId || activeView) && (
              <Link
                to="/all"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-full transition-colors"
                title="Clear filter and show all"
              >
                Clear filter <X className="w-3 h-3" />
              </Link>
            )}
          </div>
          <p className="text-[14px] text-muted-foreground mt-1">
            {currentViewInfo
              ? `${currentViewInfo.desc} • ${filtered.length} items`
              : `${filtered.length} of ${items.length} item${items.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={openSave} data-testid="allsaved-save-btn" className="rounded-full px-6 shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Save
        </Button>
      </div>

      {/* Sticky Filters Container */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-200/50 mb-8 shadow-sm">
        <div className="flex flex-col gap-4 max-w-6xl mx-auto">
          {/* Top row: Type, Recent, Sort */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  className={chip(type === t.id)}
                  onClick={() => setType(t.id)}
                  data-testid={`filter-type-${t.id}`}
                >
                  {t.label}
                </button>
              ))}
              <span className="mx-2 h-5 w-px bg-neutral-200" />
              <button
                className={chip(recent)}
                onClick={() => setRecent((v) => !v)}
                data-testid="filter-recent"
              >
                Recently saved
              </button>
            </div>
            
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              data-testid="sort-select"
              className="text-[13px] border border-neutral-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all font-medium text-neutral-600 shadow-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {/* Bottom row: Categories (Scrollable) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
            <button
              className={chip(category === "all")}
              onClick={() => setCategory("all")}
              data-testid="filter-cat-all"
            >
              All categories
            </button>
            {collections.map(([cat, count]) => (
              <button
                key={cat}
                className={`snap-start whitespace-nowrap ${chip(category === cat)}`}
                onClick={() => setCategory(cat)}
                data-testid={`filter-cat-${cat}`}
              >
                {cat} <span className="opacity-60 ml-1">({count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid / Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <SkeletonCard count={8} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-28 border border-dashed border-border rounded-2xl bg-white/60">
          <div className="h-14 w-14 mx-auto bg-neutral-100 rounded-2xl flex items-center justify-center mb-3 text-neutral-400">
            <Search className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-neutral-900 mb-1">Nothing found in this view</p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">
            Try switching views or clearing your active filters.
          </p>
          {(activeGroupId || activeView || type !== "all" || category !== "all" || recent) && (
            <Link to="/all">
              <Button variant="outline" size="sm" className="rounded-full text-xs">
                View all saved memories
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} onClick={openItem} onPin={togglePin} />
          ))}
        </div>
      )}
    </div>
  );
}
