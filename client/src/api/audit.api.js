import api from "./axios";

export const listAudit = (params) => api.get("/audit", { params }).then((r) => r.data);
