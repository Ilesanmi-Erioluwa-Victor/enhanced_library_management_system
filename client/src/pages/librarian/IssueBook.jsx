import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { issueBook } from "../../api/transactions.api";
import { listAvailable } from "../../api/books.api";
import { listMembers } from "../../api/members.api";
import { useSettings } from "../../context/SettingsContext.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { Field, Input, Textarea } from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import { calcDueDate } from "../../utils/calcDueDate.js";
import { formatDate } from "../../utils/formatDate.js";

export default function IssueBook() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { settings } = useSettings();

  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [memberId, setMemberId] = useState(params.get("memberId") || "");
  const [bookId, setBookId] = useState(params.get("bookId") || "");
  const [memberQuery, setMemberQuery] = useState("");
  const [bookQuery, setBookQuery] = useState("");
  const [dueDate, setDueDate] = useState(formatDateInput(calcDueDate(new Date(), settings?.defaultLoanDays || 14)));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      listMembers({ limit: 100, status: "active" }).then((r) => r.items || []),
      listAvailable().then((b) => b || []),
    ]).then(([m, b]) => { setMembers(m); setBooks(b); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!memberId && params.get("memberId")) setMemberId(params.get("memberId"));
    if (!bookId && params.get("bookId")) setBookId(params.get("bookId"));
  }, [params, memberId, bookId]);

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members.slice(0, 20);
    return members.filter((m) =>
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      m.memberID.toLowerCase().includes(q) ||
      (m.phone || "").includes(q)
    ).slice(0, 20);
  }, [members, memberQuery]);

  const filteredBooks = useMemo(() => {
    const q = bookQuery.trim().toLowerCase();
    if (!q) return books.slice(0, 20);
    return books.filter((b) =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.accessionNumber || "").toLowerCase().includes(q)
    ).slice(0, 20);
  }, [books, bookQuery]);

  const member = members.find((m) => m._id === memberId);
  const book = books.find((b) => b._id === bookId);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!memberId) return toast.error("Pick a member");
    if (!bookId) return toast.error("Pick a book");
    setSubmitting(true);
    try {
      const txn = await issueBook({ memberId, bookId, dueDate, notes });
      toast.success(`Issued — Transaction ${txn.transactionCode}`);
      navigate("/transactions/overdue", { replace: false });
      navigate("/transactions", { replace: false });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Issue failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader title="Issue Book" subtitle="Search for a member, search for a book, confirm the due date, submit." />
      <form onSubmit={onSubmit} className="card p-5 space-y-4">
        <div>
          <label className="label">1. Member</label>
          <Input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="Search by name, Member ID, or phone…" />
          <div className="mt-2 max-h-40 overflow-y-auto border border-neutral-200 rounded-md divide-y divide-neutral-100">
            {filteredMembers.length === 0 && <div className="p-3 text-sm text-neutral-500">No matching members.</div>}
            {filteredMembers.map((m) => (
              <button type="button" key={m._id} onClick={() => setMemberId(m._id)} className={`w-full text-left p-2 text-sm flex items-center justify-between ${memberId === m._id ? "bg-primary-pale" : "hover:bg-neutral-50"}`}>
                <div>
                  <div className="font-medium">{m.firstName} {m.lastName}</div>
                  <div className="text-xs text-neutral-500">{m.memberID} • {m.memberType} • {m.phone}</div>
                </div>
                {memberId === m._id && <span className="text-primary text-xs">✓ selected</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">2. Book</label>
          <Input value={bookQuery} onChange={(e) => setBookQuery(e.target.value)} placeholder="Search by title, author, or accession number…" />
          <div className="mt-2 max-h-40 overflow-y-auto border border-neutral-200 rounded-md divide-y divide-neutral-100">
            {filteredBooks.length === 0 && <div className="p-3 text-sm text-neutral-500">No matching available books.</div>}
            {filteredBooks.map((b) => (
              <button type="button" key={b._id} onClick={() => setBookId(b._id)} className={`w-full text-left p-2 text-sm flex items-center justify-between ${bookId === b._id ? "bg-primary-pale" : "hover:bg-neutral-50"}`}>
                <div>
                  <div className="font-medium">{b.title}</div>
                  <div className="text-xs text-neutral-500">{b.author} • {b.accessionNumber} • {b.availableCopies} available</div>
                </div>
                {bookId === b._id && <span className="text-primary text-xs">✓ selected</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Issue Date"><Input type="date" value={formatDateInput(new Date())} disabled /></Field>
          <Field label="Due Date" hint={`Default loan: ${settings?.defaultLoanDays || 14} days`}><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></Field>
        </div>

        <Field label="Notes (optional)"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

        {member && book && (
          <div className="rounded-md border border-primary-pale bg-primary-pale/40 p-3 text-sm">
            <strong>Ready:</strong> Issue <em>{book.title}</em> to <em>{member.firstName} {member.lastName}</em> ({member.memberID}). Due {formatDate(dueDate)}.
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={submitting || !memberId || !bookId}>{submitting ? "Issuing..." : "Issue Book"}</Button>
        </div>
      </form>
    </div>
  );
}

function formatDateInput(d) {
  const date = new Date(d);
  return date.toISOString().split("T")[0];
}
