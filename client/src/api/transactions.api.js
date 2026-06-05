import api from "./axios";

export const listTransactions = (params) => api.get("/transactions", { params }).then((r) => r.data);
export const getTransaction = (id) => api.get(`/transactions/${id}`).then((r) => r.data);
export const issueBook = (payload) => api.post("/transactions/issue", payload).then((r) => r.data);
export const returnBook = (payload) => api.post("/transactions/return", payload).then((r) => r.data);
export const lookupTransaction = (payload) => api.post("/transactions/lookup", payload).then((r) => r.data);
export const renewTransaction = (id) => api.post(`/transactions/renew/${id}`).then((r) => r.data);
export const markLost = (id) => api.post(`/transactions/lost/${id}`).then((r) => r.data);
export const getOverdue = () => api.get("/transactions/overdue").then((r) => r.data);
export const getByMember = (memberId) => api.get(`/transactions/member/${memberId}`).then((r) => r.data);
