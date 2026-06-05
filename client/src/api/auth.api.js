import api from "./axios";

export const login = (payload) => api.post("/auth/login", payload).then((r) => r.data);
export const logout = () => api.post("/auth/logout").then((r) => r.data);
export const forgotPassword = (payload) => api.post("/auth/forgot-password", payload).then((r) => r.data);
export const resetPassword = (token, payload) => api.post(`/auth/reset-password/${token}`, payload).then((r) => r.data);
export const me = () => api.get("/auth/me").then((r) => r.data);
