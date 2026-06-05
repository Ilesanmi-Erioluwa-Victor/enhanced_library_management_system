import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { listMembers, deactivateMember } from "../../api/members.api";
import { listActiveDepartments } from "../../api/departments.api";
import usePaginatedList from "../../hooks/usePaginatedList.js";
import { useAuth } from "../../hooks/useAuth";
import PageHeader from "../../components/common/PageHeader.jsx";
import SearchBar from "../../components/common/SearchBar.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import ConfirmDialog from "../../components/common/ConfirmDialog.jsx";
import { Field, Select } from "../../components/common/Input.jsx";
import toast from "react-hot-toast";
import { formatDate } from "../../utils/formatDate.js";

export default function MemberList() {
  const { role } = useAuth();
  const [filter, setFilter] = useState({ q: "", memberType: "", department: "", status: "" });
  const [depts, setDepts] = useState([]);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { listActiveDepartments().then(setDepts).catch(() => {}); }, []);

  const fetcher = useCallback(
    (p) => listMembers({ ...p, q: filter.q, memberType: filter.memberType, department: filter.department, status: filter.status }),
    [filter]
  );
  const { items, total, pages, page, loading, goToPage, refresh } = usePaginatedList(fetcher, {});
  useEffect(() => { refresh(); }, [filter.q, filter.memberType, filter.department, filter.status]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Members"
        subtitle={`${total} member${total === 1 ? "" : "s"}`}
        actions={<Link to="/members/new"><Button>+ Register New Member</Button></Link>}
      />

      <div className="card p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SearchBar value={filter.q} onChange={(v) => setFilter((f) => ({ ...f, q: v }))} placeholder="Search name, ID, phone, email…" delay={400} />
        <Field label="Type">
          <Select value={filter.memberType} onChange={(e) => setFilter({ ...filter, memberType: e.target.value })}>
            <option value="">All types</option><option>Student</option><option>Staff</option><option>External</option>
          </Select>
        </Field>
        <Field label="Department">
          <Select value={filter.department} onChange={(e) => setFilter({ ...filter, department: e.target.value })}>
            <option value="">All departments</option>
            {depts.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>

      {loading ? <Spinner /> : (
        <Table
          columns={[
            { key: "memberID", header: "Member ID" },
            { key: "name", header: "Name", render: (r) => `${r.firstName} ${r.lastName}` },
            { key: "memberType", header: "Type", render: (r) => <Badge tone="info">{r.memberType}</Badge> },
            { key: "department", header: "Dept", render: (r) => r.department || "—" },
            { key: "phone", header: "Phone" },
            { key: "booksBorrowed", header: "Borrowed" },
            { key: "membershipEnd", header: "Expires", render: (r) => {
              const exp = r.membershipEnd ? new Date(r.membershipEnd) : null;
              const expired = exp && exp < new Date();
              return <span className={expired ? "text-status-danger font-medium" : ""}>{formatDate(r.membershipEnd)}</span>;
            }},
            { key: "isActive", header: "Status", render: (r) => <Badge tone={r.isActive ? "success" : "danger"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
            {
              key: "actions", header: "Actions", render: (r) => (
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link to={`/members/${r._id}/edit`} className="text-primary hover:underline">Edit</Link>
                  <Link to={`/transactions/issue?memberId=${r._id}`} className="text-status-issued hover:underline">Issue</Link>
                  {role === "admin" && r.isActive && (
                    <button onClick={() => setConfirm(r)} className="text-status-warning hover:underline">Deactivate</button>
                  )}
                </div>
              )
            },
          ]}
          rows={items}
          empty="No members match these filters."
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
        title="Deactivate member"
        message={`Deactivate ${confirm?.firstName} ${confirm?.lastName}? They won't be able to borrow new books.`}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          try { await deactivateMember(confirm._id); toast.success("Member deactivated"); refresh(); }
          catch (e) { toast.error(e?.response?.data?.message || "Failed"); }
          setConfirm(null);
        }}
        confirmText="Deactivate"
        danger
      />
    </div>
  );
}
