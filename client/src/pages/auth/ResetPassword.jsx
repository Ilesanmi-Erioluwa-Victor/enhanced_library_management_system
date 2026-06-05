import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { resetPassword } from "../../api/auth.api";
import { Field, Input } from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      await resetPassword(token, { password: form.password });
      toast.success("Password reset. You can now log in.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Field label="New Password">
        <div className="relative">
          <Input type={show ? "text" : "password"} value={form.password} onChange={onChange("password")} required />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1.5 text-xs text-primary">{show ? "Hide" : "Show"}</button>
        </div>
      </Field>
      <Field label="Confirm Password">
        <Input type={show ? "text" : "password"} value={form.confirm} onChange={onChange("confirm")} required />
      </Field>
      <Button type="submit" disabled={loading} className="w-full">{loading ? "Resetting..." : "Reset Password"}</Button>
      <p className="text-xs text-center mt-3"><Link to="/login" className="text-primary hover:underline">Back to login</Link></p>
    </form>
  );
}
