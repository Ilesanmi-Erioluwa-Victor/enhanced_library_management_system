import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import Button from "../../components/common/Button.jsx";
import { verifyPayment } from "../../api/payments.api";

export default function PaymentCallback() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [payment, setPayment] = useState(null);
  const reference = params.get("reference") || params.get("trxref");

  useEffect(() => {
    if (!reference) { setStatus("missing"); return; }
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < 6; i++) {
        if (cancelled) return;
        try {
          const res = await verifyPayment(reference);
          if (cancelled) return;
          setPayment(res.payment);
          if (res.payment?.status === "success") { setStatus("success"); toast.success("Payment confirmed — debt cleared"); return; }
          if (res.payment?.status === "failed" || res.payment?.status === "cancelled") { setStatus("failed"); return; }
        } catch (e) { if (cancelled) return; /* keep polling */ }
        await new Promise((r) => setTimeout(r, 2500));
      }
      if (!cancelled) setStatus("timeout");
    };
    run();
    return () => { cancelled = true; };
  }, [reference]);

  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader title="Payment Callback" subtitle="Verifying your payment with Paystack" />
      {status === "verifying" && (
        <div className="card p-6 flex items-center gap-3 text-sm text-neutral-600">
          <Spinner /> <span>Confirming your payment for reference <code className="font-mono">{reference}</code>…</span>
        </div>
      )}
      {status === "success" && (
        <div className="card p-6 space-y-3 bg-green-50 text-status-success">
          <h2 className="text-lg font-semibold">✅ Payment confirmed</h2>
          <p className="text-sm text-neutral-700">Your fine has been cleared. You can return to My Fines to download a receipt.</p>
          <Link to="/my-fines"><Button>Go to My Fines</Button></Link>
        </div>
      )}
      {status === "failed" && (
        <div className="card p-6 space-y-3 bg-red-50 text-status-danger">
          <h2 className="text-lg font-semibold">❌ Payment not successful</h2>
          <p className="text-sm text-neutral-700">Reference: <code className="font-mono">{reference}</code></p>
          <p className="text-sm text-neutral-700">Your outstanding fine has not been cleared. Please try again or contact the library.</p>
          <Link to="/my-fines"><Button variant="secondary">Back to My Fines</Button></Link>
        </div>
      )}
      {status === "timeout" && (
        <div className="card p-6 space-y-3 bg-amber-50 text-status-warning">
          <h2 className="text-lg font-semibold">⏳ Still verifying</h2>
          <p className="text-sm text-neutral-700">We have not received confirmation from Paystack yet. Your My Fines page will update automatically, or you can refresh it in a few seconds.</p>
          <Link to="/my-fines"><Button>Go to My Fines</Button></Link>
        </div>
      )}
      {status === "missing" && (
        <div className="card p-6 space-y-3">
          <h2 className="text-lg font-semibold">No reference</h2>
          <p className="text-sm text-neutral-700">The callback did not include a Paystack reference. Please return to My Fines and try again.</p>
          <Link to="/my-fines"><Button variant="secondary">Back to My Fines</Button></Link>
        </div>
      )}
    </div>
  );
}
