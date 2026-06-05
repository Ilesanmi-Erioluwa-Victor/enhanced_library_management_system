import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import Modal from "../common/Modal.jsx";
import Button from "../common/Button.jsx";
import Spinner from "../common/Spinner.jsx";
import {
  initiatePayment,
  verifyPayment,
  confirmInlinePayment,
  requestCashPayment,
  downloadReceipt,
} from "../../api/payments.api";
import { formatNGN } from "../../utils/formatCurrency.js";
import { formatDate } from "../../utils/formatDate.js";
import { useAuthContext } from "../../context/AuthContext.jsx";

const PAYSTACK_SCRIPT = "https://js.paystack.co/v1/inline.js";

const loadPaystack = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.PaystackPop) return resolve(window.PaystackPop);
    const existing = document.querySelector(`script[src="${PAYSTACK_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.PaystackPop));
      existing.addEventListener("error", () => reject(new Error("Failed to load Paystack inline script")));
      return;
    }
    const s = document.createElement("script");
    s.src = PAYSTACK_SCRIPT;
    s.async = true;
    s.onload = () => resolve(window.PaystackPop);
    s.onerror = () => reject(new Error("Failed to load Paystack inline script"));
    document.head.appendChild(s);
  });

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function PayFineModal({ open, onClose, transaction, onPaid }) {
  const { user } = useAuthContext();
  const [step, setStep] = useState("choose");
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [cashMethod, setCashMethod] = useState("cash");
  const [cashNotes, setCashNotes] = useState("");

  const fine = Number(transaction?.outstandingFine ?? transaction?.fineAmount ?? 0);
  const isMember = user?.role === "member";
  const isStaff = user?.role === "admin" || user?.role === "librarian";

  useEffect(() => {
    if (!open) {
      setStep("choose");
      setPaying(false);
      setVerifying(false);
      setResult(null);
      setCashMethod("cash");
      setCashNotes("");
    }
  }, [open]);

  if (!isMember) {
    return (
      <Modal open={open} onClose={onClose} title={`Pay Fine — ${transaction?.transactionCode || ""}`} footer={<Button onClick={onClose}>Close</Button>}>
        <div className="rounded-md bg-amber-50 text-status-warning p-3 text-sm">
          <strong>Read-only view.</strong> Only the member can initiate a payment.
          {isStaff && " Staff verify cash payments from the Payments page."}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-neutral-500">Fine</dt><dd>{formatNGN(fine)}</dd>
          <dt className="text-neutral-500">Transaction</dt><dd>{transaction?.transactionCode}</dd>
          {transaction?.book?.title && <><dt className="text-neutral-500">Book</dt><dd>{transaction.book.title}</dd></>}
        </dl>
      </Modal>
    );
  }

  const onPayOnline = useCallback(async () => {
    if (!transaction) return;
    setPaying(true);
    try {
      const init = await initiatePayment({ transactionId: transaction._id, amount: fine });
      const { authorizationUrl, reference } = init;
      setStep("redirecting");

      let inlineOpened = false;
      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      try {
        await loadPaystack();
        if (window.PaystackPop && publicKey && publicKey.startsWith("pk_")) {
          const ownerEmail = transaction?.member?.email || user?.email;
          window.PaystackPop.setup({
            key: publicKey,
            email: ownerEmail,
            amount: Math.round(fine * 100),
            currency: "NGN",
            ref: reference,
            channels: ["card", "bank", "ussd", "qr"],
            metadata: {
              transactionId: String(transaction._id),
              transactionCode: transaction.transactionCode,
            },
            callback: async (response) => {
              setStep("verifying");
              setVerifying(true);
              try {
                const confirmed = await confirmInlinePayment(response?.reference || reference, {
                  channel: response?.channel || "card",
                  paidAt: new Date().toISOString(),
                  gatewayResponse: response || null,
                });
                setVerifying(false);
                setResult(confirmed);
                toast.success("Payment confirmed — debt cleared");
                setStep("done");
                onPaid?.(confirmed);
              } catch (e) {
                setVerifying(false);
                const msg = e?.response?.data?.message || e?.message || "Failed to confirm payment";
                toast.error(msg);
                setStep("cancelled");
              }
            },
            onClose: () => {
              if (step === "redirecting") {
                pollVerify(reference, { interval: 1500, maxAttempts: 4 }).then((polled) => {
                  if (polled.payment?.status === "success") {
                    setResult(polled);
                    setStep("done");
                    toast.success("Payment confirmed — debt cleared");
                    onPaid?.(polled);
                  } else if (polled.payment?.status === "pending") {
                    setResult(polled);
                    setStep("pending");
                  }
                }).catch(() => {});
              }
            },
          }).openIframe();
          inlineOpened = true;
        }
      } catch {
        // Inline script failed to load — fall back to hosted page
      }

      if (!inlineOpened) {
        window.open(authorizationUrl, "_blank", "noopener,noreferrer");
        setStep("verifying");
        setVerifying(true);
        const polled = await pollVerify(reference);
        setVerifying(false);
        setResult(polled);
        if (polled.payment?.status === "success") {
          toast.success("Payment confirmed — debt cleared");
          setStep("done");
          onPaid?.(polled);
        } else if (polled.payment?.status === "failed" || polled.payment?.status === "cancelled") {
          const gatewayMsg = polled.payment?.rawResponse?.data?.gateway_response || "The payment was not completed.";
          toast.error(`Payment not completed: ${gatewayMsg}`);
          setStep("cancelled");
        } else {
          toast.error("Payment not confirmed yet. If you completed the checkout, click 'I have paid' to check again.");
          setStep("pending");
        }
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to start payment");
      setStep("choose");
    } finally {
      setPaying(false);
    }
  }, [transaction, fine, onPaid, user, step]);

  const onRequestCash = useCallback(async () => {
    if (!transaction) return;
    setPaying(true);
    try {
      const res = await requestCashPayment({
        transactionId: transaction._id,
        amount: fine,
        method: cashMethod,
        notes: cashNotes || undefined,
      });
      toast.success("Cash payment request submitted. Please pay at the library desk — it will be cleared once the staff verifies your payment.");
      setResult({ payment: res.payment, transaction: res.transaction });
      setStep("cashRequested");
      onPaid?.(res);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to submit cash request");
    } finally {
      setPaying(false);
    }
  }, [transaction, fine, cashMethod, cashNotes, onPaid]);

  const onRetryVerify = useCallback(async () => {
    if (!result?.payment?.reference) return;
    setVerifying(true);
    try {
      const polled = await verifyPayment(result.payment.reference);
      setVerifying(false);
      setResult(polled);
      if (polled.payment?.status === "success") {
        toast.success("Payment confirmed");
        setStep("done");
        onPaid?.(polled);
      } else {
        toast.error("Still pending. Try again in a moment.");
      }
    } catch (e) {
      setVerifying(false);
      toast.error(e?.response?.data?.message || "Verification failed");
    }
  }, [result, onPaid]);

  const onDownloadReceipt = useCallback(async () => {
    if (!result?.payment?._id) return;
    try {
      const blob = await downloadReceipt(result.payment._id);
      downloadBlob(blob, `receipt-${result.payment.reference}.pdf`);
      toast.success("Receipt downloaded");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not download receipt");
    }
  }, [result]);

  if (!transaction) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pay Fine — ${transaction.transactionCode || ""}`}
      footer={
        <>
          {step === "choose" && (
            <>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              {isMember && (
                <Button variant="secondary" onClick={() => setStep("cash")} disabled={paying}>
                  Pay with {cashMethod === "bank_transfer" ? "Bank Transfer" : "Cash"} at Desk
                </Button>
              )}
              {isMember ? (
                <Button onClick={onPayOnline} disabled={paying}>
                  {paying ? "Starting..." : "Pay Online (Paystack)"}
                </Button>
              ) : (
                <span className="text-xs text-neutral-500 self-center">Viewing only — only the member can initiate payment.</span>
              )}
            </>
          )}
          {step === "cash" && (
            <>
              <Button variant="secondary" onClick={() => setStep("choose")}>← Back</Button>
              <Button onClick={onRequestCash} disabled={paying}>
                {paying ? "Submitting..." : "Submit Cash Request"}
              </Button>
            </>
          )}
          {step === "redirecting" && (
            <Button variant="secondary" onClick={onClose}>Close</Button>
          )}
          {step === "verifying" && (
            <Button variant="secondary" onClick={onClose}>Close</Button>
          )}
          {step === "pending" && (
            <>
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <Button onClick={onRetryVerify} disabled={verifying}>
                {verifying ? "Checking..." : "I have paid — verify now"}
              </Button>
            </>
          )}
          {step === "cancelled" && (
            <>
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <Button onClick={onPayOnline} disabled={paying}>
                {paying ? "Starting..." : "Try again"}
              </Button>
            </>
          )}
          {step === "cashRequested" && (
            <Button onClick={onClose}>Done</Button>
          )}
          {step === "done" && (
            <Button onClick={onClose}>Done</Button>
          )}
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-md bg-red-50 p-3 text-status-danger">
          <div className="font-semibold">Outstanding fine: {formatNGN(fine)}</div>
          {transaction.book?.title && (
            <div className="text-neutral-700 mt-1">
              Book: {transaction.book.title} {transaction.book.accessionNumber ? `(${transaction.book.accessionNumber})` : ""}
            </div>
          )}
          {transaction.member && (
            <div className="text-neutral-700">
              Member: {transaction.member.firstName} {transaction.member.lastName}
              {transaction.member.memberID ? ` (${transaction.member.memberID})` : ""}
            </div>
          )}
          {transaction.dueDate && (
            <div className="text-neutral-700">Due: {formatDate(transaction.dueDate)}</div>
          )}
        </div>

        {step === "choose" && (
          <div className="text-neutral-600">
            Choose how the fine will be settled. <strong>Online</strong> opens a secure Paystack checkout (cards, bank transfer, USSD, QR) — the debt is cleared automatically.{" "}
            {isMember && (
              <span>
                <strong>Cash / Bank</strong> submits a request you can settle at the library desk; staff will verify the payment and your debt will be cleared.
              </span>
            )}
            {isStaff && (
              <span className="text-status-warning">
                Only the member themselves can initiate a payment. Staff verification is done from the Payments page.
              </span>
            )}
          </div>
        )}

        {step === "cash" && isMember && (
          <div className="space-y-2">
            <div>
              <label className="label">Method</label>
              <select className="input" value={cashMethod} onChange={(e) => setCashMethod(e.target.value)}>
                <option value="cash">Cash (at the library desk)</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="label">Reference / Notes (optional)</label>
              <input
                className="input"
                placeholder={cashMethod === "bank_transfer" ? "e.g. bank slip ref, transfer date" : "any details for the librarian"}
                value={cashNotes}
                onChange={(e) => setCashNotes(e.target.value)}
              />
            </div>
            <div className="text-xs text-neutral-500">
              Your request will be marked as <strong>pending</strong> and visible to the librarian. Once the staff confirms receipt, the debt will be cleared and a receipt will be available.
            </div>
          </div>
        )}

        {step === "cashRequested" && result?.payment && (
          <div className="rounded-md bg-amber-50 text-status-warning p-3 space-y-1">
            <div className="font-semibold">⏳ Awaiting staff verification</div>
            <div>Reference: <strong>{result.payment.reference}</strong></div>
            <div>Amount: <strong>{formatNGN(result.payment.amount)}</strong></div>
            <div>Method: {result.payment.method || "—"}</div>
            <div className="text-sm text-neutral-700 mt-2">
              Please pay <strong>{formatNGN(result.payment.amount)}</strong> at the library desk. Your outstanding balance will be cleared as soon as the staff confirms receipt.
            </div>
          </div>
        )}

        {(step === "redirecting" || step === "verifying") && (
          <div className="flex items-center gap-2 text-neutral-600">
            <Spinner /> <span>Complete the payment in the Paystack tab that opened. We are verifying...</span>
          </div>
        )}

        {step === "pending" && (
          <div className="rounded-md bg-amber-50 text-status-warning p-3">
            Payment is still pending. If you have completed the Paystack checkout, click "verify now" or wait a few seconds and close this dialog.
          </div>
        )}

        {step === "cancelled" && result?.payment && (
          <div className="rounded-md bg-red-50 text-status-danger p-3 space-y-2">
            <div className="font-semibold">❌ Payment not completed</div>
            <div>Reference: <code className="font-mono text-xs">{result.payment.reference}</code></div>
            <div className="text-sm text-neutral-700">
              {result.payment.rawResponse?.data?.gateway_response
                || result.payment.rawResponse?.message
                || "The payment was abandoned or declined before completion."}
            </div>
            <div className="text-xs text-neutral-600 mt-2 space-y-1">
              <p><strong>Common causes:</strong></p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>The Paystack tab was closed before clicking "Pay".</li>
                <li>Test mode requires a valid test card — use <code className="font-mono">4084084084084081</code>, any future expiry, CVV <code className="font-mono">408</code>, PIN <code className="font-mono">0000</code>, OTP <code className="font-mono">123456</code>.</li>
                <li>An ad-blocker blocked the inline checkout.</li>
              </ul>
            </div>
            <p className="text-xs text-neutral-600">Your outstanding fine has <strong>not</strong> been cleared. Click <strong>Try again</strong> to start a new payment.</p>
          </div>
        )}

        {step === "done" && result?.payment && (
          <div className="rounded-md bg-green-50 text-status-success p-3 space-y-1">
            <div className="font-semibold">✅ Payment confirmed — debt cleared</div>
            <div>Reference: <strong>{result.payment.reference}</strong></div>
            <div>Amount: <strong>{formatNGN(result.payment.amount)}</strong></div>
            <div>Method: {result.payment.method || "—"} {result.payment.channel ? `(${result.payment.channel})` : ""}</div>
            <div>Date: {formatDate(result.payment.paidAt || result.payment.createdAt)}</div>
            <Button variant="secondary" className="mt-2" onClick={onDownloadReceipt}>
              ⬇ Download Receipt
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

const pollVerify = async (reference, { interval = 3000, maxAttempts = 8 } = {}) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await verifyPayment(reference);
      if (res.payment?.status === "success" || res.payment?.status === "failed" || res.payment?.status === "cancelled") {
        return res;
      }
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return { payment: { reference, status: "pending" } };
};
