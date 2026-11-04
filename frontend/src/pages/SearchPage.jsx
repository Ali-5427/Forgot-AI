import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Loader2, Sparkles, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { api } from "@/api";
import { useStore } from "@/store";
import { filterAndRankItems } from "@/lib/search";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const EXAMPLES = {
  search: ["that AI coding tool I saw", "the screenshot about Claude", "things I saved this week", "my SaaS idea"],
  ask: ["Find my marketing ideas", "What did I save about AI coding?", "Which items mention Claude?"],
};

export default function SearchPage() {
  const { items, openItem, togglePin } = useStore();
  const [params, setParams] = useSearchParams();

  const [mode, setMode] = useState(() => params.get("mode") === "ask" ? "ask" : "search");
  const [q, setQ] = useState(() => params.get("q") || "");
  const [answer, setAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [searchedQuery, setSearchedQuery] = useState(() => params.get("q") || "");

  const lastQueryRef = useRef(q);

  // 0ms In-Memory Instant Keystroke Filter
  const instantResults = useMemo(() => {
    if (!q.trim()) return [];
    return filterAndRankItems(items, q);
  }, [items, q]);

  // Combined Results: Prioritize AI deep semantic ranking if available for current query, else instant 0ms results
  const displayedResults = useMemo(() => {
    if (!q.trim()) return [];
    if (aiResults !== null && searchedQuery === q) {
      return aiResults;
    }
    return instantResults;
  }, [q, aiResults, searchedQuery, instantResults]);

  // Execute deep AI search or chat
  const runAiSearch = useCallback(async (query, m) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    
    setSearchedQuery(trimmed);
    setParams({ q: trimmed, mode: m });
    setAiLoading(true);

    try {
      if (m === "ask") {
        const topContextIds = filterAndRankItems(items, trimmed).slice(0, 8).map((i) => i.id);
        const res = await api.chat(trimmed, [], topContextIds);
        setAnswer(res.answer || "");
        if (Array.isArray(res.results) && res.results.length > 0) {
          setAiResults(res.results);
        }
      } else {
        const res = await api.search(trimmed);
        if (Array.isArray(res.results)) {
          setAiResults(res.results);
        }
      }
    } catch (err) {
      console.error("AI search error:", err);
    } finally {
      setAiLoading(false);
    }
  }, [items, setParams]);

  // Handle Initial Query from URL
  useEffect(() => {
    const initialQ = params.get("q");
    const initialMode = params.get("mode") === "ask" ? "ask" : "search";
    if (initialQ && initialQ.trim()) {
      setQ(initialQ);
      setMode(initialMode);
      setSearchedQuery(initialQ);
      runAiSearch(initialQ, initialMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When user types, reset AI results so instant 0ms results immediately reflect keystrokes
  const handleQueryChange = (val) => {
    setQ(val);
    if (val !== searchedQuery) {
      setAiResults(null);
      if (answer) setAnswer("");
    }
  };

  const handleClear = () => {
    setQ("");
    setAiResults(null);
    setAnswer("");
    setSearchedQuery("");
    setParams({});
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setAnswer("");
    setAiResults(null);
    setParams({ q, mode: newMode });
    if (q.trim()) {
      runAiSearch(q, newMode);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    runAiSearch(q, mode);
  };

  const hasQuery = q.trim().length > 0;

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 py-12">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col items-center mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {mode === "ask" ? "Ask your memory" : "Search your memory"}
        </h1>
        <p className="text-[14px] text-muted-foreground max-w-lg mb-6">
          {mode === "ask"
            ? "Ask in plain language — answers come only from what you've saved."
            : "Lightning 0ms instant search across titles, notes, full content, and AI summaries."}
        </p>

        {/* Mode Selector Tabs */}
        <div className="inline-flex items-center p-1 bg-neutral-100 rounded-xl border border-neutral-200/80 mb-2">
          <button
            type="button"
            onClick={() => switchMode("search")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === "search"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Instant Search
          </button>
          <button
            type="button"
            onClick={() => switchMode("ask")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === "ask"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            Ask AI
          </button>
        </div>
      </div>

      {/* Main Search Bar */}
      <form onSubmit={onSubmit} className="relative mb-6 max-w-3xl mx-auto group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-white rounded-2xl shadow-sm border border-neutral-200/90 group-focus-within:border-neutral-400 group-focus-within:shadow-md transition-all flex items-center">
          <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            data-testid="search-input"
            value={q}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoFocus
            placeholder={mode === "ask" ? "Ask a question about what you've saved..." : "Type anything to filter instantly…"}
            className="w-full h-15 pl-14 pr-32 bg-transparent text-base sm:text-lg outline-none placeholder:text-neutral-400 font-medium"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {hasQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <Button
              type="submit"
              size="default"
              disabled={!hasQuery || aiLoading}
              className="rounded-xl px-5 font-medium shadow-sm transition-all"
              data-testid="search-submit-btn"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : mode === "ask" ? (
                <Sparkles className="h-4 w-4 text-indigo-300 mr-1.5" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-amber-300 mr-1.5" />
              )}
              {mode === "ask" ? "Ask AI" : "Deep AI"}
            </Button>
          </div>
        </div>
      </form>

      {/* Examples when input is empty */}
      {!hasQuery && (
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {EXAMPLES[mode].map((ex) => (
            <button
              key={ex}
              onClick={() => {
                handleQueryChange(ex);
                runAiSearch(ex, mode);
              }}
              className="text-[13px] font-medium border border-neutral-200/90 rounded-full px-4 py-1.5 hover:bg-neutral-50 hover:border-neutral-300 transition-all text-neutral-600 shadow-2xs"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Results Section */}
      <div className="max-w-3xl mx-auto">
        {/* Status bar when searching */}
        {hasQuery && (
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-700">
                {displayedResults.length} {displayedResults.length === 1 ? "memory" : "memories"} found
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <Zap className="h-3 w-3" /> 0ms instant filter
              </span>
            </div>

            {aiLoading && (
              <span className="flex items-center gap-1.5 text-indigo-600 font-medium animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                {mode === "ask" ? "AI thinking..." : "AI semantic ranking..."}
              </span>
            )}
          </div>
        )}

        {/* AI Answer Box in Ask Mode */}
        {mode === "ask" && (aiLoading || answer) && (
          <div className="mb-8 relative rounded-2xl p-[1px] bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-pink-500/30 shadow-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[15px] p-6 sm:p-8" data-testid="chat-answer">
              <p className="text-[11px] font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 mb-4 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> From your memory
              </p>

              {aiLoading && !answer ? (
                <div className="flex items-center gap-3 text-neutral-400 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                  <span className="text-sm font-medium">Synthesizing answer from your saved memories...</span>
                </div>
              ) : (
                <div className="text-[15px] text-neutral-700 leading-relaxed font-serif prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-50 prose-pre:text-neutral-800 prose-headings:font-semibold">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => (
                        <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                      ),
                    }}
                  >
                    {answer}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {hasQuery && displayedResults.length === 0 && !aiLoading && (
          <div className="text-center py-16 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
            <SearchIcon className="h-10 w-10 mx-auto text-neutral-300 mb-3" />
            <p className="text-[15px] font-semibold text-neutral-700" data-testid="search-empty">
              No matching memories found for "{q}"
            </p>
            <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
              Try broader keywords or press{" "}
              <span className="font-semibold text-neutral-600">Deep AI / Ask AI</span> to search by meaning.
            </p>
          </div>
        )}

        {/* Results List */}
        {displayedResults.length > 0 && (
          <div className="space-y-4" data-testid="search-results">
            {mode === "ask" && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2 mt-4 pl-1">
                Source Memories ({displayedResults.length})
              </p>
            )}

            {displayedResults.map((item, i) => (
              <div
                key={item.id}
                className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
              >
                <ItemCard item={item} onClick={openItem} onPin={togglePin} />
                {item.match_reason && (
                  <p className="text-[12px] text-neutral-500 pl-4 border-l-2 border-indigo-200 italic ml-2">
                    <span className="font-semibold not-italic text-neutral-600 mr-1.5">Why matched:</span>
                    {item.match_reason}
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
