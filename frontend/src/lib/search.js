/**
 * High-performance 0ms in-memory instant search and relevance ranker for saved items.
 * Matches keywords, titles, notes, AI summaries, URLs, and extracted content.
 */

export function filterAndRankItems(items, query) {
  if (!items || !Array.isArray(items)) return [];
  const q = (query || "").trim().toLowerCase();
  if (!q) return items;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items;

  const scored = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = (item.title || item.source_title || "").toLowerCase();
    const url = (item.source_url || "").toLowerCase();
    const domain = (item.source_domain || "").toLowerCase();
    const note = (item.user_note || "").toLowerCase();
    const summary = (item.summary || "").toLowerCase();
    const text = (
      item.original_text ||
      item.extracted_text ||
      item.searchable_text ||
      item.original_content ||
      ""
    ).toLowerCase();
    const kws = Array.isArray(item.keywords)
      ? item.keywords.join(" ").toLowerCase()
      : (item.keywords || "").toLowerCase();
    const category = (item.category || "").toLowerCase();

    // Composite search target
    const haystack = `${title} ${domain} ${url} ${note} ${summary} ${category} ${kws} ${text}`;

    // Calculate match metrics
    let tokensMatched = 0;
    for (let t = 0; t < tokens.length; t++) {
      if (haystack.includes(tokens[t])) {
        tokensMatched++;
      }
    }

    // Must match all tokens for strict match, or >= 75% of tokens for multi-word queries
    const matchRatio = tokensMatched / tokens.length;
    const isFullMatch = tokensMatched === tokens.length;
    const isPartialMatch = tokens.length >= 3 && matchRatio >= 0.7;

    if (!isFullMatch && !isPartialMatch) {
      continue;
    }

    let score = 0;

    // Highest weight: Title matches
    if (title === q) {
      score += 150;
    } else if (title.startsWith(q)) {
      score += 100;
    } else if (title.includes(q)) {
      score += 70;
    } else {
      // Check if title has individual tokens
      let titleTokens = 0;
      for (const tok of tokens) {
        if (title.includes(tok)) titleTokens++;
      }
      score += titleTokens * 25;
    }

    // High weight: User note matches
    if (note.includes(q)) {
      score += 60;
    } else {
      for (const tok of tokens) {
        if (note.includes(tok)) score += 15;
      }
    }

    // Medium weight: AI summary & Keywords
    if (summary.includes(q)) {
      score += 40;
    }
    if (kws.includes(q)) {
      score += 35;
    }

    // URL & Domain matches
    if (domain.includes(q)) {
      score += 30;
    }
    if (url.includes(q)) {
      score += 20;
    }

    // Content text matches
    if (text.includes(q)) {
      score += 15;
    }

    // Partial match penalty
    if (!isFullMatch) {
      score *= 0.5;
    }

    // Recency tie-breaker
    if (item.created_at) {
      try {
        const ageHours = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) score += 10;
        else if (ageHours < 168) score += 5; // 1 week
      } catch {}
    }

    // Pinned bonus
    if (item.pinned) {
      score += 8;
    }

    scored.push({
      item,
      score,
      matchReason: title.includes(q)
        ? "Match in title"
        : note.includes(q)
        ? "Match in note"
        : summary.includes(q)
        ? "Match in summary"
        : url.includes(q)
        ? "Match in URL"
        : "Match in content",
    });
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => ({
    ...s.item,
    match_reason: s.item.match_reason || s.matchReason,
  }));
}
