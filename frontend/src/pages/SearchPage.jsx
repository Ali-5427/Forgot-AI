import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { api } from "@/api";
import { useStore } from "@/store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <div className="flex flex-col items-center mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          {mode === "ask" ? "Ask your memory" : "Search your memory"}
        </h1>
        <p className="text-[15px] text-muted-foreground max-w-lg">
          {mode === "ask"
            ? "Ask in plain language — answers come only from what you've saved."
            : "Use normal words — we match by meaning, time and content, not exact keywords."}
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-neutral-100/80 rounded-full p-1 border border-neutral-200/50">
          <button className={`px-5 py-2 text-sm rounded-full transition-all font-medium ${mode === "search" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => switchMode("search")} data-testid="mode-search">
            <SearchIcon className="h-4 w-4 inline mr-2" /> Search
          </button>
          <button className={`px-5 py-2 text-sm rounded-full transition-all font-medium ${mode === "ask" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => switchMode("ask")} data-testid="mode-ask">
            <Sparkles className="h-4 w-4 inline mr-2 text-amber-500" /> Ask
          </button>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); run(q, mode); }} className="relative mb-12 max-w-3xl mx-auto group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-white rounded-2xl shadow-sm border border-neutral-200/80 group-focus-within:border-neutral-300 group-focus-within:shadow-md transition-all">
          <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-neutral-400" />
          <input
            data-testid="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            placeholder={mode === "ask" ? "Ask about what you've saved..." : "e.g. that Claude feature I saved last week"}
            className="w-full h-16 pl-16 pr-32 bg-transparent text-lg outline-none placeholder:text-neutral-400 font-medium"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Button type="submit" size="default" className="rounded-xl px-6 font-medium shadow-sm" data-testid="search-submit-btn">
              {mode === "ask" ? "Ask AI" : "Search"}
            </Button>
          </div>
        </div>
      </form>

      {!searched && (
        <div className="flex flex-wrap justify-center gap-3">
          {EXAMPLES[mode].map((ex) => (
            <button
              key={ex}
              onClick={() => { setQ(ex); run(ex, mode); }}
              className="text-[13px] font-medium border border-neutral-200 rounded-full px-4 py-2 hover:bg-neutral-50 hover:border-neutral-300 transition-all text-neutral-500"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-300" /> 
            <p className="text-sm font-medium">{mode === "ask" ? "Reading your memories..." : "Searching your database..."}</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
            {mode === "ask" && answer && (
              <div className="mb-8 relative rounded-2xl p-[1px] bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-pink-500/30 shadow-sm">
                <div className="bg-white rounded-[15px] p-8" data-testid="chat-answer">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 mb-4 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> From your memory
                  </p>
                  <div className="text-[15px] text-neutral-700 leading-relaxed font-serif prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-50 prose-pre:text-neutral-800 prose-headings:font-semibold">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({node, ...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                      }}
                    >
                      {answer}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {searched && results.length === 0 ? (
              <div className="text-center py-20">
                <SearchIcon className="h-12 w-12 mx-auto text-neutral-200 mb-4" />
                <p className="text-[15px] font-medium text-neutral-500" data-testid="search-empty">
                  Nothing relevant found — try describing it differently.
                </p>
              </div>
            ) : (
              <div className="space-y-4" data-testid="search-results">
                {mode === "ask" && results.length > 0 && (
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2 mt-4 pl-1">Sources used</p>
                )}
                {results.map((item, i) => (
                  <div key={item.id} className="space-y-1.5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${i * 100}ms` }}>
                    <ItemCard item={item} onClick={openItem} onPin={togglePin} />
                    {item.match_reason && mode === "search" && (
                      <p className="text-[13px] text-neutral-500 pl-4 border-l-2 border-neutral-200 italic ml-2">
                        <span className="font-semibold not-italic text-neutral-600 mr-2">Why matched:</span>{item.match_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
