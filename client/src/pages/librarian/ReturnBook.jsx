import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { returnBook, lookupTransaction } from "../../api/transactions.api";
import { useSettings } from "../../context/SettingsContext.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { Field, Input } from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import PayFineModal from "../../components/features/PayFineModal.jsx";
import Badge from "../../components/common/Badge.jsx";
import { formatNGN } from "../../utils/formatCurrency.js";
import { formatDate } from "../../utils/formatDate.js";
import { daysOverdue } from "../../utils/calcFine.js";

export default function ReturnBook() {
  const { settings } = useSettings();
  const { user } = useAuthContext();
  const isStaff = user?.role === "admin" || user?.role === "librarian";

  const [mode, setMode] = useState("txn");
  const [transactionCode, setTransactionCode] = useState("");
  const [memberId, setMemberId] = useState("");
  const [accessionNumber, setAccessionNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => { setPreview(null); }, [mode, transactionCode, memberId, accessionNumber]);

  const onLookup = async () => {
    if (mode === "txn") {
      if (!transactionCode.trim()) return toast.error("Enter a transaction code");
    } else {
      if (!memberId.trim() || !accessionNumber.trim()) return toast.error("Member ID and accession number are required");
    }
    try {
      const payload = mode === "txn"
        ? { transactionCode: transactionCode.trim() }
        : { memberId: memberId.trim(), accessionNumber: accessionNumber.trim() };
      const res = await lookupTransaction(payload);
      const fine = res.fineAmount || 0;
      const paid = res.paymentHistory ? res.paymentHistory.filter((p) => p.status === "success").reduce((s, p) => s + (p.amount || 0), 0) : 0;
      res.outstandingFine = Math.max(0, fine - paid);
      setPreview(res);
    } catch (e) {
      const msg = e?.response?.data?.message || "Not found";
      toast.error(msg);
      setPreview(null);
    }
  };

  const onConfirm = async () => {
    if (!preview) return;
    setSubmitting(true);
    try {
      const res = await returnBook({ transactionCode: preview.transactionCode });
      toast.success(`Returned. ${res.finePaid ? "Fine cleared" : "Fine outstanding"}: ${formatNGN(res.fineAmount || 0)}`);
      setPreview(null);
      setTransactionCode(""); setMemberId(""); setAccessionNumber("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Return failed");
    } finally { setSubmitting(false); }
  };

  const onPaid = () => {
    if (preview) {
      const fine = preview.fineAmount || 0;
      const paid = ((preview.paymentHistory || []).filter((p) => p.status === "success").reduce((s, p) => s + (p.amount || 0), 0)) + (preview.outstandingFine || 0);
      setPreview({ ...preview, outstandingFine: Math.max(0, fine - paid), fineAmount: fine });
    }
    onLookup();
  };

  const fine = preview ? Number(preview.fineAmount || 0) : 0;
  const outstanding = preview ? Number(preview.outstandingFine ?? fine) : 0;
  const rate = settings?.fineRatePerDay || 50;
  const requirePayment = settings?.requirePaymentBeforeReturn !== false;
  const fineBlocking = fine > 0 && outstanding > 0;

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader
        title="Return Book"
        subtitle="Search by transaction code, or by member + accession number."
      />

      <div className="card p-3 flex flex-wrap gap-2">
        <Button variant={mode === "txn" ? "primary" : "secondary"} onClick={() => setMode("txn")}>By Transaction Code</Button>
        <Button variant={mode === "member" ? "primary" : "secondary"} onClick={() => setMode("member")}>By Member + Accession</Button>
      </div>

      <div className="card p-5 space-y-3">
        {mode === "txn" ? (
          <Field label="Transaction Code (TXN-YYYY#########)">
            <Input value={transactionCode} onChange={(e) => setTransactionCode(e.target.value)} placeholder="e.g. TXN-20260000001" />
          </Field>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Member ID"><Input value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="LIB-YYYY-NNNNN" /></Field>
            <Field label="Accession Number"><Input value={accessionNumber} onChange={(e) => setAccessionNumber(e.target.value)} placeholder="ACC-NNNNNN" /></Field>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onLookup}>Look Up</Button>
        </div>

        {preview && (
          <div className="mt-4 border-t border-neutral-100 pt-4 space-y-2 text-sm">
            <dl className="grid grid-cols-2 gap-2">
              <dt className="text-neutral-500">Transaction</dt><dd>{preview.transactionCode}</dd>
              <dt className="text-neutral-500">Book</dt><dd>{preview.book?.title} ({preview.book?.accessionNumber})</dd>
              <dt className="text-neutral-500">Member</dt><dd>{preview.member ? `${preview.member.firstName} ${preview.member.lastName} (${preview.member.memberID})` : "—"}</dd>
              <dt className="text-neutral-500">Issue Date</dt><dd>{formatDate(preview.issueDate)}</dd>
              <dt className="text-neutral-500">Due Date</dt><dd>{formatDate(preview.dueDate)}</dd>
              <dt className="text-neutral-500">Status</dt><dd><Badge tone={preview.status === "Overdue" ? "overdue" : preview.status === "Returned" ? "returned" : "issued"}>{preview.status}</Badge></dd>
            </dl>

            <div className={`p-3 rounded-md ${fine > 0 ? "bg-red-50 text-status-danger" : "bg-green-50 text-status-success"}`}>
              {fine > 0
                ? <span><strong>{daysOverdue(preview.dueDate)} day(s) overdue.</strong> Fine: <strong>{formatNGN(fine)}</strong> at {formatNGN(rate)}/day.</span>
                : <span>No fine. Returning on time.</span>}
              {fine > 0 && (
                <div className="mt-1">
                  Outstanding: <strong>{formatNGN(outstanding)}</strong>{" "}
                  {outstanding === 0 && <Badge tone="success">paid</Badge>}
                  {outstanding > 0 && outstanding < fine && <Badge tone="warning">partial</Badge>}
                </div>
              )}
            </div>

            {requirePayment && fineBlocking && (
              <div className="rounded-md bg-amber-50 text-status-warning p-3">
                <strong>Strict policy:</strong> outstanding fine of <strong>{formatNGN(outstanding)}</strong> must be settled before this book can be returned.
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setPreview(null)}>Cancel</Button>
              {fine > 0 && (
                <Button variant="secondary" onClick={() => setPayOpen(true)}>
                  {outstanding === 0 ? "View Payment" : "Pay Fine"}
                </Button>
              )}
              <Button onClick={onConfirm} disabled={submitting || (requirePayment && fineBlocking)}>
                {submitting ? "Processing..." : (requirePayment && fineBlocking ? "Pay Fine First" : "Confirm Return")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <PayFineModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        transaction={preview}
        onPaid={onPaid}
      />
    </div>
  );
}
