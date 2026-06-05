import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createMember, uploadMemberPhoto } from "../../api/members.api";
import { listActiveDepartments } from "../../api/departments.api";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import { Field, Input, Select, Textarea } from "../../components/common/Input.jsx";
import { GENDERS, MEMBER_TYPES } from "../../utils/constants.js";

const STEPS = ["Personal Info", "Membership Info", "Review & Submit"];

export default function AddMember() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [depts, setDepts] = useState([]);
  const [form, setForm] = useState({
    firstName: "", lastName: "", gender: "", phone: "", email: "",
    memberType: "Student", departmentRef: "", department: "", address: "",
  });
  const [created, setCreated] = useState(null);

  useEffect(() => { listActiveDepartments().then(setDepts).catch(() => {}); }, []);

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

  const next = () => {
    if (step === 0) {
      if (!form.firstName || !form.lastName || !form.phone) return toast.error("First name, last name, and phone are required");
    } else if (step === 1) {
      if (!form.memberType) return toast.error("Pick a member type");
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const onSubmit = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.departmentRef) delete payload.departmentRef;
      if (!payload.department) delete payload.department;
      const m = await createMember(payload);
      if (photo) { const fd = new FormData(); fd.append("photo", photo); try { await uploadMemberPhoto(m._id, fd); } catch {} }
      setCreated(m);
      toast.success(`Member ${m.memberID} created`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <div className="space-y-4 max-w-xl">
        <PageHeader title="Member Registered" subtitle="A welcome email will be sent if SMTP is configured." />
        <div className="card p-5 border-t-4 border-accent">
          <div className="text-center mb-4">
            <div className="h-20 w-20 mx-auto rounded-full bg-primary-pale text-primary-dark flex items-center justify-center text-2xl font-bold">
              {created.firstName[0]}{created.lastName[0]}
            </div>
            <h2 className="mt-2 text-xl font-semibold text-primary-dark">{created.firstName} {created.lastName}</h2>
            <p className="text-sm text-neutral-500">{created.memberID} • {created.memberType}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-neutral-500">Phone</dt><dd>{created.phone}</dd>
            <dt className="text-neutral-500">Email</dt><dd>{created.email || "—"}</dd>
            <dt className="text-neutral-500">Department</dt><dd>{created.department || "—"}</dd>
            <dt className="text-neutral-500">Member until</dt><dd>{new Date(created.membershipEnd).toLocaleDateString()}</dd>
            <dt className="text-neutral-500">Max books</dt><dd>{created.maxBooksAllowed}</dd>
          </dl>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => navigate("/members", { replace: true })}>Back to List</Button>
            <Button onClick={() => navigate(`/transactions/issue?memberId=${created._id}`, { replace: true })}>Issue a Book</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader title="Register Member" subtitle={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`} />

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 h-2 rounded ${i <= step ? "bg-primary" : "bg-neutral-200"}`} />
        ))}
      </div>

      <div className="card p-5 space-y-3">
        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="First Name"><Input value={form.firstName} onChange={onChange("firstName")} required autoFocus /></Field>
            <Field label="Last Name"><Input value={form.lastName} onChange={onChange("lastName")} required /></Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={onChange("gender")}>
                <option value="">Select…</option>
                {GENDERS.map((g) => <option key={g}>{g}</option>)}
              </Select>
            </Field>
            <Field label="Phone"><Input value={form.phone} onChange={onChange("phone")} required /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={onChange("email")} /></Field>
            <Field label="Photo (optional)">
              <input type="file" accept="image/jpeg,image/png" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Member Type">
              <Select value={form.memberType} onChange={onChange("memberType")}>
                {MEMBER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Department" hint={depts.length === 0 ? "No departments registered yet — ask an admin to add one in Settings → Departments." : "Select from the list of registered departments."}>
              <Select value={form.departmentRef} onChange={onChange("departmentRef")} disabled={depts.length === 0}>
                <option value="">— None —</option>
                {depts.map((d) => <option key={d._id} value={d._id}>{d.name}{d.code ? ` (${d.code})` : ""}</option>)}
              </Select>
            </Field>
            <Field label="Address (optional)" className="md:col-span-2"><Textarea rows={2} value={form.address} onChange={onChange("address")} /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-primary-dark">Review</h3>
            <dl className="grid grid-cols-2 gap-2">
              <dt className="text-neutral-500">Name</dt><dd>{form.firstName} {form.lastName}</dd>
              <dt className="text-neutral-500">Phone</dt><dd>{form.phone}</dd>
              <dt className="text-neutral-500">Email</dt><dd>{form.email || "—"}</dd>
              <dt className="text-neutral-500">Gender</dt><dd>{form.gender || "—"}</dd>
              <dt className="text-neutral-500">Type</dt><dd>{form.memberType}</dd>
              <dt className="text-neutral-500">Department</dt><dd>{form.department || "—"}</dd>
              <dt className="text-neutral-500">Address</dt><dd>{form.address || "—"}</dd>
            </dl>
            <p className="text-xs text-neutral-500">On submit, a Member ID (LIB-YYYY-NNNNN) is auto-generated and the membership is set to expire 1 year from today.</p>
          </div>
        )}

        <div className="flex justify-between mt-4">
          <Button variant="secondary" type="button" onClick={back} disabled={step === 0}>Back</Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>Next</Button>
          ) : (
            <Button type="button" onClick={onSubmit} disabled={saving}>{saving ? "Submitting..." : "Register Member"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
