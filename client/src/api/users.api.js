import api from "./axios";

export const listUsers = (params = {}) => {
  const cleaned = {};
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v !== "" && v !== null && v !== undefined) cleaned[k] = v;
  });
  return api.get("/users", { params: cleaned }).then((r) => r.data);
};
export const createUser = (payload) => api.post("/users", payload).then((r) => r.data);
export const updateUser = (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data);
export const deactivateUser = (id) => api.delete(`/users/${id}`).then((r) => r.data);
