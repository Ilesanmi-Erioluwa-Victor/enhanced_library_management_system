import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getSettings, updateSettings } from "../../api/settings.api";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../../api/categories.api";
import { listDepartments, createDepartment, updateDepartment, deleteDepartment } from "../../api/departments.api";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Modal from "../../components/common/Modal.jsx";
import ConfirmDialog from "../../components/common/ConfirmDialog.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import Badge from "../../components/common/Badge.jsx";
import { Field, Input, Textarea } from "../../components/common/Input.jsx";
import { useSettings } from "../../context/SettingsContext.jsx";

export default function Settings() {
  const { refresh } = useSettings();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [cats, setCats] = useState([]);
  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [confirmDel, setConfirmDel] = useState(null);

  const [depts, setDepts] = useState([]);
  const [deptModal, setDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: "", code: "", description: "" });
  const [confirmDelDept, setConfirmDelDept] = useState(null);

  const loadCats = () => listCategories().then(setCats).catch(() => {});
  const loadDepts = () => listDepartments().then(setDepts).catch(() => {});

  useEffect(() => {
    getSettings()
      .then((s) => setForm({
        libraryName: s.libraryName || "",
        libraryAddress: s.libraryAddress || "",
        libraryPhone: s.libraryPhone || "",
        defaultLoanDays: s.defaultLoanDays || 14,
        fineRatePerDay: s.fineRatePerDay || 50,
        maxBooksPerMember: s.maxBooksPerMember || 3,
        maxRenewals: s.maxRenewals || 2,
        membershipValidityMonths: s.membershipValidityMonths || 12,
        overdueEmailEnabled: !!s.overdueEmailEnabled,
      }))
      .finally(() => setLoading(false));
    loadCats();
    loadDepts();
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        ...form,
        defaultLoanDays: Number(form.defaultLoanDays),
        fineRatePerDay: Number(form.fineRatePerDay),
        maxBooksPerMember: Number(form.maxBooksPerMember),
        maxRenewals: Number(form.maxRenewals),
        membershipValidityMonths: Number(form.membershipValidityMonths),
      });
      toast.success("Settings saved");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openCat = (cat) => { setEditingCat(cat || null); setCatForm({ name: cat?.name || "", description: cat?.description || "" }); setCatModal(true); };
  const saveCat = async (e) => {
    e.preventDefault();
    try {
      if (editingCat) { await updateCategory(editingCat._id, catForm); toast.success("Category updated"); }
      else            { await createCategory(catForm); toast.success("Category created"); }
      setCatModal(false); loadCats();
    } catch (err) { toast.error(err?.response?.data?.message || "Failed"); }
  };
  const onDeleteCat = async (cat) => {
    try { await deleteCategory(cat._id); toast.success("Category deleted"); loadCats(); }
    catch (err) { toast.error(err?.response?.data?.message || "Failed"); }
    setConfirmDel(null);
  };

  const openDept = (d) => {
    setEditingDept(d || null);
    setDeptForm({ name: d?.name || "", code: d?.code || "", description: d?.description || "" });
    setDeptModal(true);
  };
  const saveDept = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) { await updateDepartment(editingDept._id, deptForm); toast.success("Department updated"); }
      else             { await createDepartment(deptForm); toast.success("Department created"); }
      setDeptModal(false); loadDepts();
    } catch (err) { toast.error(err?.response?.data?.message || "Failed"); }
  };
  const onDeleteDept = async (d) => {
    try { await deleteDepartment(d._id); toast.success("Department deleted"); loadDepts(); }
    catch (err) { toast.error(err?.response?.data?.message || "Failed"); }
    setConfirmDelDept(null);
  };

  if (loading || !form) return <div className="flex items-center gap-2 text-neutral-500"><Spinner /> Loading settings…</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Library configuration used across the app and reports." />

      <form onSubmit={onSave} className="card p-5 space-y-4">
        <h3 className="font-semibold text-primary-dark">Library identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Library name"><Input value={form.libraryName} onChange={(e) => setForm({ ...form, libraryName: e.target.value })} /></Field>
          <Field label="Library phone"><Input value={form.libraryPhone} onChange={(e) => setForm({ ...form, libraryPhone: e.target.value })} /></Field>
        </div>
        <Field label="Library address"><Textarea rows={2} value={form.libraryAddress} onChange={(e) => setForm({ ...form, libraryAddress: e.target.value })} /></Field>

        <h3 className="font-semibold text-primary-dark pt-2">Lending rules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Field label="Loan period (days)"><Input type="number" min="1" value={form.defaultLoanDays} onChange={(e) => setForm({ ...form, defaultLoanDays: e.target.value })} /></Field>
          <Field label="Fine rate / day (NGN)"><Input type="number" min="0" value={form.fineRatePerDay} onChange={(e) => setForm({ ...form, fineRatePerDay: e.target.value })} /></Field>
          <Field label="Max books per member"><Input type="number" min="1" value={form.maxBooksPerMember} onChange={(e) => setForm({ ...form, maxBooksPerMember: e.target.value })} /></Field>
          <Field label="Max renewals"><Input type="number" min="0" value={form.maxRenewals} onChange={(e) => setForm({ ...form, maxRenewals: e.target.value })} /></Field>
          <Field label="Membership validity (months)"><Input type="number" min="1" value={form.membershipValidityMonths} onChange={(e) => setForm({ ...form, membershipValidityMonths: e.target.value })} /></Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={form.overdueEmailEnabled} onChange={(e) => setForm({ ...form, overdueEmailEnabled: e.target.checked })} />
          Send overdue reminder emails to members
        </label>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
        </div>
      </form>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-primary-dark">Departments</h3>
          <Button onClick={() => openDept(null)}>+ Add Department</Button>
        </div>
        <p className="text-xs text-neutral-500 mb-2">Departments members can be assigned to. Members pick from this list during registration.</p>
        <div className="divide-y divide-neutral-100">
          {depts.length === 0 && <p className="text-sm text-neutral-500 py-2">No departments yet — add one to make it selectable in the member form.</p>}
          {depts.map((d) => (
            <div key={d._id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-neutral-800 truncate">{d.name}</div>
                  {d.code && <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary-pale text-primary-dark">{d.code}</span>}
                  {!d.isActive && <Badge tone="danger">Inactive</Badge>}
                </div>
                {d.description && <div className="text-xs text-neutral-500 truncate">{d.description}</div>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openDept(d)} className="text-primary text-xs hover:underline">Edit</button>
                <button onClick={() => setConfirmDelDept(d)} className="text-status-danger text-xs hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-primary-dark">Categories</h3>
          <Button onClick={() => openCat(null)}>+ Add Category</Button>
        </div>
        <div className="divide-y divide-neutral-100">
          {cats.length === 0 && <p className="text-sm text-neutral-500 py-2">No categories yet.</p>}
          {cats.map((c) => (
            <div key={c._id} className="py-2 flex items-center justify-between">
              <div>
                <div className="font-medium text-neutral-800">{c.name}</div>
                {c.description && <div className="text-xs text-neutral-500">{c.description}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openCat(c)} className="text-primary text-xs hover:underline">Edit</button>
                <button onClick={() => setConfirmDel(c)} className="text-status-danger text-xs hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={deptModal} onClose={() => setDeptModal(false)} title={editingDept ? "Edit Department" : "Add Department"}>
        <form onSubmit={saveDept}>
          <Field label="Name" hint="e.g. Computer Science"><Input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} required autoFocus /></Field>
          <Field label="Code" hint="Short identifier, e.g. CSC"><Input value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} maxLength={10} /></Field>
          <Field label="Description"><Textarea rows={2} value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" type="button" onClick={() => setDeptModal(false)}>Cancel</Button>
            <Button type="submit">{editingDept ? "Save Changes" : "Create Department"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={catModal} onClose={() => setCatModal(false)} title={editingCat ? "Edit Category" : "Add Category"}>
        <form onSubmit={saveCat}>
          <Field label="Name"><Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required autoFocus /></Field>
          <Field label="Description"><Textarea rows={2} value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" type="button" onClick={() => setCatModal(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelDept}
        title="Delete department"
        message={`Permanently delete "${confirmDelDept?.name}"? Members assigned to it will block deletion.`}
        onCancel={() => setConfirmDelDept(null)}
        onConfirm={() => onDeleteDept(confirmDelDept)}
        confirmText="Delete"
        danger
      />

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete category"
        message={`Permanently delete "${confirmDel?.name}"? Books assigned to this category will block deletion.`}
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => onDeleteCat(confirmDel)}
        confirmText="Delete"
        danger
      />
    </div>
  );
}
