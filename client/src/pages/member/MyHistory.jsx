import useMemberProfile from "../../hooks/useMemberProfile.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import { formatDate } from "../../utils/formatDate.js";
import { formatNGN } from "../../utils/formatCurrency.js";

const STATUS_TONE = { Issued: "issued", Returned: "returned", Overdue: "overdue", Lost: "danger" };

export default function MyHistory() {
  const { member, loading } = useMemberProfile();
  if (loading) return <div className="flex items-center gap-2 text-neutral-500"><Spinner /> Loading…</div>;
  if (!member) return <div className="card p-6 text-sm text-neutral-500">No member profile is linked to this account.</div>;

  return (
    <div className="space-y-4">
      <PageHeader title="My Borrowing History" subtitle="All past and current transactions on your account." />
      <Table
        columns={[
          { key: "txn", header: "TXN", render: (r) => <span className="font-mono text-xs">{r.transactionCode}</span> },
          { key: "book", header: "Book", render: (r) => r.book?.title || "—" },
          { key: "issueDate", header: "Issued", render: (r) => formatDate(r.issueDate) },
          { key: "dueDate", header: "Due", render: (r) => formatDate(r.dueDate) },
          { key: "returnDate", header: "Returned", render: (r) => formatDate(r.returnDate) },
          { key: "fine", header: "Fine", render: (r) => r.fineAmount > 0 ? <span className={r.finePaid ? "text-status-success" : "text-status-danger"}>{formatNGN(r.fineAmount)}{r.finePaid ? " ✓" : ""}</span> : "—" },
          { key: "status", header: "Status", render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
        ]}
        rows={member.transactions || []}
        empty="No transactions yet."
      />
    </div>
  );
}
