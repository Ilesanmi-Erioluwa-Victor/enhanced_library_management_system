import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { forgotPassword } from "../../api/auth.api";
import { Field, Input } from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
      toast.success("If that email is registered, a reset link has been sent.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not send reset link");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-sm text-neutral-700 mb-3">Check your inbox for the reset link.</p>
        <Link to="/login" className="text-primary text-sm hover:underline">Back to login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <p className="text-sm text-neutral-600 mb-4">Enter your email and we'll send a reset link.</p>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </Field>
      <Button type="submit" disabled={loading} className="w-full">{loading ? "Sending..." : "Send Reset Link"}</Button>
      <p className="text-xs text-center mt-3"><Link to="/login" className="text-primary hover:underline">Back to login</Link></p>
    </form>
  );
}
