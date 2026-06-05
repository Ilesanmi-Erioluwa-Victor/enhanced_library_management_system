import axios from "axios";
import { STORAGE_KEY, clearStoredAuth } from "../context/AuthContext.jsx";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

const getStoredToken = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.token || null;
  } catch {
    return null;
  }
};

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      clearStoredAuth();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?session=expired";
      }
    }
    return Promise.reject(err);
  },
);

export default api;
