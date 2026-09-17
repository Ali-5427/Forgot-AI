// Pill button rendered inside a Shadow Root. State-driven, framework-free
// to keep bundle tiny and avoid React DOM re-mount issues on host pages.
import { PILL_CSS, ICONS } from "./styles";

export type PillState = "idle" | "prompting" | "saving" | "saved" | "error";

export interface PillOptions {
  label?: string;
  onClick?: () => void; // Optional if using onSubmit
  onSubmit?: (note: string) => void;
  testId?: string;
}

export interface PillHandle {
  host: HTMLElement;
  setState: (state: PillState, message?: string) => void;
  getState: () => PillState;
  setPosition: (rect: { top: number; left: number; fixed?: boolean }) => void;
  destroy: () => void;
  el: HTMLDivElement;
}

export function createPill(opts: PillOptions): PillHandle {
  const host = document.createElement("div");
  host.setAttribute("data-forgot-ai", "pill");
  // The host itself is unstyled; all styling lives inside the shadow.
  host.style.all = "unset";
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = PILL_CSS;
  shadow.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className = "wrap";

  // Use a form so we can easily handle Enter to submit the input
  const btn = document.createElement("form");
  btn.className = "pill floating";
  btn.setAttribute("data-testid", opts.testId || "forgot-ai-pill-button");
  
  const renderIdle = () => {
    btn.innerHTML = `<button type="button" class="prompt-form" style="background:transparent;border:none;color:inherit;font:inherit;cursor:pointer;padding:0;outline:none;"><span class="icon">${ICONS.bookmark}</span><span class="label" data-testid="forgot-ai-pill-status">${opts.label || "Save to Forgot AI"}</span></button>`;
  };
  
  renderIdle();

  // Prevent selection loss on click, EXCEPT when clicking the input field.
  btn.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === "INPUT") {
      // allow default to let the input gain focus!
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  });

  // Handle click on the pill itself (for idle state)
  btn.addEventListener("click", (e) => {
    // If we're already prompting, clicking the pill shouldn't do anything
    // unless they clicked the actual submit button which is handled by submit event.
    if (btn.classList.contains("prompting")) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (opts.onSubmit) {
      setState("prompting");
    } else if (opts.onClick) {
      opts.onClick();
    }
  });

  // Handle form submission (for prompt state)
  btn.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (opts.onSubmit) {
      const input = btn.querySelector(".prompt-input") as HTMLInputElement;
      opts.onSubmit(input ? input.value : "");
    }
  });

  wrap.appendChild(btn);
  shadow.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("visible"));

  document.documentElement.appendChild(host);

  const setState: PillHandle["setState"] = (state, message) => {
    btn.classList.remove("saving", "saved", "error", "prompting");
    
    if (state === "prompting") {
      btn.classList.add("prompting");
      btn.innerHTML = `
        <div class="prompt-form">
          <input type="text" class="prompt-input" placeholder="Why are you saving this?" autofocus />
          <button type="submit" class="prompt-submit">${ICONS.arrow}</button>
        </div>
      `;
      // focus input
      setTimeout(() => {
        const input = btn.querySelector(".prompt-input") as HTMLInputElement;
        if (input) input.focus();
      }, 50);
      return;
    }

    // Restore standard HTML structure if coming from prompting
    if (!btn.querySelector(".icon")) {
      renderIdle();
    }

    const label = btn.querySelector(".label") as HTMLElement;
    const icon = btn.querySelector(".icon") as HTMLElement;
    switch (state) {
      case "saving":
        btn.classList.add("saving");
        btn.setAttribute("disabled", "true");
        icon.innerHTML = `<span class="spinner"></span>`;
        label.textContent = message || "Saving...";
        break;
      case "saved":
        btn.classList.add("saved");
        btn.setAttribute("disabled", "true");
        icon.innerHTML = ICONS.check;
        label.textContent = message || "Saved to Forgot AI";
        break;
      case "error":
        btn.classList.add("error");
        btn.removeAttribute("disabled");
        icon.innerHTML = ICONS.alert;
        label.textContent = message || "Save failed";
        break;
      case "idle":
      default:
        btn.removeAttribute("disabled");
        icon.innerHTML = ICONS.bookmark;
        label.textContent = "Save to Forgot AI";
        break;
    }
  };

  const getState: PillHandle["getState"] = () => {
    if (btn.classList.contains("prompting")) return "prompting";
    if (btn.classList.contains("saving")) return "saving";
    if (btn.classList.contains("saved")) return "saved";
    if (btn.classList.contains("error")) return "error";
    return "idle";
  };

  const setPosition: PillHandle["setPosition"] = ({ top, left, fixed = true }) => {
    host.style.position = fixed ? "fixed" : "absolute";
    host.style.top = `${Math.max(4, top)}px`;
    host.style.left = `${Math.max(4, left)}px`;
    // Enable pointer events only on the button; leave wrap transparent.
    btn.style.pointerEvents = "auto";
  };

  const destroy = () => {
    wrap.classList.remove("visible");
    setTimeout(() => host.remove(), 180);
  };

  return { host, setState, getState, setPosition, destroy, el: btn as unknown as HTMLDivElement };
}

// Position the pill near a selection rect, viewport-edge aware.
export function positionNearSelectionRect(
  handle: PillHandle,
  rect: DOMRect
): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = 240; // increased slightly to accommodate input
  const h = 36;
  let left = rect.left + rect.width / 2 - w / 2;
  let top = rect.top - h - 8;
  if (top < 8) top = rect.bottom + 8;
  if (top + h > vh - 8) top = vh - h - 8;
  if (left < 8) left = 8;
  if (left + w > vw - 8) left = vw - w - 8;
  handle.setPosition({ top, left, fixed: true });
}

// Position anchored beside an element (Mode B). Uses fixed positioning
// pinned to element's viewport rect so it follows scroll cleanly on next tick.
export function positionAnchored(handle: PillHandle, el: HTMLElement): void {
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const w = 240;
  let left = rect.right - w;
  let top = rect.top + 8;
  if (left < 8) left = rect.left + 8;
  if (left + w > vw - 8) left = vw - w - 8;
  handle.setPosition({ top, left, fixed: true });
}
