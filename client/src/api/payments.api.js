import api from "./axios";

export const initiatePayment = (payload) => api.post("/payments/initiate", payload).then((r) => r.data);
export const verifyPayment = (reference) => api.get(`/payments/verify/${reference}`).then((r) => r.data);
export const confirmInlinePayment = (reference, payload) => api.post(`/payments/confirm/${reference}`, payload || {}).then((r) => r.data);
export const requestCashPayment = (payload) => api.post("/payments/cash/request", payload).then((r) => r.data);
export const verifyCashPayment = (id, payload) => api.post(`/payments/cash/verify/${id}`, payload).then((r) => r.data);

export const listPayments = (params) => api.get("/payments", { params }).then((r) => r.data);
export const listPendingCashPayments = () => api.get("/payments/pending").then((r) => r.data);
export const getPayment = (id) => api.get(`/payments/${id}`).then((r) => r.data);
export const getMyPayments = (memberId) => api.get(`/payments/member/${memberId}`).then((r) => r.data);

export const downloadReceipt = async (id) => {
  const res = await api.get(`/payments/receipt/${id}`, { responseType: "blob" });
  return res.data;
};

export const getOutstandingFines = (memberId) => api.get(`/members/${memberId}/outstanding`).then((r) => r.data);
