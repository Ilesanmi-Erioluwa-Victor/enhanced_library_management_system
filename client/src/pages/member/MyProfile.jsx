import { useState } from "react";
import toast from "react-hot-toast";
import useMemberProfile from "../../hooks/useMemberProfile.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Badge from "../../components/common/Badge.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import { Field, Input } from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import { formatDate } from "../../utils/formatDate.js";
import api from "../../api/axios.js";
import { useAuth } from "../../hooks/useAuth.js";

export default function MyProfile() {
  const { member, loading, reload, setMember } = useMemberProfile();
  const { logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  if (loading) return <div className="flex items-center gap-2 text-neutral-500"><Spinner /> Loading…</div>;
  if (!member) return <div className="card p-6 text-sm text-neutral-500">No member profile is linked to this account.</div>;

  const startEdit = () => { setForm({ firstName: member.firstName, lastName: member.lastName, phone: member.phone || "" }); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put(`/members/${member._id}`, form).then((r) => r.data);
      setMember((m) => ({ ...m, ...updated }));
      toast.success("Profile updated");
      setEditing(false); reload();
    } catch (err) { toast.error(err?.response?.data?.message || "Update failed"); }
    finally { setSaving(false); }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    if (pw.next.length < 6) return toast.error("New password must be at least 6 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords do not match");
    setPwSaving(true);
    try {
      await api.put("/users/me/password", { currentPassword: pw.current, newPassword: pw.next });
      toast.success("Password updated");
      setPw({ current: "", next: "", confirm: "" });
    } catch (err) { toast.error(err?.response?.data?.message || "Password change failed"); }
    finally { setPwSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title="My Profile" subtitle="Your personal info and membership details." />

      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-primary-pale text-primary-dark flex items-center justify-center text-2xl font-bold">
            {member.firstName[0]}{member.lastName[0]}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary-dark">{member.firstName} {member.lastName}</h2>
            <p className="text-sm text-neutral-500">{member.memberID}</p>
            <div className="flex gap-2 mt-1">
              <Badge tone="info">{member.memberType}</Badge>
              <Badge tone={member.isActive ? "success" : "danger"}>{member.isActive ? "Active" : "Inactive"}</Badge>
            </div>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-neutral-500">Phone</dt><dd>{member.phone}</dd>
          <dt className="text-neutral-500">Email</dt><dd>{member.email || "—"}</dd>
          <dt className="text-neutral-500">Department</dt><dd>{member.department || "—"}</dd>
          <dt className="text-neutral-500">Max Books</dt><dd>{member.maxBooksAllowed}</dd>
          <dt className="text-neutral-500">Membership</dt><dd>{formatDate(member.membershipStart)} → {formatDate(member.membershipEnd)}</dd>
        </dl>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-primary-dark mb-2">Edit personal info</h3>
        {!editing ? (
          <Button variant="secondary" onClick={startEdit}>Edit</Button>
        ) : (
          <form onSubmit={onSave} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="First Name"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></Field>
              <Field label="Last Name"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={cancelEdit}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-primary-dark mb-2">Change password</h3>
        <form onSubmit={onChangePassword} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Current password"><Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></Field>
            <Field label="New password"><Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></Field>
            <Field label="Confirm"><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pwSaving}>{pwSaving ? "Updating..." : "Update password"}</Button>
          </div>
        </form>
      </div>

      <div className="text-right">
        <Button variant="secondary" onClick={logout}>Sign out</Button>
      </div>
    </div>
  );
}
