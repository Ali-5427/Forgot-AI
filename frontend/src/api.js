import axios from "axios";

// Fallback to local host if env var is missing during build, or empty string (relative)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://forgot-ai.onrender.com";
export const API = `${BACKEND_URL}/api`;

const LIB_KEY = "forgot_ai_library";
const TOKEN_KEY = "forgot_ai_token";
const REFRESH_KEY = "forgot_ai_refresh_token";

export function getLibraryId() {
  let id = localStorage.getItem(LIB_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    localStorage.setItem(LIB_KEY, id);
  }
  return id;
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const setRefreshToken = (rt) => (rt ? localStorage.setItem(REFRESH_KEY, rt) : localStorage.removeItem(REFRESH_KEY));

// Attach auth token (if signed in) + the browser's anonymous library id to every request.
axios.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  const t = getToken();
  if (t) config.headers["Authorization"] = `Bearer ${t}`;
  config.headers["X-Library-Id"] = getLibraryId();
  return config;
});

let isRefreshing = false;

// If a signed-in request is rejected (expired/logged-out token), attempt refresh once or drop session.
axios.interceptors.response.use(
  (r) => r,
  async (error) => {
    const originalRequest = error?.config;
    const url = originalRequest?.url || "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/register") || url.includes("/auth/refresh");

    if (error?.response?.status === 401 && getToken() && !isAuthCall && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const rt = getRefreshToken();
      if (rt && !isRefreshing) {
        isRefreshing = true;
        try {
          const res = await axios.post(`${API}/auth/refresh`, { refresh_token: rt });
          if (res.data?.token) {
            setToken(res.data.token);
            if (res.data.refresh_token) setRefreshToken(res.data.refresh_token);
            originalRequest.headers["Authorization"] = `Bearer ${res.data.token}`;
            isRefreshing = false;
            return axios(originalRequest);
          }
        } catch {
          isRefreshing = false;
        }
      }
      setToken(null);
      setRefreshToken(null);
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const fileUrl = (imagePath) => {
  const t = getToken();
  const q = t ? `token=${encodeURIComponent(t)}` : `lib=${encodeURIComponent(getLibraryId())}`;
  return `${API}/files/${imagePath}?${q}`;
};

async function sha256Hex(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const api = {
  // auth
  register: (email, password) => axios.post(`${API}/auth/register`, { email, password }).then((r) => r.data),
  login: (email, password) => axios.post(`${API}/auth/login`, { email, password }).then((r) => r.data),
  me: () => axios.get(`${API}/auth/me`).then((r) => r.data),
  logout: () => axios.post(`${API}/auth/logout`).then((r) => r.data),
  importLibrary: (library_id) => axios.post(`${API}/auth/import`, { library_id }).then((r) => r.data),
  // items
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

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
