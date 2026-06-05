import api from "./axios";

async function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

const reportsApi = {
  getDashboard: () => api.get("/reports/dashboard").then((r) => r.data),
  getSummary: () => api.get("/reports/summary").then((r) => r.data),
  getBooksByCategory: () => api.get("/reports/books-by-category").then((r) => r.data),
  getTopBorrowed: () => api.get("/reports/top-borrowed").then((r) => r.data),
  getMemberActivity: () => api.get("/reports/member-activity").then((r) => r.data),
  getOverdueSummary: () => api.get("/reports/overdue-summary").then((r) => r.data),
  getMonthlyIssues: () => api.get("/reports/monthly-issues").then((r) => r.data),

  exportBooksPDF: async () => {
    const r = await api.get("/reports/export/books", { responseType: "blob" });
    await downloadBlob(r.data, "book-catalogue.pdf");
    return r.data;
  },
  exportMembersPDF: async () => {
    const r = await api.get("/reports/export/members", { responseType: "blob" });
    await downloadBlob(r.data, "member-list.pdf");
    return r.data;
  },
  exportOverduePDF: async () => {
    const r = await api.get("/reports/export/overdue", { responseType: "blob" });
    await downloadBlob(r.data, "overdue-report.pdf");
    return r.data;
  },
  exportTransactionsPDF: async ({ startDate, endDate } = {}) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const r = await api.get("/reports/export/transactions", { params, responseType: "blob" });
    await downloadBlob(r.data, "transaction-history.pdf");
    return r.data;
  },
};

export const getDashboard = reportsApi.getDashboard;
export const getSummary = reportsApi.getSummary;
export const getBooksByCategory = reportsApi.getBooksByCategory;
export const getTopBorrowed = reportsApi.getTopBorrowed;
export const getMemberActivity = reportsApi.getMemberActivity;
export const getOverdueSummary = reportsApi.getOverdueSummary;
export const getMonthlyIssues = reportsApi.getMonthlyIssues;
export const exportBooksPDF = reportsApi.exportBooksPDF;
export const exportMembersPDF = reportsApi.exportMembersPDF;
export const exportOverduePDF = reportsApi.exportOverduePDF;
export const exportTransactionsPDF = reportsApi.exportTransactionsPDF;

export { reportsApi };
export default reportsApi;
