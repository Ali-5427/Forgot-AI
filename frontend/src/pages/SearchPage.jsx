import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { api } from "@/api";
import { useStore } from "@/store";

const EXAMPLES = {
  search: ["that AI coding tool I saw", "the screenshot about Claude", "things I saved this week", "my SaaS idea"],
  ask: ["Find my marketing ideas", "What did I save about AI coding?", "Which items mention Claude?"],
};

export default function SearchPage() {
  const { openItem, togglePin } = useStore();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "ask" ? "ask" : "search");
  const [q, setQ] = useState(params.get("q") || "");
  const [results, setResults] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = useCallback(async (query, m) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setAnswer("");
    setParams({ q: query, mode: m });
    try {
      if (m === "ask") {
        const r = await api.chat(query);
        setAnswer(r.answer || "");
        setResults(r.results || []);
      } else {
        const r = await api.search(query);
        setResults(r.results || []);
      }
    } finally {
      setLoading(false);
    }
  }, [setParams]);

  useEffect(() => {
    const initial = params.get("q");
    if (initial) run(initial, params.get("mode") === "ask" ? "ask" : "search");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (m) => {
    setMode(m);
    setResults([]);
    setAnswer("");
    setSearched(false);
  };

  const tabBtn = (m, label) =>
    `px-4 py-1.5 text-sm rounded-md transition-colors ${
      mode === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === "ask" ? "Ask your memory" : "Search your memory"}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {mode === "ask"
          ? "Ask in plain language — answers come only from what you've saved."
          : "Use normal words — we match by meaning, time and content, not exact keywords."}
      </p>

      <div className="inline-flex bg-neutral-100 rounded-lg p-1 mb-5">
        <button className={tabBtn("search")} onClick={() => switchMode("search")} data-testid="mode-search">
          <SearchIcon className="h-3.5 w-3.5 inline mr-1.5" /> Search
        </button>
        <button className={tabBtn("ask")} onClick={() => switchMode("ask")} data-testid="mode-ask">
          <Sparkles className="h-3.5 w-3.5 inline mr-1.5" /> Ask
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); run(q, mode); }} className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          data-testid="search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder={mode === "ask" ? "Ask about what you've saved…" : "e.g. that Claude feature I saved last week"}
          className="w-full h-12 pl-11 pr-28 rounded-lg border border-border bg-white text-sm outline-none focus:border-neutral-900 transition-colors"
        />
        <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2" data-testid="search-submit-btn">
          {mode === "ask" ? "Ask" : "Search"}
        </Button>
      </form>

      {!searched && (
        <div className="flex flex-wrap gap-2 mt-4">
          {EXAMPLES[mode].map((ex) => (
            <button
              key={ex}
              onClick={() => { setQ(ex); run(ex, mode); }}
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
            <Loader2 className="h-4 w-4 animate-spin" /> {mode === "ask" ? "Searching your memory…" : "Searching your memory…"}
          </p>
        ) : (
          <>
            {mode === "ask" && answer && (
              <div className="mb-6 bg-white border border-border rounded-lg p-4" data-testid="chat-answer">
                <p className="mono-label text-[10px] text-amber-700 mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> From your memory
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{answer}</p>
              </div>
            )}

            {searched && results.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="search-empty">
                Nothing relevant found — try describing it differently.
              </p>
            ) : (
              <div className="space-y-3" data-testid="search-results">
                {mode === "ask" && results.length > 0 && (
                  <p className="mono-label text-[10px] text-muted-foreground">Matching memories</p>
                )}
                {results.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <ItemCard item={item} onClick={openItem} onPin={togglePin} />
                    {item.match_reason && mode === "search" && (
                      <p className="text-xs text-muted-foreground pl-1">
                        <span className="mono-label text-[10px] text-amber-700">why</span> · {item.match_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
