import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Loader2, Sparkles, X, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { api } from "@/api";
import { useStore } from "@/store";
import { filterAndRankItems } from "@/lib/search";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const EXAMPLES = [
  "what did I save about Claude?",
  "that AI coding tool I saw",
  "things I saved this week",
  "marketing and SaaS ideas",
];

export default function SearchPage() {
  const { items, openItem, togglePin } = useStore();
  const [params, setParams] = useSearchParams();

  const [q, setQ] = useState(() => params.get("q") || "");
  const [answer, setAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [submittedQuery, setSubmittedQuery] = useState(() => params.get("q") || "");

  // 0ms In-Memory Instant Keystroke Filter
  const instantResults = useMemo(() => {
    if (!q.trim()) return [];
    return filterAndRankItems(items, q);
  }, [items, q]);

  // Combined Results: Show Agent's retrieved tools results when available, else 0ms instant keystroke results
  const displayedResults = useMemo(() => {
    if (!q.trim()) return [];
    if (aiResults !== null && submittedQuery === q.trim()) {
      return aiResults;
    }
    return instantResults;
  }, [q, aiResults, submittedQuery, instantResults]);

  // Execute AI explanation for questions / full sentences on Enter
  const runAiQuery = useCallback(async (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSubmittedQuery(trimmed);
    setParams({ q: trimmed });
    setAiLoading(true);

    try {
      const topContextIds = filterAndRankItems(items, trimmed).slice(0, 8).map((i) => i.id);
      const res = await api.chat(trimmed, [], topContextIds);
      setAnswer(res.answer || "");
      if (Array.isArray(res.results) && res.results.length > 0) {
        setAiResults(res.results);
      }
    } catch (err) {
      console.error("AI answer error:", err);
    } finally {
      setAiLoading(false);
    }
  }, [items, setParams]);

  // Handle URL query on first load
  useEffect(() => {
    const initialQ = params.get("q");
    if (initialQ && initialQ.trim()) {
      setQ(initialQ);
      setSubmittedQuery(initialQ);
      runAiQuery(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueryChange = (val) => {
    setQ(val);
    if (answer) setAnswer("");
    if (aiResults) setAiResults(null);
  };

  const handleClear = () => {
    setQ("");
    setAnswer("");
    setAiResults(null);
    setSubmittedQuery("");
    setParams({});
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (q.trim()) {
      runAiQuery(q);
    }
  };

  const hasQuery = q.trim().length > 0;

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 py-14">
      {/* Clean Minimalist Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Search your memory</h1>
        <p className="text-[15px] text-muted-foreground max-w-md">
          Type to see instant cards, or press Enter for an AI answer.
        </p>
      </div>

      {/* Single Unified Search Bar */}
      <form onSubmit={onSubmit} className="relative mb-8 max-w-2xl mx-auto">
        <div className="relative bg-white rounded-2xl shadow-sm border border-neutral-200/90 focus-within:border-neutral-900 focus-within:shadow-md transition-all flex items-center">
          <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            data-testid="search-input"
            value={q}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoFocus
            placeholder="Search anything or ask a question…"
            className="w-full h-14 pl-14 pr-28 bg-transparent text-base outline-none placeholder:text-neutral-400 font-medium"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {hasQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors mr-1"
                title="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={!hasQuery || aiLoading}
              className="rounded-xl px-4 font-medium shadow-sm transition-all h-9"
              data-testid="search-submit-btn"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-1 text-xs">
                  Ask AI <CornerDownLeft className="h-3 w-3" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Examples when input is empty */}
      {!hasQuery && (
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQ(ex);
                runAiQuery(ex);
              }}
              className="text-[13px] font-medium border border-neutral-200 rounded-full px-4 py-1.5 hover:bg-neutral-50 hover:border-neutral-300 transition-all text-neutral-600 shadow-2xs"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Results Container */}
      <div className="max-w-3xl mx-auto">
        {/* AI Explanation Card (Appears at top when submitted) */}
        {(aiLoading || answer) && (
          <div className="mb-8 rounded-2xl border border-neutral-200/90 bg-neutral-50/50 p-6 sm:p-7 shadow-sm animate-in fade-in duration-300">
            <div data-testid="chat-answer">
              <p className="text-[12px] font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-neutral-700" /> AI Answer
              </p>

              {aiLoading && !answer ? (
                <div className="flex items-center gap-3 text-neutral-500 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-700" />
                  <span className="text-sm font-medium">Finding answers from your saved memories…</span>
                </div>
              ) : (
                <div className="text-[15px] text-neutral-800 leading-relaxed font-sans prose prose-neutral prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => (
                        <a className="text-neutral-900 font-medium underline underline-offset-2 hover:text-black" target="_blank" rel="noopener noreferrer" {...props} />
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

        {/* Section Header for Cards when AI answer is present */}
        {answer && displayedResults.length > 0 && (
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 pl-1">
            Related Memories ({displayedResults.length})
          </p>
        )}

        {/* Empty State */}
        {hasQuery && displayedResults.length === 0 && !aiLoading && (
          <div className="text-center py-16 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
            <SearchIcon className="h-10 w-10 mx-auto text-neutral-300 mb-3" />
            <p className="text-[15px] font-semibold text-neutral-700" data-testid="search-empty">
              No matching memories found for &ldquo;{q}&rdquo;
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Press Enter or click &ldquo;Ask AI&rdquo; to search by meaning.
            </p>
          </div>
        )}

        {/* Instant Memory Cards (0ms Keystroke or Agent Tools) */}
        {displayedResults.length > 0 && (
          <div className="space-y-4" data-testid="search-results">
            {displayedResults.map((item) => (
              <div key={item.id} className="animate-in fade-in duration-200">
                <ItemCard item={item} onClick={openItem} onPin={togglePin} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
