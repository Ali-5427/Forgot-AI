import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { useItems } from "@/lib/useItems";
import { useStore } from "@/store";

export default function Home() {
  const { refreshKey, openSave, openItem } = useStore();
  const { items, loading } = useItems(refreshKey);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-14">
      <div className="mb-2">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Forgot AI</h1>
        <p className="text-muted-foreground mt-2 text-base">Save anything now. Find it later.</p>
      </div>

      <form onSubmit={submit} className="mt-8 relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          data-testid="home-search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anything you've saved…"
          className="w-full h-12 pl-11 pr-28 rounded-lg border border-border bg-white text-sm outline-none focus:border-neutral-900 transition-colors"
        />
        <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2" data-testid="home-search-btn">
          Search
        </Button>
      </form>

      <div className="flex items-center justify-between mt-12 mb-4">
        <h2 className="text-lg font-semibold">Recent saves</h2>
        <Button variant="outline" size="sm" onClick={openSave} data-testid="home-save-btn">
          <Plus className="h-4 w-4 mr-1.5" /> Save
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your memory…</p>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-16 text-center bg-white">
          <div className="h-12 w-12 rounded-xl bg-neutral-900 flex items-center justify-center mx-auto mb-4">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-base font-semibold">Save your first thing.</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Screenshots, text and links you want to remember later.
          </p>
          <Button onClick={openSave} className="mt-5" data-testid="empty-save-btn">
            <Plus className="h-4 w-4 mr-1.5" /> Save something
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.slice(0, 9).map((item) => (
            <ItemCard key={item.id} item={item} onClick={openItem} />
          ))}
        </div>
      )}
    </div>
  );
}
