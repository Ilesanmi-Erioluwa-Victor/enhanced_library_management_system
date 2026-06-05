import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { login as apiLogin } from "../../api/auth.api";
import { useAuth } from "../../hooks/useAuth";
import { Field, Input } from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiLogin(form);
      login(data);
      toast.success("Welcome back");
      if (data.role === "member") navigate("/my-books", { replace: true });
      else if (data.role === "librarian" || data.role === "admin") navigate("/dashboard", { replace: true });
      else navigate("/", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Field label="Email">
        <Input type="email" name="email" value={form.email} onChange={onChange} required autoFocus />
      </Field>
      <Field label="Password">
        <div className="relative">
          <Input type={show ? "text" : "password"} name="password" value={form.password} onChange={onChange} required />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1.5 text-xs text-primary">
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </Field>
      <div className="flex items-center justify-between mt-4">
        <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot Password?</Link>
        <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
      </div>
    </form>
  );
}
