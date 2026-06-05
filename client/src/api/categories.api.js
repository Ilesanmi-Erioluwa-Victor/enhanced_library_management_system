import api from "./axios";

export const listCategories = () => api.get("/categories").then((r) => r.data);
export const createCategory = (payload) => api.post("/categories", payload).then((r) => r.data);
export const updateCategory = (id, payload) => api.put(`/categories/${id}`, payload).then((r) => r.data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`).then((r) => r.data);
