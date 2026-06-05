import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { listUsers, createUser, updateUser } from "../../api/users.api";
import PageHeader from "../../components/common/PageHeader.jsx";
import SearchBar from "../../components/common/SearchBar.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import Modal from "../../components/common/Modal.jsx";
import ConfirmDialog from "../../components/common/ConfirmDialog.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import { Field, Input, Select } from "../../components/common/Input.jsx";
import { formatDate } from "../../utils/formatDate.js";

const empty = { fullName: "", email: "", password: "", role: "librarian", phone: "" };

export default function UserManagement() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const reqId = useRef(0);
  const inFlight = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async (overrides = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const myReq = ++reqId.current;
    const usePage = overrides.page ?? page;
    const useSearch = overrides.search ?? search;
    const useRole = overrides.role ?? role;
    const useStatus = overrides.status ?? status;
    if (mountedRef.current) setLoading(true);
    try {
      const params = { page: usePage, limit: 10, q: useSearch, role: useRole, status: useStatus };
      Object.keys(params).forEach((k) => params[k] === "" && delete params[k]);
      const data = await listUsers(params);
      if (myReq !== reqId.current || !mountedRef.current) return;
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      if (myReq !== reqId.current || !mountedRef.current) return;
      toast.error(err?.response?.data?.message || "Failed to load users");
    } finally {
      if (myReq === reqId.current) inFlight.current = false;
      if (myReq === reqId.current && mountedRef.current) setLoading(false);
    }
  }, [page, search, role, status]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    load({ page: 1 });
    if (isFirstRender.current) isFirstRender.current = false;
  }, [search, role, status]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const onSearch = useCallback((v) => setSearch(v), []);

  const openCreate = useCallback(() => { setEditing(null); setForm(empty); setModalOpen(true); }, []);
  const openEdit = useCallback((u) => { setEditing(u); setForm({ fullName: u.fullName, email: u.email, password: "", role: u.role, phone: u.phone || "" }); setModalOpen(true); }, []);

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const payload = { fullName: form.fullName, email: form.email, role: form.role, phone: form.phone };
        if (form.password) payload.password = form.password;
        await updateUser(editing._id, payload);
        toast.success("User updated");
      } else {
        await createUser(form);
        toast.success("User created");
      }
      setModalOpen(false);
      load({ page });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }, [editing, form, load, page]);

  const onToggleActive = useCallback(async (u) => {
    try {
      await updateUser(u._id, { isActive: !u.isActive });
      toast.success(u.isActive ? "User deactivated" : "User activated");
      load({ page });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    }
  }, [load, page]);

  const goToPage = useCallback((p) => {
    if (p < 1 || p > pages) return;
    setPage(p);
    load({ page: p });
  }, [pages, load]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Management"
        subtitle="Admin and librarian accounts."
        actions={
          <>
            <SearchBar value={search} onChange={onSearch} placeholder="Search by name, email, phone…" delay={400} />
            <Button onClick={openCreate}>+ Add User</Button>
          </>
        }
      />

      <div className="card p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All</option>
            <option value="admin">Admin</option>
            <option value="librarian">Librarian</option>
            <option value="member">Member</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>

      {loading ? <Spinner /> : (
        <Table
          columns={[
            { key: "fullName", header: "Name" },
            { key: "email", header: "Email" },
            { key: "role", header: "Role", render: (r) => <Badge tone={r.role === "admin" ? "info" : "neutral"}>{r.role}</Badge> },
            { key: "phone", header: "Phone", render: (r) => r.phone || "—" },
            { key: "isActive", header: "Status", render: (r) => <Badge tone={r.isActive ? "success" : "danger"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
            { key: "createdAt", header: "Created", render: (r) => formatDate(r.createdAt) },
            {
              key: "actions", header: "Actions", render: (r) => (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(r)} className="text-primary hover:underline text-xs">Edit</button>
                  <button onClick={() => onToggleActive(r)} className="text-status-warning hover:underline text-xs">{r.isActive ? "Deactivate" : "Activate"}</button>
                </div>
              )
            },
          ]}
          rows={items}
        />
      )}

      <div className="flex justify-between text-sm text-neutral-600">
        <span>Page {page} of {pages} ({total} total)</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => goToPage(page - 1)} disabled={page <= 1}>Prev</Button>
          <Button variant="secondary" onClick={() => goToPage(page + 1)} disabled={page >= pages}>Next</Button>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit User" : "Add New User"}>
        <form onSubmit={onSubmit}>
          <Field label="Full Name"><Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></Field>
          <Field label={editing ? "New Password (leave blank to keep)" : "Password"} hint="At least 6 characters">
            <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required={!editing} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="admin">Admin</option>
              <option value="librarian">Librarian</option>
            </Select>
          </Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Create User"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Confirm action"
        message={confirm?.message || ""}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => { const c = confirm; setConfirm(null); try { await c.action(); load({ page }); } catch (e) { toast.error(e?.response?.data?.message || "Failed"); } }}
        confirmText="Confirm"
        danger
      />
    </div>
  );
}
