import api from "./axios";

export const listMembers = (params) => api.get("/members", { params }).then((r) => r.data);
export const getMember = (id) => api.get(`/members/${id}`).then((r) => r.data);
export const createMember = (payload) => api.post("/members", payload).then((r) => r.data);
export const updateMember = (id, payload) => api.put(`/members/${id}`, payload).then((r) => r.data);
export const deactivateMember = (id) => api.delete(`/members/${id}`).then((r) => r.data);
export const uploadMemberPhoto = (id, formData) => api.post(`/members/${id}/photo`, formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
export const getMemberHistory = (id) => api.get(`/members/${id}/history`).then((r) => r.data);
export const lookupMemberByEmail = (email) => api.get(`/members/lookup`, { params: { email } }).then((r) => r.data);
