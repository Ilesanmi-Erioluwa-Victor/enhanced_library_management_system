import { useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader.jsx";
import Badge from "../../components/common/Badge.jsx";
import { Field, Input } from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import api from "../../api/axios.js";
import { useAuth } from "../../hooks/useAuth.js";

const ROLE_TONE = {
  admin: "danger",
  librarian: "info",
  member: "success",
};

export default function StaffProfile() {
  const { user, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  if (!user) return null;

  const initials = (user.fullName || user.email || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  const startEdit = () => {
    setForm({ fullName: user.fullName || "", phone: user.phone || "" });
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);

  const onSave = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return toast.error("Full name is required");
    setSaving(true);
    try {
      const updated = await api.put("/users/me", {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      }).then((r) => r.data);
      updateUser({ fullName: updated.fullName, phone: updated.phone });
      toast.success("Profile updated");
      setEditing(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
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
    } catch (err) {
      toast.error(err?.response?.data?.message || "Password change failed");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title="My Profile" subtitle="Your account info and security settings." />

      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-primary-pale text-primary-dark flex items-center justify-center text-2xl font-bold">
            {initials || "?"}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary-dark">{user.fullName}</h2>
            <p className="text-sm text-neutral-500">{user.email}</p>
            <div className="flex gap-2 mt-1">
              <Badge tone={ROLE_TONE[user.role] || "neutral"}>{user.role}</Badge>
              <Badge tone={user.isActive === false ? "danger" : "success"}>
                {user.isActive === false ? "Inactive" : "Active"}
              </Badge>
            </div>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-neutral-500">Full Name</dt><dd>{user.fullName}</dd>
          <dt className="text-neutral-500">Email</dt><dd>{user.email}</dd>
          <dt className="text-neutral-500">Phone</dt><dd>{user.phone || "—"}</dd>
          <dt className="text-neutral-500">Role</dt><dd className="capitalize">{user.role}</dd>
        </dl>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-primary-dark mb-2">Edit personal info</h3>
        {!editing ? (
          <Button variant="secondary" onClick={startEdit}>Edit</Button>
        ) : (
          <form onSubmit={onSave} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Full Name"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Field>
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
