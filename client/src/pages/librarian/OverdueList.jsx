import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { getOverdue, getByMember } from "../../api/transactions.api";
import { exportOverduePDF } from "../../api/reports.api";
import useApi from "../../hooks/useApi.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import PayFineModal from "../../components/features/PayFineModal.jsx";
import { formatDate } from "../../utils/formatDate.js";
import { formatNGN } from "../../utils/formatCurrency.js";
import { daysOverdue } from "../../utils/calcFine.js";
import { useNavigate } from "react-router-dom";

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function OverdueList() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useApi(() => getOverdue());
  const [filterMemberType, setFilterMemberType] = useState("");
  const [showList, setShowList] = useState(true);
  const [payFor, setPayFor] = useState(null);

  useEffect(() => { /* initial load via useApi */ }, []);

  const onExport = async () => {
    try { const blob = await exportOverduePDF(); downloadBlob(blob, "overdue-report.pdf"); toast.success("Downloaded"); }
    catch (e) { toast.error(e?.response?.data?.message || "Export failed"); }
  };

  const items = (data?.items || []).filter((t) => !filterMemberType || t.member?.memberType === filterMemberType);
  const totalOverdue  = items.length;
  const totalUnpaid   = items.reduce((s, t) => s + (t.outstandingFine ?? (t.finePaid ? 0 : (t.fineAmount || 0))), 0);
  const totalCollected = items.reduce((s, t) => s + (t.finePaid ? (t.fineAmount || 0) : 0), 0);
  const totalFine     = items.reduce((s, t) => s + (t.fineAmount || 0), 0);
  const avgDays       = totalOverdue === 0 ? 0 : Math.round(items.reduce((s, t) => s + Math.max(0, daysOverdue(t.dueDate)), 0) / totalOverdue);
  const oldestDays    = items.reduce((m, t) => Math.max(m, daysOverdue(t.dueDate)), 0);
  const byType = ["Student", "Staff", "External"].map((mt) => ({
    type: mt, count: items.filter((t) => t.member?.memberType === mt).length,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Overdue Books"
        subtitle={showList
          ? `${items.length} overdue transaction${items.length === 1 ? "" : "s"} — auto-updated on each load.`
          : "Summary view — toggle the switch below to bring back the transaction list."}
        actions={
          <>
            <Button variant="secondary" onClick={onExport}>📄 Export PDF</Button>
          </>
        }
      />

      <div className="card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-neutral-700">Transaction List</span>
          <button
            type="button"
            role="switch"
            aria-checked={showList}
            onClick={() => setShowList((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-light ${
              showList ? "bg-primary" : "bg-neutral-300"
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                showList ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-xs text-neutral-500">
            {showList ? "ON — list visible" : "OFF — summary only"}
          </span>
        </div>
        {showList && (
          <div className="flex items-end gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-48">
              <label className="label">Filter by type</label>
              <select value={filterMemberType} onChange={(e) => setFilterMemberType(e.target.value)} className="input">
                <option value="">All</option><option>Student</option><option>Staff</option><option>External</option>
              </select>
            </div>
            <Button variant="secondary" onClick={refetch}>Refresh</Button>
          </div>
        )}
      </div>

      {loading ? <Spinner /> : showList ? (
        <Table
          columns={[
            { key: "member", header: "Member", render: (r) => r.member ? `${r.member.firstName} ${r.member.lastName}` : "—" },
            { key: "memberID", header: "ID", render: (r) => r.member?.memberID || "—" },
            { key: "type", header: "Type", render: (r) => r.member ? <Badge tone="info">{r.member.memberType}</Badge> : "—" },
            { key: "book", header: "Book", render: (r) => r.book?.title || "—" },
            { key: "accession", header: "Acc. No", render: (r) => r.book?.accessionNumber || "—" },
            { key: "issueDate", header: "Issued", render: (r) => formatDate(r.issueDate) },
            { key: "dueDate", header: "Due", render: (r) => formatDate(r.dueDate) },
            { key: "daysOverdue", header: "Days", render: (r) => <span className="text-status-danger font-medium">{daysOverdue(r.dueDate)}</span> },
            { key: "fine", header: "Fine", render: (r) => <span className={r.finePaid ? "text-status-success" : "text-status-danger font-medium"}>{formatNGN(r.outstandingFine ?? r.fineAmount)} {r.finePaid ? "✓" : ""}</span> },
            { key: "actions", header: "Actions", render: (r) => (
              <div className="flex flex-wrap gap-1">
                <Button variant="secondary" onClick={() => navigate("/transactions/return", { state: { transactionCode: r.transactionCode } })}>Process Return</Button>
                {(r.outstandingFine ?? r.fineAmount ?? 0) > 0 && (
                  <Button onClick={() => setPayFor(r)}>Pay Fine</Button>
                )}
              </div>
            )},
          ]}
          rows={items}
          empty="No overdue transactions. 🎉"
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Total Overdue"  value={totalOverdue}                                tone="bg-red-100 text-status-overdue" />
            <SummaryCard label="Unpaid Fines"    value={formatNGN(totalUnpaid)}                      tone="bg-amber-100 text-status-warning" />
            <SummaryCard label="Collected Fines" value={formatNGN(totalCollected)}                   tone="bg-green-100 text-status-success" />
            <SummaryCard label="Total Fines"     value={formatNGN(totalFine)}                       tone="bg-primary-pale text-primary-dark" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard label="Avg days overdue" value={`${avgDays} day${avgDays === 1 ? "" : "s"}`} tone="bg-cyan-100 text-status-issued" />
            <SummaryCard label="Oldest overdue"   value={`${oldestDays} day${oldestDays === 1 ? "" : "s"}`} tone="bg-red-100 text-status-overdue" />
            <SummaryCard label="Borrowers affected" value={new Set(items.map((t) => String(t.member?._id))).size} tone="bg-accent-light text-accent-dark" />
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-primary-dark mb-3">Breakdown by member type</h3>
            <div className="space-y-2">
              {byType.map((b) => (
                <div key={b.type} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-neutral-700">{b.type}</div>
                  <div className="flex-1 h-3 bg-neutral-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-status-danger"
                      style={{ width: `${totalOverdue === 0 ? 0 : (b.count / totalOverdue) * 100}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm font-medium text-neutral-700">{b.count}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowList(true)}>Show Transaction List →</Button>
          </div>
        </div>
      )}

      {payFor && (
        <PayFineModal
          open={!!payFor}
          onClose={() => setPayFor(null)}
          transaction={payFor}
          onPaid={() => { setPayFor(null); refetch(); }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  return (
    <div className={`card p-4 ${tone}`}>
      <div className="text-xs uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-2xl xl:text-3xl font-bold mt-2 truncate">{value}</div>
    </div>
  );
}
