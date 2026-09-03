import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { api } from "@/api";
import { useStore } from "@/store";

const EXAMPLES = [
  "that AI coding tool I saw",
  "the screenshot about Claude",
  "my SaaS idea",
  "things I saved about marketing",
];

export default function SearchPage() {
  const { openItem } = useStore();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = useCallback(async (query) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setParams({ q: query });
    try {
      const r = await api.search(query);
      setResults(r.results || []);
    } finally {
      setLoading(false);
    }
  }, [setParams]);

  useEffect(() => {
    const initial = params.get("q");
    if (initial) run(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Search your memory</h1>
      <p className="text-sm text-muted-foreground mb-6">Use normal words — we match by meaning, not exact keywords.</p>

      <form
        onSubmit={(e) => { e.preventDefault(); run(q); }}
        className="relative"
      >
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          data-testid="search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="e.g. that Claude feature I saved last week"
          className="w-full h-12 pl-11 pr-28 rounded-lg border border-border bg-white text-sm outline-none focus:border-neutral-900 transition-colors"
        />
        <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2" data-testid="search-submit-btn">
          Search
        </Button>
      </form>

      {!searched && (
        <div className="flex flex-wrap gap-2 mt-4">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setQ(ex); run(ex); }}
              className="text-xs border border-border rounded-full px-3 py-1.5 hover:bg-neutral-100 transition-colors text-muted-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching your memory…
          </p>
        ) : searched && results.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="search-empty">
            No relevant items found. Try different words.
          </p>
        ) : (
          <div className="space-y-3" data-testid="search-results">
            {results.map((item) => (
              <div key={item.id} className="space-y-1">
                <ItemCard item={item} onClick={openItem} />
                {item.match_reason && (
                  <p className="text-xs text-muted-foreground pl-1">
                    <span className="mono-label text-[10px] text-amber-700">why</span> · {item.match_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
