import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getMember, updateMember, uploadMemberPhoto } from "../../api/members.api";
import { listActiveDepartments } from "../../api/departments.api";
import PageHeader from "../../components/common/PageHeader.jsx";
import { Field, Input, Select } from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import { GENDERS, MEMBER_TYPES } from "../../utils/constants.js";

export default function EditMember() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [depts, setDepts] = useState([]);

  useEffect(() => {
    Promise.all([getMember(id), listActiveDepartments()])
      .then(([{ member }, deptsList]) => {
        setDepts(deptsList);
        setForm({
          firstName: member.firstName, lastName: member.lastName,
          email: member.email || "", phone: member.phone, gender: member.gender || "",
          address: member.address || "", memberType: member.memberType,
          departmentRef: (member.departmentRef && member.departmentRef._id) || member.departmentRef || "",
          department: member.department || "", maxBooksAllowed: member.maxBooksAllowed,
          membershipEnd: member.membershipEnd ? member.membershipEnd.split("T")[0] : "",
        });
      })
      .catch((e) => toast.error(e?.response?.data?.message || "Failed to load member"))
      .finally(() => setLoading(false));
  }, [id]);

  const onChange = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => {
      if (k === "departmentRef") {
        const dept = depts.find((d) => d._id === v);
        return { ...f, departmentRef: v, department: dept ? dept.name : "" };
      }
      return { ...f, [k]: v };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, maxBooksAllowed: Number(form.maxBooksAllowed) };
      if (form.membershipEnd) payload.membershipEnd = form.membershipEnd;
      await updateMember(id, payload);
      if (photo) { const fd = new FormData(); fd.append("photo", photo); await uploadMemberPhoto(id, fd); }
      toast.success("Member updated");
      navigate("/members", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally { setSaving(false); }
  };

  if (loading || !form) return <div className="flex items-center gap-2 text-neutral-500"><Spinner /> Loading…</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader title="Edit Member" subtitle="Update details and save." />
      <form onSubmit={onSubmit} className="card p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="First Name"><Input value={form.firstName} onChange={onChange("firstName")} required /></Field>
          <Field label="Last Name"><Input value={form.lastName} onChange={onChange("lastName")} required /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={onChange("phone")} required /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={onChange("email")} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={onChange("gender")}>
              <option value="">Select…</option>
              {GENDERS.map((g) => <option key={g}>{g}</option>)}
            </Select>
          </Field>
          <Field label="Member Type">
            <Select value={form.memberType} onChange={onChange("memberType")}>
              {MEMBER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Department">
            <Select value={form.departmentRef} onChange={onChange("departmentRef")}>
              <option value="">— None —</option>
              {depts.map((d) => <option key={d._id} value={d._id}>{d.name}{d.code ? ` (${d.code})` : ""}</option>)}
            </Select>
          </Field>
          <Field label="Max Books Allowed"><Input type="number" min="1" value={form.maxBooksAllowed} onChange={onChange("maxBooksAllowed")} /></Field>
          <Field label="Membership Expiry"><Input type="date" value={form.membershipEnd} onChange={onChange("membershipEnd")} /></Field>
          <Field label="Address" className="md:col-span-2"><Input value={form.address} onChange={onChange("address")} /></Field>
        </div>
        <Field label="Replace photo (optional)">
          <input type="file" accept="image/jpeg,image/png" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}
