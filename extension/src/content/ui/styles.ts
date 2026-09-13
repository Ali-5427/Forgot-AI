// Shared CSS injected into every Shadow Root that hosts a Forgot AI pill.
// Uses the design tokens from /app/design_guidelines.json.
export const PILL_CSS = `
:host {
  all: initial;
}

@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600&display=swap');

.wrap {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #FAFAFA;
  line-height: 1;
  pointer-events: auto;
  opacity: 0;
  transition: opacity 150ms ease-out;
}
.wrap.visible { opacity: 1; }

.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border-radius: 9999px;
  border: 1px solid #27272A;
  background: #09090B;
  color: #FAFAFA;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5);
  transition: background-color 150ms ease-out, border-color 150ms ease-out, opacity 150ms ease-out;
  white-space: nowrap;
}
.pill:hover { background: #18181B; border-color: #3F3F46; }
.pill:focus { outline: none; box-shadow: 0 0 0 2px #52525B, 0 10px 25px -5px rgba(0,0,0,0.5); }
.pill[disabled] { cursor: default; }

.pill .icon { width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; }
.pill svg { width: 14px; height: 14px; display: block; }

.pill.saving  { background: #18181B; border-color: #3F3F46; color: #A1A1AA; }
.pill.saved   { background: #022C22; border-color: #065F46; color: #34D399; }
.pill.error   { background: #450A0A; border-color: #991B1B; color: #FCA5A5; }

.spinner {
  width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.15);
  border-top-color: #A1A1AA;
  animation: fa-spin 700ms linear infinite;
}
@keyframes fa-spin { to { transform: rotate(360deg); } }

.floating {
  position: fixed;
  z-index: 2147483647;
}
.anchored {
  position: absolute;
  z-index: 2147483000;
}
`;

export const ICONS = {
  bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
};
