import api from "./axios";

export const listDepartments = (params = {}) => api.get("/departments", { params }).then((r) => r.data);
export const listActiveDepartments = () => api.get("/departments", { params: { activeOnly: "true" } }).then((r) => r.data);
export const createDepartment = (payload) => api.post("/departments", payload).then((r) => r.data);
export const updateDepartment = (id, payload) => api.put(`/departments/${id}`, payload).then((r) => r.data);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`).then((r) => r.data);
