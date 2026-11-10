// Floating Draggable Quick-Access Dock for Forgot AI
// Renders inside a Shadow Root to guarantee zero style bleed on host websites.

const DOCK_STORAGE_KEY_TOP = "forgot_ai_dock_top";
const DOCK_STORAGE_KEY_COLLAPSED = "forgot_ai_dock_collapsed_v2";

const ICONS = {
  brain: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="faBrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#EC4899" />
        <stop offset="35%" stop-color="#8B5CF6" />
        <stop offset="70%" stop-color="#3B82F6" />
        <stop offset="100%" stop-color="#06B6D4" />
      </linearGradient>
    </defs>
    <path d="M16 6a5.5 5.5 0 0 0-5.3 4.1 4.5 4.5 0 0 0-3.2 4.3 4.5 4.5 0 0 0 .5 2 5.5 5.5 0 0 0 2.5 9.6h1.5M16 6a5.5 5.5 0 0 1 5.3 4.1 4.5 4.5 0 0 1 3.2 4.3 4.5 4.5 0 0 1-.5 2 5.5 5.5 0 0 1-2.5 9.6H20" stroke="url(#faBrainGrad)" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M12 12a3 3 0 0 1 3 3v8M20 12a3 3 0 0 0-3 3v8" stroke="url(#faBrainGrad)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="16" cy="15" r="1.5" fill="url(#faBrainGrad)"/>
    <circle cx="12" cy="18" r="1.2" fill="url(#faBrainGrad)"/>
    <circle cx="20" cy="18" r="1.2" fill="url(#faBrainGrad)"/>
  </svg>`,
  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
    <line x1="12" x2="12" y1="7" y2="13"/>
    <line x1="9" x2="15" y1="10" y2="10"/>
  </svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
    <path d="M8 12h.01"/>
    <path d="M12 12h.01"/>
    <path d="M16 12h.01"/>
  </svg>`,
  note: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>`,
  summarize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
    <path d="M6 6h10"/>
    <path d="M6 10h10"/>
    <path d="M6 14h6"/>
  </svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>`,
  chevronLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>
  </svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`,
};

const DOCK_CSS = `
:host {
  all: initial;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 2147483647;
  pointer-events: none;
}

.dock-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  position: fixed;
  right: 0;
  z-index: 2147483647;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
}

/* Sider-Style Vertical Action Dock */
.tool-dock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  background: #FFFFFF;
  padding: 8px 6px;
  border-radius: 9999px;
  box-shadow: 0 10px 32px -4px rgba(0, 0, 0, 0.16), 0 3px 10px -2px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.09);
  margin-right: 10px;
  pointer-events: auto;
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease;
  opacity: 1;
  transform: translateX(0);
}

.dock-root.collapsed .tool-dock {
  display: none;
}

/* Top Header & Logo (Drag Handle) */
.dock-header {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: grab;
  transition: background-color 150ms ease, transform 150ms ease;
  position: relative;
}

.dock-header:hover {
  background: #F4F4F5;
}

.dock-header:active {
  cursor: grabbing;
}

.dock-header svg {
  width: 26px;
  height: 26px;
  pointer-events: none;
}

/* Tool Buttons */
.tool-item {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease, transform 120ms ease;
  outline: none;
  padding: 0;
}

.tool-item svg {
  width: 19px;
  height: 19px;
  stroke-width: 1.9;
  transition: transform 120ms ease;
}

.tool-item:hover {
  background: #F3F4F6;
  color: #111827;
  transform: scale(1.08);
}

.tool-item:active {
  transform: scale(0.94);
}

.tool-item.saved {
  background: #ECFDF5;
  color: #059669;
}

/* Divider inside tool dock */
.tool-divider {
  width: 22px;
  height: 1px;
  background: #E5E7EB;
  margin: 3px 0;
}

/* Tooltip labels sliding out to the left */
.tool-label {
  position: absolute;
  right: 48px;
  top: 50%;
  transform: translateY(-50%) translateX(6px);
  background: #111827;
  color: #FFFFFF;
  font-size: 11.5px;
  font-weight: 500;
  padding: 5px 9px;
  border-radius: 7px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  transition: opacity 120ms ease, transform 120ms ease;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 100;
}

.tool-label kbd {
  background: #374151;
  color: #E5E7EB;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-family: inherit;
}

.tool-item:hover .tool-label,
.dock-header:hover .tool-label,
.collapse-btn:hover .tool-label {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* Collapse Arrow Button */
.collapse-btn {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #9CA3AF;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease, transform 140ms ease;
  outline: none;
  padding: 0;
  margin-top: 2px;
}

.collapse-btn svg {
  width: 15px;
  height: 15px;
}

.collapse-btn:hover {
  background: #F3F4F6;
  color: #111827;
  transform: scale(1.1);
}

/* Collapsed Mini Edge Nub */
.collapsed-nub {
  display: none;
  pointer-events: auto;
  position: fixed;
  right: 0;
  width: 32px;
  height: 44px;
  background: #FFFFFF;
  border-radius: 22px 0 0 22px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-right: none;
  box-shadow: -2px 6px 20px -2px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding-left: 3px;
  transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 160ms ease;
}

.collapsed-nub:hover {
  transform: translateX(-4px);
  box-shadow: -4px 8px 24px -2px rgba(0, 0, 0, 0.24);
}

.collapsed-nub .nub-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapsed-nub .nub-icon svg {
  width: 19px;
  height: 19px;
}

.collapsed-nub .nub-arrow {
  color: #6B7280;
  width: 10px;
  height: 10px;
  display: flex;
  align-items: center;
}

.collapsed-nub .nub-arrow svg {
  width: 10px;
  height: 10px;
}

.dock-root.collapsed .collapsed-nub {
  display: flex;
}

/* Quick Note Popover Card */
.quick-note-card {
  position: absolute;
  right: 58px;
  top: 50%;
  transform: translateY(-50%);
  width: 290px;
  background: #FFFFFF;
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 16px 40px -6px rgba(0, 0, 0, 0.22), 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.09);
  display: none;
  flex-direction: column;
  gap: 10px;
  pointer-events: auto;
  z-index: 200;
  animation: faPopIn 150ms cubic-bezier(0.16, 1, 0.3, 1);
}

.quick-note-card.visible {
  display: flex;
}

@keyframes faPopIn {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(10px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0) scale(1);
  }
}

.quick-note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.quick-note-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.quick-note-title svg {
  width: 15px;
  height: 15px;
  stroke: #6366F1;
}

.quick-note-close {
  background: transparent;
  border: none;
  color: #9CA3AF;
  cursor: pointer;
  padding: 3px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 120ms ease;
}

.quick-note-close:hover {
  background: #F3F4F6;
  color: #111827;
}

.quick-note-close svg {
  width: 14px;
  height: 14px;
}

.quick-note-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 85px;
  max-height: 200px;
  border-radius: 10px;
  border: 1px solid #E5E7EB;
  padding: 9px 11px;
  font-size: 12.5px;
  font-family: inherit;
  color: #1F2937;
  resize: vertical;
  outline: none;
  line-height: 1.45;
  transition: border-color 150ms ease;
}

.quick-note-textarea:focus {
  border-color: #6366F1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.quick-note-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.quick-note-btn {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  transition: all 120ms ease;
}

.quick-note-btn.cancel {
  background: #F3F4F6;
  color: #4B5563;
}

.quick-note-btn.cancel:hover {
  background: #E5E7EB;
  color: #111827;
}

.quick-note-btn.save {
  background: #111827;
  color: #FFFFFF;
}

.quick-note-btn.save:hover {
  background: #000000;
}

/* Action Toast Notification */
.action-toast {
  position: absolute;
  right: 58px;
  bottom: 6px;
  background: #111827;
  color: #FFFFFF;
  padding: 8px 13px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition: opacity 180ms ease, transform 180ms ease;
  white-space: nowrap;
  z-index: 300;
}

.action-toast.show {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.action-toast svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
`;

// -----------------------------------------------------------------------------
// Content Extraction Helper
// -----------------------------------------------------------------------------
function extractPageMetadata() {
  const selection = window.getSelection()?.toString().trim();
  if (selection && selection.length > 3) {
    return {
      capture_type: "highlight" as const,
      original_content: selection.slice(0, 5000),
      source_url: location.href,
      source_title: document.title || location.hostname,
      source_domain: location.hostname,
    };
  }

  const metaDesc =
    document.querySelector('meta[name="description"]')?.getAttribute("content") ||
    document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
    document.querySelector('meta[name="twitter:description"]')?.getAttribute("content") ||
    "";

  const mainEl =
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.querySelector('[role="main"]') ||
    document.body;

  const rawText = (mainEl?.innerText || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);

  const content = metaDesc
    ? `${metaDesc}\n\n${rawText.slice(0, 2200)}`
    : rawText || document.title;

  return {
    capture_type: "content" as const,
    original_content: content.slice(0, 3000),
    source_url: location.href,
    source_title: document.title || location.hostname,
    source_domain: location.hostname,
  };
}

// -----------------------------------------------------------------------------
// Main Initialization
// -----------------------------------------------------------------------------
export function initFloatingDock() {
  if (document.querySelector("[data-forgot-ai='floating-dock']")) return;

  const host = document.createElement("div");
  host.setAttribute("data-forgot-ai", "floating-dock");
  host.style.all = "unset";
  host.style.position = "fixed";
  host.style.right = "0";
  host.style.top = "0";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";

  // Check if disabled by user settings
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.get(["forgot_ai_dock_disabled"], (res) => {
      if (res?.forgot_ai_dock_disabled) {
        host.style.display = "none";
      }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && "forgot_ai_dock_disabled" in changes) {
        host.style.display = changes.forgot_ai_dock_disabled.newValue ? "none" : "";
      }
    });
  }

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = DOCK_CSS;
  shadow.appendChild(style);

  const root = document.createElement("div");
  root.className = "dock-root";

  // Calculate Initial Vertical Position (localStorage fallback)
  const savedTop = localStorage.getItem(DOCK_STORAGE_KEY_TOP);
  const vh = window.innerHeight || 800;
  const defaultTop = Math.max(100, Math.round(vh / 2 - 130));
  let initialTop = defaultTop;
  if (savedTop) {
    const parsed = parseInt(savedTop, 10);
    if (!isNaN(parsed) && parsed > 40 && parsed < (vh - 100)) {
      initialTop = parsed;
    }
  }
  root.style.top = `${initialTop}px`;

  // Initial collapsed state
  if (localStorage.getItem(DOCK_STORAGE_KEY_COLLAPSED) === "true") {
    root.classList.add("collapsed");
  }

  root.innerHTML = `
    <!-- Sider-Style Vertical Tool Dock -->
    <div class="tool-dock">
      <!-- Drag Handle & Logo -->
      <div class="dock-header" title="Forgot AI (Drag to move)">
        <div class="dock-logo">${ICONS.brain}</div>
        <span class="tool-label">Forgot AI</span>
      </div>

      <!-- Action 1: Save Page -->
      <button class="tool-item" data-action="save" title="Save Page (Alt+S)">
        ${ICONS.save}
        <span class="tool-label">Save Page <kbd>Alt+S</kbd></span>
      </button>

      <!-- Action 2: Ask AI / Chat -->
      <button class="tool-item" data-action="chat" title="Ask AI / Chat (Alt+P)">
        ${ICONS.chat}
        <span class="tool-label">Ask AI <kbd>Alt+P</kbd></span>
      </button>

      <!-- Action 3: Quick Note -->
      <button class="tool-item" data-action="note" title="Quick Note">
        ${ICONS.note}
        <span class="tool-label">Quick Note</span>
      </button>

      <div class="tool-divider"></div>

      <!-- Action 4: Summarize Page -->
      <button class="tool-item" data-action="summarize" title="Summarize Page">
        ${ICONS.summarize}
        <span class="tool-label">Summarize</span>
      </button>

      <!-- Action 5: Search Memory -->
      <button class="tool-item" data-action="search" title="Search Memory">
        ${ICONS.search}
        <span class="tool-label">Search</span>
      </button>

      <div class="tool-divider"></div>

      <!-- Action 6: Collapse Dock -->
      <button class="collapse-btn" title="Collapse Dock">
        ${ICONS.chevronRight}
        <span class="tool-label">Collapse Dock</span>
      </button>
    </div>

    <!-- Collapsed Slim Edge Nub -->
    <div class="collapsed-nub" title="Forgot AI (Click to expand)">
      <div class="nub-icon">${ICONS.brain}</div>
      <div class="nub-arrow">${ICONS.chevronLeft}</div>
    </div>

    <!-- Quick Note Popover Card -->
    <div class="quick-note-card">
      <div class="quick-note-header">
        <div class="quick-note-title">
          ${ICONS.note}
          <span>Quick Note</span>
        </div>
        <button class="quick-note-close" title="Close">${ICONS.close}</button>
      </div>
      <textarea class="quick-note-textarea" placeholder="Add a thought or note to remember with this page..."></textarea>
      <div class="quick-note-actions">
        <button class="quick-note-btn cancel">Cancel</button>
        <button class="quick-note-btn save">Save Note</button>
      </div>
    </div>

    <!-- Action Toast Notification -->
    <div class="action-toast">
      <span class="toast-icon">${ICONS.check}</span>
      <span class="toast-text">Saved to Forgot AI!</span>
    </div>
  `;

  shadow.appendChild(root);
  (document.body || document.documentElement).appendChild(host);

  // ---------------------------------------------------------------------------
  // Dragging Logic along Y-Axis
  // ---------------------------------------------------------------------------
  const dockHeader = root.querySelector(".dock-header") as HTMLElement;
  let isDragging = false;
  let startY = 0;
  let startTop = 0;

  dockHeader.addEventListener("mousedown", (e) => {
    isDragging = true;
    startY = e.clientY;
    startTop = root.getBoundingClientRect().top;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    e.preventDefault();
  });

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const dy = e.clientY - startY;
    let newTop = startTop + dy;
    const currentVh = window.innerHeight || 800;
    newTop = Math.max(50, Math.min(currentVh - 140, newTop));
    root.style.top = `${newTop}px`;
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    const finalTop = Math.round(root.getBoundingClientRect().top);
    if (finalTop > 30) {
      localStorage.setItem(DOCK_STORAGE_KEY_TOP, String(finalTop));
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.set({ [DOCK_STORAGE_KEY_TOP]: finalTop }).catch(() => {});
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Toast Helper
  // ---------------------------------------------------------------------------
  const toast = root.querySelector(".action-toast") as HTMLElement;
  const toastIcon = root.querySelector(".toast-icon") as HTMLElement;
  const toastText = root.querySelector(".toast-text") as HTMLElement;
  let toastTimer: any = null;

  function showToast(msg: string, type: "success" | "warn" | "error" = "success") {
    clearTimeout(toastTimer);
    toastText.textContent = msg;
    if (type === "success") {
      toastIcon.innerHTML = ICONS.check;
    } else if (type === "warn") {
      toastIcon.innerHTML = ICONS.alert;
    } else {
      toastIcon.innerHTML = ICONS.alert;
    }
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  // ---------------------------------------------------------------------------
  // Elements & Event Handlers
  // ---------------------------------------------------------------------------
  const toolDock = root.querySelector(".tool-dock") as HTMLElement;
  const collapseBtn = root.querySelector(".collapse-btn") as HTMLElement;
  const collapsedNub = root.querySelector(".collapsed-nub") as HTMLElement;
  const noteCard = root.querySelector(".quick-note-card") as HTMLElement;
  const noteTextarea = root.querySelector(".quick-note-textarea") as HTMLTextAreaElement;
  const saveBtn = root.querySelector('[data-action="save"]') as HTMLElement;

  // Toggle Collapse
  collapseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    root.classList.add("collapsed");
    localStorage.setItem(DOCK_STORAGE_KEY_COLLAPSED, "true");
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ [DOCK_STORAGE_KEY_COLLAPSED]: "true" }).catch(() => {});
    }
  });

  collapsedNub.addEventListener("click", () => {
    root.classList.remove("collapsed");
    localStorage.setItem(DOCK_STORAGE_KEY_COLLAPSED, "false");
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ [DOCK_STORAGE_KEY_COLLAPSED]: "false" }).catch(() => {});
    }
  });

  // Save Page Action
  async function handleSavePage() {
    showToast("Saving page...", "warn");
    const payload = extractPageMetadata();

    chrome.runtime.sendMessage(
      {
        type: "SAVE_MEMORY",
        payload,
      },
      (resp: any) => {
        if (chrome.runtime.lastError) {
          showToast(chrome.runtime.lastError.message || "Save error", "error");
          return;
        }
        if (resp?.ok) {
          showToast(resp.deduped ? "Already in your memory!" : "Saved to Forgot AI!", "success");
          if (saveBtn) {
            saveBtn.classList.add("saved");
            setTimeout(() => saveBtn.classList.remove("saved"), 1800);
          }
        } else if (resp?.unauthenticated) {
          showToast("Not signed in — click to log in", "warn");
          toast.onclick = () => chrome.runtime.sendMessage({ type: "OPEN_AUTH_TAB" });
        } else {
          showToast(resp?.error || "Save failed. Try again.", "error");
        }
      }
    );
  }

  // Tool Click Events
  toolDock.addEventListener("click", async (e) => {
    const btn = (e.target as HTMLElement).closest(".tool-item") as HTMLElement;
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === "save") {
      handleSavePage();
    } else if (action === "chat") {
      chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
    } else if (action === "note") {
      noteCard.classList.add("visible");
      setTimeout(() => noteTextarea.focus(), 60);
    } else if (action === "summarize") {
      showToast("Opening side panel...", "success");
      chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
    } else if (action === "search") {
      chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
    }
  });

  // Quick Note Form handlers
  noteCard.querySelector(".quick-note-close")?.addEventListener("click", () => {
    noteCard.classList.remove("visible");
  });
  noteCard.querySelector(".quick-note-btn.cancel")?.addEventListener("click", () => {
    noteCard.classList.remove("visible");
  });
  noteCard.querySelector(".quick-note-btn.save")?.addEventListener("click", () => {
    const text = noteTextarea.value.trim();
    if (!text) return;

    showToast("Saving note...", "warn");
    chrome.runtime.sendMessage(
      {
        type: "SAVE_MEMORY",
        payload: {
          capture_type: "content",
          original_content: text,
          source_url: location.href,
          source_title: `Note from ${document.title}`,
          source_domain: location.hostname,
          user_note: text,
        },
      },
      (resp: any) => {
        if (resp?.ok) {
          showToast("Note saved to Forgot AI!", "success");
          noteTextarea.value = "";
          noteCard.classList.remove("visible");
        } else if (resp?.unauthenticated) {
          showToast("Not signed in — please log in", "warn");
        } else {
          showToast(resp?.error || "Failed to save note", "error");
        }
      }
    );
  });

  // Global Shortcut Command Listener (e.g. Alt+S pressed)
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "TRIGGER_DOCK_SAVE") {
        handleSavePage();
      }
    });
  }
}
