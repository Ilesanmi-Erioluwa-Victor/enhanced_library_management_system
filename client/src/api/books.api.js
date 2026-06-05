import api from "./axios";

export const listBooks = (params) => api.get("/books", { params }).then((r) => r.data);
export const listAvailable = () => api.get("/books/available").then((r) => r.data);
export const getBook = (id) => api.get(`/books/${id}`).then((r) => r.data);
export const createBook = (payload) => api.post("/books", payload).then((r) => r.data);
export const updateBook = (id, payload) => api.put(`/books/${id}`, payload).then((r) => r.data);
export const softDeleteBook = (id) => api.delete(`/books/${id}`).then((r) => r.data);
export const uploadBookCover = (id, formData) => api.post(`/books/${id}/cover`, formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
