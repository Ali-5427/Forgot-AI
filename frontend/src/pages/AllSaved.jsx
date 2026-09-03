import { useMemo, useState } from "react";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { useItems } from "@/lib/useItems";
import { useStore } from "@/store";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TYPES = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "text", label: "Text" },
  { id: "url", label: "Links" },
];

export default function AllSaved() {
  const { refreshKey, openSave, openItem, togglePin } = useStore();
  const { items, loading } = useItems(refreshKey);
  const [type, setType] = useState("all");
  const [recent, setRecent] = useState(false);
  const [sort, setSort] = useState("newest");
  const [category, setCategory] = useState("all");

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
  }, [items, type, recent, category, sort]);

  const chip = (active) =>
    `text-xs rounded-full px-3 py-1.5 border transition-colors ${
      active ? "bg-neutral-900 text-white border-neutral-900" : "border-border text-muted-foreground hover:bg-neutral-100"
    }`;

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Saved</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} of {items.length} item{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openSave} data-testid="allsaved-save-btn">
          <Plus className="h-4 w-4 mr-1.5" /> Save
        </Button>
      </div>

      {/* Type filter + recent + sort */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {TYPES.map((t) => (
          <button key={t.id} className={chip(type === t.id)} onClick={() => setType(t.id)} data-testid={`filter-type-${t.id}`}>
            {t.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <button className={chip(recent)} onClick={() => setRecent((v) => !v)} data-testid="filter-recent">
          Recently saved
        </button>
        <div className="ml-auto">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            data-testid="sort-select"
            className="text-xs border border-border rounded-md px-2 py-1.5 bg-white outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Smart Collections */}
      {collections.length > 0 && (
        <div className="mb-6">
          <p className="mono-label text-[10px] text-muted-foreground mb-2 flex items-center gap-1.5">
            <Layers className="h-3 w-3" /> Smart Collections
          </p>
          <div className="flex flex-wrap gap-2" data-testid="collections">
            <button className={chip(category === "all")} onClick={() => setCategory("all")} data-testid="collection-all">
              All
            </button>
            {collections.map(([cat, count]) => (
              <button key={cat} className={chip(category === cat)} onClick={() => setCategory(cat)} data-testid={`collection-${cat}`}>
                {cat} <span className="opacity-60">· {count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items match this filter.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} onClick={openItem} onPin={togglePin} />
          ))}
        </div>
      )}
    </div>
  );
}
