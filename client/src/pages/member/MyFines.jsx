import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import useMemberProfile from "../../hooks/useMemberProfile.js";
import { getMyPayments, getOutstandingFines, downloadReceipt } from "../../api/payments.api";
import { useAuthContext } from "../../context/AuthContext.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import Button from "../../components/common/Button.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import PayFineModal from "../../components/features/PayFineModal.jsx";
import { formatNGN } from "../../utils/formatCurrency.js";
import { formatDate } from "../../utils/formatDate.js";
import { daysOverdue } from "../../utils/calcFine.js";

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function MyFines() {
  const { user } = useAuthContext();
  const { member, loading: profileLoading } = useMemberProfile();
  const [outstanding, setOutstanding] = useState({ transactions: [], outstandingFine: 0, unpaidCount: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payFor, setPayFor] = useState(null);

  const reload = async () => {
    if (!member?._id) return;
    setLoading(true);
    try {
      const [out, hist] = await Promise.all([
        getOutstandingFines(member._id).catch(() => ({ transactions: [], outstandingFine: 0, unpaidCount: 0 })),
        getMyPayments(member._id).catch(() => []),
      ]);
      setOutstanding(out);
      setHistory(hist);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (member?._id) reload(); // eslint-disable-next-line
  }, [member?._id]);

  const onPaid = async () => {
    await reload();
    toast.success("Fine payment recorded");
  };

  const onDownloadReceipt = async (p) => {
    try {
      const blob = await downloadReceipt(p._id);
      downloadBlob(blob, `receipt-${p.reference}.pdf`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not download receipt");
    }
  };

  if (profileLoading || loading) {
    return <div className="flex items-center gap-2 text-neutral-500"><Spinner /> Loading your fines…</div>;
  }
  if (!member) {
    return <div className="card p-6 text-sm text-neutral-500">No member profile is linked to this account. Contact the librarian.</div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Fines & Payments"
        subtitle={`Member ${member.memberID} — ${member.firstName} ${member.lastName}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 bg-red-50 text-status-overdue">
          <div className="text-xs uppercase tracking-wider opacity-75">Outstanding</div>
          <div className="text-2xl xl:text-3xl font-bold mt-2 truncate">{formatNGN(outstanding.outstandingFine)}</div>
        </div>
        <div className="card p-4 bg-amber-50 text-status-warning">
          <div className="text-xs uppercase tracking-wider opacity-75">Unpaid transactions</div>
          <div className="text-2xl xl:text-3xl font-bold mt-2 truncate">{outstanding.unpaidCount}</div>
        </div>
        <div className="card p-4 bg-green-50 text-status-success">
          <div className="text-xs uppercase tracking-wider opacity-75">Total payments made</div>
          <div className="text-2xl xl:text-3xl font-bold mt-2 truncate">
            {formatNGN(history.filter((p) => p.status === "success").reduce((s, p) => s + (p.amount || 0), 0))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-primary-dark mb-2">Unpaid fines</h3>
        {outstanding.transactions.length === 0 ? (
          <EmptyState
            title="No outstanding fines"
            description="You are all caught up. Returned books on time and any previous fines have been settled."
            icon="🎉"
          />
        ) : (
          <Table
            columns={[
              { key: "txn", header: "Transaction", render: (r) => r.transactionCode },
              { key: "book", header: "Book", render: (r) => r.book?.title || "—" },
              { key: "acc", header: "Acc. No", render: (r) => r.book?.accessionNumber || "—" },
              { key: "due", header: "Due", render: (r) => formatDate(r.dueDate) },
              { key: "days", header: "Days overdue", render: (r) => <span className="text-status-danger font-medium">{daysOverdue(r.dueDate)}</span> },
              { key: "fine", header: "Fine", render: (r) => formatNGN(r.fineAmount) },
              { key: "out", header: "Outstanding", render: (r) => <strong className="text-status-danger">{formatNGN(r.outstandingFine)}</strong> },
              { key: "actions", header: "Action", render: (r) => (
                <Button onClick={() => setPayFor({ ...r, member, _id: r._id })}>Pay Now</Button>
              )},
            ]}
            rows={outstanding.transactions}
          />
        )}
      </div>

      <div>
        <h3 className="font-semibold text-primary-dark mb-2">Payment history</h3>
        {history.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Once you pay a fine, the receipt will appear here."
            icon="🧾"
          />
        ) : (
          <Table
            columns={[
              { key: "date", header: "Date", render: (p) => formatDate(p.paidAt || p.createdAt) },
              { key: "ref", header: "Reference", render: (p) => p.reference },
              { key: "txn", header: "Transaction", render: (p) => p.transaction?.transactionCode || "—" },
              { key: "amount", header: "Amount", render: (p) => formatNGN(p.amount) },
              { key: "method", header: "Method", render: (p) => p.method || "—" },
              { key: "gateway", header: "Gateway", render: (p) => p.gateway },
              { key: "status", header: "Status", render: (p) => (
                <Badge tone={p.status === "success" ? "success" : p.status === "failed" ? "danger" : p.status === "cancelled" ? "warning" : "info"}>
                  {p.status}
                </Badge>
              )},
              { key: "actions", header: "Actions", render: (p) => {
                if (p.status === "success") return <Button variant="secondary" onClick={() => onDownloadReceipt(p)}>Receipt</Button>;
                if (p.status === "pending") return <span className="text-xs text-amber-700">⏳ Awaiting verification</span>;
                return <span className="text-neutral-400 text-xs">—</span>;
              }},
            ]}
            rows={history}
          />
        )}
      </div>

      {payFor && (
        <PayFineModal
          open={!!payFor}
          onClose={() => setPayFor(null)}
          transaction={payFor}
          onPaid={onPaid}
        />
      )}
    </div>
  );
}
