import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const fileUrl = (imagePath) => `${API}/files/${imagePath}`;

export const api = {
  listItems: () => axios.get(`${API}/items`).then((r) => r.data),
  getItem: (id) => axios.get(`${API}/items/${id}`).then((r) => r.data),
  saveText: (payload) => axios.post(`${API}/items/text`, payload).then((r) => r.data),
  saveUrl: (payload) => axios.post(`${API}/items/url`, payload).then((r) => r.data),
  saveImage: (formData) =>
    axios.post(`${API}/items/image`, formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  updateItem: (id, payload) => axios.put(`${API}/items/${id}`, payload).then((r) => r.data),
  deleteItem: (id) => axios.delete(`${API}/items/${id}`).then((r) => r.data),
  retryItem: (id) => axios.post(`${API}/items/${id}/retry`).then((r) => r.data),
  ask: (id, question) => axios.post(`${API}/items/${id}/ask`, { question }).then((r) => r.data),
  search: (query) => axios.post(`${API}/search`, { query }).then((r) => r.data),
};
