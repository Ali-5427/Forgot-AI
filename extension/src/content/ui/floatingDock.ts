// Floating Draggable Quick-Access Dock for Forgot AI
// Renders inside a Shadow Root to guarantee zero style bleed on host websites.

const DOCK_STORAGE_KEY_TOP = "forgot_ai_dock_top";
const DOCK_STORAGE_KEY_COLLAPSED = "forgot_ai_dock_collapsed";

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
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>
  </svg>`,
  chevronLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>`,
};

const DOCK_CSS = `
:host {
  all: initial;
}

.dock-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  position: fixed;
  right: 0;
  z-index: 2147483640;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
}

/* Vertical Action Dock */
.tool-dock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: #FFFFFF;
  padding: 10px 6px;
  border-radius: 9999px;
  box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.08);
  margin-right: 12px;
  margin-bottom: 10px;
  opacity: 0;
  transform: translateY(8px) scale(0.95);
  pointer-events: none;
  transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1), transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.dock-root.expanded .tool-dock,
.dock-root:hover .tool-dock {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.tool-item {
  position: relative;
  width: 38px;
  height: 38px;
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
  width: 20px;
  height: 20px;
  stroke-width: 1.8;
  transition: transform 120ms ease;
}

.tool-item:hover {
  background: #F3F4F6;
  color: #111827;
  transform: scale(1.08);
}

.tool-item:active {
  transform: scale(0.95);
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
  font-weight: 600;
  padding: 5px 9px;
  border-radius: 8px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: opacity 120ms ease, transform 120ms ease;
}

.tool-item:hover .tool-label {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* Divider inside tool dock */
.tool-divider {
  width: 20px;
  height: 1px;
  background: #E5E7EB;
  margin: 2px 0;
}

/* Trigger Button Container */
.trigger-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
  cursor: grab;
}

.trigger-bar:active {
  cursor: grabbing;
}

/* Brain Trigger Pill */
.trigger-pill {
  height: 44px;
  padding: 0 12px 0 10px;
  background: #FFFFFF;
  border-radius: 9999px 0 0 9999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-right: none;
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.16), 0 2px 8px -2px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 160ms ease, background 160ms ease;
}

.trigger-pill:hover {
  transform: translateX(-4px);
  box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.22);
}

.trigger-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trigger-icon svg {
  width: 26px;
  height: 26px;
}

/* Minimize Toggle Button */
.collapse-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #18181B;
  color: #A1A1AA;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-right: -4px;
  transition: background 150ms ease, color 150ms ease, transform 150ms ease;
  padding: 0;
}

.collapse-btn svg {
  width: 12px;
  height: 12px;
}

.collapse-btn:hover {
  background: #27272A;
  color: #FFFFFF;
  transform: scale(1.1);
}

/* Collapsed Mini Nub */
.collapsed-nub {
  display: none;
  width: 14px;
  height: 52px;
  background: #18181B;
  border-radius: 8px 0 0 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  cursor: pointer;
  pointer-events: auto;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  opacity: 0.65;
  transition: opacity 150ms ease, width 150ms ease, background 150ms ease;
}

.collapsed-nub svg {
  width: 12px;
  height: 12px;
}

.collapsed-nub:hover {
  opacity: 1;
  width: 20px;
  background: #09090B;
}

.dock-root.collapsed .trigger-bar,
.dock-root.collapsed .tool-dock {
  display: none;
}

.dock-root.collapsed .collapsed-nub {
  display: flex;
}

/* Quick Note Popover Card */
.quick-note-card {
  position: absolute;
  right: 56px;
  bottom: 0;
  width: 280px;
  background: #FFFFFF;
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 16px 40px -6px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.08);
  display: none;
  flex-direction: column;
  gap: 10px;
  pointer-events: auto;
  animation: faPopIn 160ms cubic-bezier(0.16, 1, 0.3, 1);
}

.quick-note-card.visible {
  display: flex;
}

@keyframes faPopIn {
  from { opacity: 0; transform: scale(0.92) translateX(10px); }
  to { opacity: 1; transform: scale(1) translateX(0); }
}

.quick-note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.quick-note-close {
  background: none;
  border: none;
  color: #9CA3AF;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.quick-note-close:hover {
  color: #111827;
}

.quick-note-textarea {
  width: 100%;
  box-sizing: border-box;
  height: 72px;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12.5px;
  font-family: inherit;
  color: #111827;
  resize: none;
  outline: none;
  background: #F9FAFB;
  transition: border-color 150ms ease, background 150ms ease;
}

.quick-note-textarea:focus {
  border-color: #111827;
  background: #FFFFFF;
}

.quick-note-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.quick-note-btn {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
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
}

.quick-note-btn.save {
  background: #111827;
  color: #FFFFFF;
}
.quick-note-btn.save:hover {
  background: #000000;
}

/* Success Toast Ripple */
.action-toast {
  position: absolute;
  right: 56px;
  bottom: 6px;
  background: #111827;
  color: #FFFFFF;
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 150ms ease, transform 150ms ease;
}

.action-toast.show {
  opacity: 1;
  transform: translateY(0);
}

.action-toast svg {
  color: #10B981;
  width: 16px;
  height: 16px;
}
`;

export function initFloatingDock() {
  if (document.querySelector("[data-forgot-ai='floating-dock']")) return;

  const host = document.createElement("div");
  host.setAttribute("data-forgot-ai", "floating-dock");
  host.style.all = "unset";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = DOCK_CSS;
  shadow.appendChild(style);

  const root = document.createElement("div");
  root.className = "dock-root";

  // Initial vertical position
  const savedTop = localStorage.getItem(DOCK_STORAGE_KEY_TOP);
  const defaultTop = window.innerHeight ? Math.max(120, window.innerHeight - 220) : 500;
  const initialTop = savedTop ? parseInt(savedTop, 10) : defaultTop;
  root.style.top = `${initialTop}px`;

  // Initial collapsed state
  if (localStorage.getItem(DOCK_STORAGE_KEY_COLLAPSED) === "true") {
    root.classList.add("collapsed");
  }

  root.innerHTML = `
    <!-- Vertical Tool Dock -->
    <div class="tool-dock">
      <button class="tool-item" data-action="save" title="Save Page">
        ${ICONS.save}
        <span class="tool-label">Save Page</span>
      </button>

      <button class="tool-item" data-action="chat" title="Chat with AI">
        ${ICONS.chat}
        <span class="tool-label">Ask / Chat</span>
      </button>

      <button class="tool-item" data-action="note" title="Quick Note">
        ${ICONS.note}
        <span class="tool-label">Quick Note</span>
      </button>

      <div class="tool-divider"></div>

      <button class="tool-item" data-action="summarize" title="Summarize Page">
        ${ICONS.summarize}
        <span class="tool-label">Summarize</span>
      </button>

      <button class="tool-item" data-action="search" title="Search Memory">
        ${ICONS.search}
        <span class="tool-label">Search Memory</span>
      </button>
    </div>

    <!-- Trigger Bar (Draggable) -->
    <div class="trigger-bar">
      <div class="trigger-pill" title="Forgot AI (Drag to move)">
        <div class="trigger-icon">${ICONS.brain}</div>
        <button class="collapse-btn" title="Collapse">${ICONS.close}</button>
      </div>
    </div>

    <!-- Collapsed Edge Nub -->
    <div class="collapsed-nub" title="Expand Forgot AI">
      ${ICONS.chevronLeft}
    </div>

    <!-- Quick Note Inline Popover -->
    <div class="quick-note-card">
      <div class="quick-note-header">
        <span>Quick Note</span>
        <button class="quick-note-close">${ICONS.close}</button>
      </div>
      <textarea class="quick-note-textarea" placeholder="Type a thought or note to remember..."></textarea>
      <div class="quick-note-actions">
        <button class="quick-note-btn cancel">Cancel</button>
        <button class="quick-note-btn save">Save Note</button>
      </div>
    </div>

    <!-- Action Toast Notification -->
    <div class="action-toast">
      ${ICONS.check}
      <span class="toast-text">Saved to Memory!</span>
    </div>
  `;

  shadow.appendChild(root);
  document.documentElement.appendChild(host);

  // ---------------------------------------------------------------------------
  // Dragging Logic along Y-Axis
  // ---------------------------------------------------------------------------
  const triggerBar = root.querySelector(".trigger-bar") as HTMLElement;
  let isDragging = false;
  let startY = 0;
  let startTop = 0;
  let hasMoved = false;

  triggerBar.addEventListener("mousedown", (e) => {
    // If clicking close button, don't drag
    if ((e.target as HTMLElement).closest(".collapse-btn")) return;
    
    isDragging = true;
    hasMoved = false;
    startY = e.clientY;
    startTop = root.offsetTop;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    e.preventDefault();
  });

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) > 3) hasMoved = true;
    
    let newTop = startTop + dy;
    const vh = window.innerHeight;
    newTop = Math.max(60, Math.min(vh - 120, newTop));
    root.style.top = `${newTop}px`;
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    localStorage.setItem(DOCK_STORAGE_KEY_TOP, String(root.offsetTop));
  }

  // ---------------------------------------------------------------------------
  // Toast Helper
  // ---------------------------------------------------------------------------
  const toast = root.querySelector(".action-toast") as HTMLElement;
  const toastText = root.querySelector(".toast-text") as HTMLElement;
  let toastTimer: any = null;

  function showToast(msg: string) {
    clearTimeout(toastTimer);
    toastText.textContent = msg;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const toolDock = root.querySelector(".tool-dock") as HTMLElement;
  const triggerPill = root.querySelector(".trigger-pill") as HTMLElement;
  const collapseBtn = root.querySelector(".collapse-btn") as HTMLElement;
  const collapsedNub = root.querySelector(".collapsed-nub") as HTMLElement;
  const noteCard = root.querySelector(".quick-note-card") as HTMLElement;
  const noteTextarea = root.querySelector(".quick-note-textarea") as HTMLTextAreaElement;

  // Toggle Collapse
  collapseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    root.classList.add("collapsed");
    localStorage.setItem(DOCK_STORAGE_KEY_COLLAPSED, "true");
  });

  collapsedNub.addEventListener("click", () => {
    root.classList.remove("collapsed");
    localStorage.setItem(DOCK_STORAGE_KEY_COLLAPSED, "false");
  });

  // Toggle expand on trigger pill click (if not dragged)
  triggerPill.addEventListener("click", () => {
    if (!hasMoved) {
      root.classList.toggle("expanded");
    }
  });

  // Tool Click Events
  toolDock.addEventListener("click", async (e) => {
    const btn = (e.target as HTMLElement).closest(".tool-item") as HTMLElement;
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === "save") {
      showToast("Saving page...");
      chrome.runtime.sendMessage(
        {
          type: "SAVE_MEMORY",
          payload: {
            capture_type: "content",
            original_content: document.body.innerText.slice(0, 3000),
            source_url: location.href,
            source_title: document.title,
            source_domain: location.hostname,
          },
        },
        (resp: any) => {
          if (resp?.ok) {
            showToast("Saved to Forgot AI!");
          } else {
            showToast(resp?.error || "Save failed");
          }
        }
      );
    } else if (action === "chat") {
      chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
    } else if (action === "note") {
      noteCard.classList.add("visible");
      setTimeout(() => noteTextarea.focus(), 60);
    } else if (action === "search") {
      chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
    } else if (action === "summarize") {
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

    showToast("Saving note...");
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
          showToast("Note saved!");
          noteTextarea.value = "";
          noteCard.classList.remove("visible");
        } else {
          showToast(resp?.error || "Failed to save note");
        }
      }
    );
  });
}
