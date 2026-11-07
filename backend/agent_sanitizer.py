import re
from typing import Dict

# Dictionary of developer terms and their natural human equivalents
TERM_REPLACEMENTS: Dict[str, str] = {
    r"\(I can inspect_memory for you\)": "(I can take a closer look at any of these for you)",
    r"\(I can inspect_memory\)": "(I can look into any of these for you)",
    r"inspect_memory\([^)]*\)": "take a closer look",
    r"`?inspect_memory`?": "look into it deeper",
    r"`?search_by_time_range`?": "date search",
    r"`?semantic_hybrid_search`?": "memory search",
    r"`?get_recent_memories`?": "recent saves",
    r"tool_search_by_time_range": "date search",
    r"tool_semantic_hybrid_search": "memory search",
    r"tool_inspect_memory": "deep inspection",
    r"tool_get_recent_memories": "recent saves",
}

RAW_TOOL_CALL_REGEX = re.compile(r'\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{[^}]*\}\s*\}', re.DOTALL)
THINK_TAG_REGEX = re.compile(r'<think>.*?</think>', re.DOTALL | re.IGNORECASE)

SENSITIVE_PREFIXES = (
    '<', 'inspect', 'search', 'seman', 'tool', '{', 'get_recent'
)


def sanitize_agent_text(text: str, strip_whitespace: bool = True) -> str:
    """
    Sanitize full completed text from the agent:
    1. Strips any internal reasoning <think>...</think> tags.
    2. Strips raw JSON tool artifacts.
    3. Replaces internal function names with natural human language.
    """
    if not text:
        return ""

    # Strip thinking tags
    cleaned = THINK_TAG_REGEX.sub("", text)

    # Strip raw tool call JSON blobs if model hallucinated them into content
    cleaned = RAW_TOOL_CALL_REGEX.sub("", cleaned)

    # Replace leaked tool names with natural phrasing
    for pattern, replacement in TERM_REPLACEMENTS.items():
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)

    # Clean up double spaces or awkward parentheses left behind
    cleaned = re.sub(r'\(\s*\)', '', cleaned)
    cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned)
    return cleaned.strip() if strip_whitespace else cleaned


class StreamSanitizer:
    """
    Stateful streaming sanitizer for token-by-token output.
    Maintains a rolling buffer to avoid cutting off multi-character tokens
    like '<think>' or 'inspect_memory' across stream chunk boundaries.
    """
    def __init__(self):
        self.buffer = ""
        self.inside_think = False

    def push(self, delta: str) -> str:
        if not delta:
            return ""

        self.buffer += delta

        # Handle <think> tags across stream chunks
        if not self.inside_think:
            if "<think>" in self.buffer.lower():
                parts = re.split(r'<think>', self.buffer, flags=re.IGNORECASE, maxsplit=1)
                before = parts[0]
                self.buffer = parts[1] if len(parts) > 1 else ""
                self.inside_think = True
                return self._flush_clean(before)
        else:
            if "</think>" in self.buffer.lower():
                parts = re.split(r'</think>', self.buffer, flags=re.IGNORECASE, maxsplit=1)
                self.inside_think = False
                self.buffer = parts[1] if len(parts) > 1 else ""
                return ""
            else:
                return ""

        # If buffer ends with any potential prefix of a sensitive term, hold back
        tail = self.buffer.lower()
        should_hold = False
        for pref in SENSITIVE_PREFIXES:
            for i in range(1, len(pref) + 1):
                if tail.endswith(pref[:i]):
                    should_hold = True
                    break
            if should_hold:
                break

        if should_hold:
            return ""

        # Emit safe text up to the last whitespace boundary once buffer is long enough
        last_space = max(self.buffer.rfind(" "), self.buffer.rfind("\n"))
        if last_space > 20:
            to_emit = self.buffer[:last_space + 1]
            self.buffer = self.buffer[last_space + 1:]
            return self._flush_clean(to_emit, strip_whitespace=False)

        return ""

    def flush(self) -> str:
        """Flush remaining buffered tokens at the end of the stream."""
        if self.inside_think:
            self.buffer = ""
            return ""
        remaining = self.buffer
        self.buffer = ""
        return self._flush_clean(remaining)

    def _flush_clean(self, text: str, strip_whitespace: bool = False) -> str:
        return sanitize_agent_text(text, strip_whitespace=strip_whitespace)
