import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const LIB_KEY = "forgot_ai_library";

export function getLibraryId() {
  let id = localStorage.getItem(LIB_KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    localStorage.setItem(LIB_KEY, id);
  }
  return id;
}

// Attach the browser's private library id to every request.
axios.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers["X-Library-Id"] = getLibraryId();
  return config;
});

export const fileUrl = (imagePath) => `${API}/files/${imagePath}`;

async function sha256Hex(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const api = {
  listItems: () => axios.get(`${API}/items`).then((r) => r.data),
  getItem: (id) => axios.get(`${API}/items/${id}`).then((r) => r.data),
  related: (id) => axios.get(`${API}/items/${id}/related`).then((r) => r.data),
  saveText: (payload) => axios.post(`${API}/items/text`, payload).then((r) => r.data),
  saveUrl: (payload) => axios.post(`${API}/items/url`, payload).then((r) => r.data),
  saveImage: (formData) =>
    axios.post(`${API}/items/image`, formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  updateItem: (id, payload) => axios.put(`${API}/items/${id}`, payload).then((r) => r.data),
  deleteItem: (id) => axios.delete(`${API}/items/${id}`).then((r) => r.data),
  retryItem: (id) => axios.post(`${API}/items/${id}/retry`).then((r) => r.data),
  pinItem: (id, pinned) => axios.post(`${API}/items/${id}/pin`, { pinned }).then((r) => r.data),
  ask: (id, question) => axios.post(`${API}/items/${id}/ask`, { question }).then((r) => r.data),
  search: (query) => axios.post(`${API}/search`, { query }).then((r) => r.data),
  chat: (query) => axios.post(`${API}/chat`, { query }).then((r) => r.data),
  check: (payload) => axios.post(`${API}/items/check`, payload).then((r) => r.data),
  checkFile: async (file) => api.check({ content_type: "image", hash: await sha256Hex(file) }),
};
