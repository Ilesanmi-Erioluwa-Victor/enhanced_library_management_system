import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { listTransactions, renewTransaction, markLost } from "../../api/transactions.api";
import usePaginatedList from "../../hooks/usePaginatedList.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import SearchBar from "../../components/common/SearchBar.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import ConfirmDialog from "../../components/common/ConfirmDialog.jsx";
import { Field, Input, Select } from "../../components/common/Input.jsx";
import { formatDate } from "../../utils/formatDate.js";
import { formatNGN } from "../../utils/formatCurrency.js";

const STATUS_TONE = { Issued: "issued", Returned: "returned", Overdue: "overdue", Lost: "danger" };

export default function Transactions() {
  const [filter, setFilter] = useState({ q: "", status: "", startDate: "", endDate: "" });
  const [confirm, setConfirm] = useState(null);
  const fetcher = useCallback((p) => listTransactions({ ...p, q: filter.q, status: filter.status, startDate: filter.startDate, endDate: filter.endDate }), [filter]);
  const { items, total, pages, page, loading, goToPage, refresh } = usePaginatedList(fetcher, {});
  useEffect(() => { refresh(); }, [filter.q, filter.status, filter.startDate, filter.endDate]);

  const onRenew = async (txn) => {
    try { await renewTransaction(txn._id); toast.success("Renewed"); refresh(); }
    catch (e) { toast.error(e?.response?.data?.message || "Renew failed"); }
  };
  const onMarkLost = async (txn) => {
    try { await markLost(txn._id); toast.success("Marked as lost"); refresh(); }
    catch (e) { toast.error(e?.response?.data?.message || "Failed"); }
    setConfirm(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="All Transactions"
        subtitle={`${total} transaction${total === 1 ? "" : "s"}`}
        actions={<SearchBar value={filter.q} onChange={(v) => setFilter((f) => ({ ...f, q: v }))} placeholder="Search TXN, notes…" delay={400} />}
      />

      <div className="card p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Field label="Status">
          <Select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All</option><option>Issued</option><option>Returned</option><option>Overdue</option><option>Lost</option>
          </Select>
        </Field>
        <Field label="From"><Input type="date" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })} /></Field>
        <Field label="To"><Input type="date" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })} /></Field>
        <div className="flex items-end">
          <Button variant="secondary" onClick={() => setFilter({ q: "", status: "", startDate: "", endDate: "" })}>Clear Filters</Button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <Table
          columns={[
            { key: "transactionCode", header: "TXN", render: (r) => <span className="font-mono text-xs">{r.transactionCode}</span> },
            { key: "book", header: "Book", render: (r) => r.book?.title || "—" },
            { key: "member", header: "Member", render: (r) => r.member ? `${r.member.firstName} ${r.member.lastName}` : "—" },
            { key: "issueDate", header: "Issued", render: (r) => formatDate(r.issueDate) },
            { key: "dueDate", header: "Due", render: (r) => formatDate(r.dueDate) },
            { key: "returnDate", header: "Returned", render: (r) => formatDate(r.returnDate) },
            { key: "fine", header: "Fine", render: (r) => r.fineAmount > 0 ? <span className={r.finePaid ? "text-status-success" : "text-status-danger"}>{formatNGN(r.fineAmount)}{r.finePaid ? " ✓" : ""}</span> : "—" },
            { key: "status", header: "Status", render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
            {
              key: "actions", header: "Actions", render: (r) => (
                <div className="flex flex-wrap gap-2 text-xs">
                  {r.status === "Issued" && (
                    <>
                      <button onClick={() => onRenew(r)} className="text-primary hover:underline">Renew</button>
                      <button onClick={() => setConfirm(r)} className="text-status-danger hover:underline">Mark Lost</button>
                    </>
                  )}
                </div>
              )
            },
          ]}
          rows={items}
          empty="No transactions match these filters."
        />
      )}

      <div className="flex justify-between text-sm text-neutral-600">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => goToPage(page - 1)} disabled={page <= 1}>Prev</Button>
          <Button variant="secondary" onClick={() => goToPage(page + 1)} disabled={page >= pages}>Next</Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title="Mark as Lost"
        message={`Mark transaction ${confirm?.transactionCode} as Lost? The book copy will NOT be returned to inventory.`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => onMarkLost(confirm)}
        confirmText="Mark Lost"
        danger
      />
    </div>
  );
}
