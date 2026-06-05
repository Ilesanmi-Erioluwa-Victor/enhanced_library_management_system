import { useState, useCallback, useEffect } from "react";
import { listAudit } from "../../api/audit.api";
import usePaginatedList from "../../hooks/usePaginatedList.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import SearchBar from "../../components/common/SearchBar.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import Button from "../../components/common/Button.jsx";
import { Field, Input, Select } from "../../components/common/Input.jsx";
import { formatDateTime } from "../../utils/formatDate.js";

export default function AuditLogs() {
  const [filter, setFilter] = useState({ q: "", action: "", startDate: "", endDate: "" });
  const fetcher = useCallback((p) => listAudit({ ...p, q: filter.q, action: filter.action, startDate: filter.startDate, endDate: filter.endDate }), [filter]);
  const { items, pages, page, loading, goToPage, setQuery: applyQuery } = usePaginatedList(fetcher, {});

  useEffect(() => { applyQuery(filter); }, [filter.q, filter.action, filter.startDate, filter.endDate]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Logs"
        subtitle="Every significant action recorded with user, target, IP, and timestamp."
        actions={
          <SearchBar value={filter.q} onChange={(v) => setFilter((f) => ({ ...f, q: v }))} placeholder="Search action, target, details…" delay={400} />
        }
      />

      <div className="card p-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
        <Field label="Action">
          <Select value={filter.action} onChange={(e) => setFilter({ ...filter, action: e.target.value })}>
            <option value="">All actions</option>
            <option>book.create</option><option>book.update</option><option>book.deactivate</option><option>book.uploadCover</option>
            <option>member.create</option><option>member.update</option><option>member.deactivate</option>
            <option>transaction.issue</option><option>transaction.return</option><option>transaction.renew</option><option>transaction.markLost</option>
            <option>category.create</option><option>category.update</option><option>category.delete</option>
            <option>user.create</option><option>user.update</option><option>user.deactivate</option>
            <option>department.create</option><option>department.update</option><option>department.delete</option>
            <option>settings.update</option>
          </Select>
        </Field>
        <Field label="From"><Input type="date" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })} /></Field>
        <Field label="To"><Input type="date" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })} /></Field>
        <Button variant="secondary" onClick={() => setFilter({ q: "", action: "", startDate: "", endDate: "" })}>Clear</Button>
      </div>

      {loading ? <Spinner /> : (
        <Table
          columns={[
            { key: "timestamp", header: "Time", render: (r) => formatDateTime(r.timestamp) },
            { key: "performedBy", header: "User", render: (r) => r.performedBy ? `${r.performedBy.fullName} (${r.performedBy.role})` : "—" },
            { key: "action", header: "Action", render: (r) => <Badge tone="info">{r.action}</Badge> },
            { key: "target", header: "Target", render: (r) => r.targetModel ? `${r.targetModel} • ${String(r.targetId).slice(-6)}` : "—" },
            { key: "details", header: "Details" },
            { key: "ipAddress", header: "IP" },
          ]}
          rows={items}
        />
      )}

      <div className="flex justify-between text-sm text-neutral-600">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => goToPage(page - 1)} disabled={page <= 1}>Prev</Button>
          <Button variant="secondary" onClick={() => goToPage(page + 1)} disabled={page >= pages}>Next</Button>
        </div>
      </div>
    </div>
  );
}
