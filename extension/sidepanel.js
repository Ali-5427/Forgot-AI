import { API, BACKEND_URL, getLibraryId, libHeaders } from "./config.js";

const $ = (id) => document.getElementById(id);
const listEl = $("list");
const titleEl = $("list-title");
const toastEl = $("toast");
const linkRow = $("link-row");
const linkInput = $("link-input");

let searchMode = false;

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function typeLabel(t) {
  return t === "image" ? "Image" : t === "url" ? "Link" : "Text";
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function render(items, showWhy) {
  if (!items || items.length === 0) {
    listEl.innerHTML = `<div class="empty">${searchMode ? "Nothing relevant found." : "Nothing saved yet. Save something above."}</div>`;
    return;
  }
  listEl.innerHTML = "";
  items.forEach((it) => {
    const card = document.createElement("div");
    card.className = "card";
    const img = it.content_type === "image" && it.image_path ? `<img src="${API}/files/${it.image_path}" />` : "";
    const preview = it.summary || it.original_text || it.source_url || (it.status === "processing" ? "Understanding…" : "");
    const why = showWhy && it.match_reason ? `<div class="why">why · ${escapeHtml(it.match_reason)}</div>` : "";
    card.innerHTML = `${img}<div class="type">${typeLabel(it.content_type)}</div>
      <div class="title">${escapeHtml(it.title)}</div>
      <div class="preview">${escapeHtml(preview)}</div>${why}`;
    card.onclick = () => chrome.tabs.create({ url: `${BACKEND_URL}/?open=${it.id}` });
    listEl.appendChild(card);
  });
}

async function ensureLinked() {
  const id = await getLibraryId();
  if (id) {
    linkRow.style.display = "none";
    return true;
  }
  linkRow.style.display = "flex";
  return false;
}

async function loadRecent() {
  searchMode = false;
  titleEl.textContent = "Recent saves";
  listEl.innerHTML = `<div class="spinner">Loading…</div>`;
  await ensureLinked();
  try {
    const r = await fetch(`${API}/items`, { headers: await libHeaders() });
    const items = await r.json();
    render(items.slice(0, 12), false);
  } catch {
    listEl.innerHTML = `<div class="empty">Could not reach Forgot AI.</div>`;
  }
}

async function doSearch(q) {
  searchMode = true;
  titleEl.textContent = "Search results";
  listEl.innerHTML = `<div class="spinner">Searching your memory…</div>`;
  try {
    const r = await fetch(`${API}/search`, {
      method: "POST",
      headers: await libHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ query: q }),
    });
    const data = await r.json();
    render(data.results, true);
  } catch {
    listEl.innerHTML = `<div class="empty">Search failed.</div>`;
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// --- Actions ---
$("save-page").onclick = async (e) => {
  const btn = e.target; btn.disabled = true;
  try {
    const tab = await activeTab();
    await fetch(`${API}/items/url`, {
      method: "POST",
      headers: await libHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ url: tab.url, context_text: tab.title, source_title: tab.title }),
    });
    toast("Saved to Forgot AI ✓");
    loadRecent();
  } catch { toast("Could not save"); }
  btn.disabled = false;
};

$("save-selection").onclick = async (e) => {
  const btn = e.target; btn.disabled = true;
  try {
    const tab = await activeTab();
    const [{ result: sel }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString(),
    });
    if (!sel || !sel.trim()) { toast("No text selected on the page"); btn.disabled = false; return; }
    await fetch(`${API}/items/text`, {
      method: "POST",
      headers: await libHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ text: sel, source_url: tab.url, source_title: tab.title }),
    });
    toast("Saved to Forgot AI ✓");
    loadRecent();
  } catch { toast("Could not save selection"); }
  btn.disabled = false;
};

$("save-screenshot").onclick = async (e) => {
  const btn = e.target; btn.disabled = true;
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
    const blob = await (await fetch(dataUrl)).blob();
    const fd = new FormData();
    fd.append("file", blob, "screenshot.png");
    const tab = await activeTab();
    fd.append("source_url", tab.url || "");
    fd.append("source_title", tab.title || "");
    await fetch(`${API}/items/image`, { method: "POST", headers: await libHeaders(), body: fd });
    toast("Saved to Forgot AI ✓");
    loadRecent();
  } catch { toast("Could not capture screenshot"); }
  btn.disabled = false;
};

$("search").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    const q = ev.target.value.trim();
    if (q) doSearch(q); else loadRecent();
  }
});

$("link-save").onclick = async () => {
  const code = linkInput.value.trim();
  if (!code) return;
  await chrome.storage.local.set({ libId: code });
  toast("Library linked ✓");
  loadRecent();
};

loadRecent();
