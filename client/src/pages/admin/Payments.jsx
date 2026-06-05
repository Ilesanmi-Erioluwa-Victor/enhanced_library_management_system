import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  listPayments,
  downloadReceipt,
  listPendingCashPayments,
  verifyCashPayment,
} from "../../api/payments.api";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import { formatDate } from "../../utils/formatDate.js";
import { formatNGN } from "../../utils/formatCurrency.js";

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function Payments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ status: "", gateway: "", method: "", startDate: "", endDate: "", q: "" });
  const [pending, setPending] = useState([]);
  const [verifying, setVerifying] = useState(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await listPayments({ page: p, limit: 20, ...filter });
      setItems(res.items);
      setPages(res.pages);
      setTotal(res.total);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not load payments");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  const loadPending = useCallback(async () => {
    try {
      const res = await listPendingCashPayments();
      setPending(res);
    } catch (e) {
      // staff-only — ignore silently
    }
  }, []);

  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [filter]);
  useEffect(() => { load(page); /* eslint-disable-next-line */ }, [page]);
  useEffect(() => { loadPending(); }, [loadPending]);

  const onDownload = async (p) => {
    try {
      const blob = await downloadReceipt(p._id);
      downloadBlob(blob, `receipt-${p.reference}.pdf`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not download receipt");
    }
  };

  const onVerify = async (p, decision) => {
    const notes = decision === "reject"
      ? window.prompt(`Reject ${p.reference}? Enter a reason (optional):`) || ""
      : window.prompt(`Approve ${p.reference}? Add an optional note:`) || "";
    if (decision === "reject" && notes === null) return;
    setVerifying(p._id);
    try {
      await verifyCashPayment(p._id, { decision, notes });
      toast.success(decision === "approve" ? "Payment approved — debt cleared" : "Payment rejected");
      await Promise.all([loadPending(), load(page)]);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(null);
    }
  };

  const summary = items.reduce(
    (acc, p) => {
      if (p.status === "success") {
        acc.collected += p.amount || 0;
        acc.success += 1;
      } else if (p.status === "pending") {
        acc.pending += p.amount || 0;
        acc.pendingCount += 1;
      } else if (p.status === "failed" || p.status === "cancelled") {
        acc.failed += p.amount || 0;
        acc.failedCount += 1;
      }
      acc.total += p.amount || 0;
      return acc;
    },
    { collected: 0, pending: 0, pendingCount: 0, failed: 0, failedCount: 0, success: 0, total: 0 }
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        subtitle={`${total} total payment record${total === 1 ? "" : "s"} — receipts can be downloaded per transaction`}
      />

      {pending.length > 0 && (
        <div className="card p-4 bg-amber-50 border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-status-warning">⏳ Pending Cash / Bank-Transfer Requests</h3>
            <span className="text-xs text-neutral-600">{pending.length} awaiting your verification</span>
          </div>
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p._id} className="bg-white rounded-md p-3 border border-amber-100 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium text-sm">{p.member?.firstName} {p.member?.lastName} <span className="text-neutral-500 text-xs">({p.member?.memberID})</span></div>
                  <div className="text-xs text-neutral-600">
                    Txn <strong>{p.transaction?.transactionCode}</strong> · {p.gateway === "bank_transfer" ? "Bank Transfer" : "Cash"} · {formatNGN(p.amount)}
                  </div>
                  <div className="text-xs text-neutral-500">Ref: {p.reference} · {formatDate(p.createdAt)}{p.notes ? ` · ${p.notes}` : ""}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => onVerify(p, "reject")} disabled={verifying === p._id}>
                    Reject
                  </Button>
                  <Button onClick={() => onVerify(p, "approve")} disabled={verifying === p._id}>
                    {verifying === p._id ? "..." : "Verify & Clear"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 bg-green-50 text-status-success">
          <div className="text-xs uppercase tracking-wider opacity-75">Collected (page)</div>
          <div className="text-2xl xl:text-3xl font-bold mt-2 truncate">{formatNGN(summary.collected)}</div>
          <div className="text-xs opacity-75 mt-1">{summary.success} successful</div>
        </div>
        <div className="card p-4 bg-amber-50 text-status-warning">
          <div className="text-xs uppercase tracking-wider opacity-75">Pending (page)</div>
          <div className="text-2xl xl:text-3xl font-bold mt-2 truncate">{formatNGN(summary.pending)}</div>
          <div className="text-xs opacity-75 mt-1">{summary.pendingCount} pending</div>
        </div>
        <div className="card p-4 bg-red-50 text-status-overdue">
          <div className="text-xs uppercase tracking-wider opacity-75">Failed (page)</div>
          <div className="text-2xl xl:text-3xl font-bold mt-2 truncate">{formatNGN(summary.failed)}</div>
          <div className="text-xs opacity-75 mt-1">{summary.failedCount} failed/cancelled</div>
        </div>
        <div className="card p-4 bg-primary-pale text-primary-dark">
          <div className="text-xs uppercase tracking-wider opacity-75">Total (page)</div>
          <div className="text-2xl xl:text-3xl font-bold mt-2 truncate">{formatNGN(summary.total)}</div>
        </div>
      </div>

      <div className="card p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="label">Status</label>
          <select className="input" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="label">Gateway</label>
          <select className="input" value={filter.gateway} onChange={(e) => setFilter({ ...filter, gateway: e.target.value })}>
            <option value="">All</option>
            <option value="paystack">Paystack</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
        <div>
          <label className="label">Method</label>
          <select className="input" value={filter.method} onChange={(e) => setFilter({ ...filter, method: e.target.value })}>
            <option value="">All</option>
            <option value="card">Card</option>
            <option value="transfer">Transfer</option>
            <option value="ussd">USSD</option>
            <option value="qr">QR</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })} />
        </div>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState
          title="No payments found"
          description="Try adjusting your filters or check back after members settle their fines."
          icon="🧾"
        />
      ) : (
        <Table
          columns={[
            { key: "date", header: "Date", render: (p) => formatDate(p.paidAt || p.createdAt) },
            { key: "ref", header: "Reference", render: (p) => p.reference },
            { key: "txn", header: "Transaction", render: (p) => p.transaction?.transactionCode || "—" },
            { key: "member", header: "Member", render: (p) => p.member ? `${p.member.firstName} ${p.member.lastName} (${p.member.memberID})` : "—" },
            { key: "amount", header: "Amount", render: (p) => <strong>{formatNGN(p.amount)}</strong> },
            { key: "gateway", header: "Gateway", render: (p) => <Badge tone="info">{p.gateway}</Badge> },
            { key: "method", header: "Method", render: (p) => p.method || "—" },
            { key: "channel", header: "Channel", render: (p) => p.channel || "—" },
            { key: "status", header: "Status", render: (p) => (
              <Badge tone={p.status === "success" ? "success" : p.status === "failed" ? "danger" : p.status === "cancelled" ? "warning" : "info"}>
                {p.status}
              </Badge>
            )},
            { key: "by", header: "By", render: (p) => p.initiatedBy?.fullName || "—" },
            { key: "actions", header: "Actions", render: (p) => (
              p.status === "success"
                ? <button onClick={() => onDownload(p)} className="text-primary hover:underline text-sm">Receipt</button>
                : <span className="text-neutral-400 text-xs">—</span>
            )},
          ]}
          rows={items}
        />
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary disabled:opacity-50">← Prev</button>
          <span className="text-sm text-neutral-600">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary disabled:opacity-50">Next →</button>
        </div>
      )}
    </div>
  );
}
