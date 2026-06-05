import useMemberProfile from "../../hooks/useMemberProfile.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Badge from "../../components/common/Badge.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import { formatDate } from "../../utils/formatDate.js";
import { daysOverdue } from "../../utils/calcFine.js";
import { formatNGN } from "../../utils/formatCurrency.js";

export default function MyBorrowedBooks() {
  const { member, stats, loading } = useMemberProfile();

  if (loading) return <div className="flex items-center gap-2 text-neutral-500"><Spinner /> Loading your books…</div>;
  if (!member) return <div className="card p-6 text-sm text-neutral-500">No member profile is linked to this account. Contact the librarian.</div>;

  const active = (member.transactions || []).filter((t) => t.status === "Issued" || t.status === "Overdue");

  return (
    <div className="space-y-4">
      <PageHeader title="My Borrowed Books" subtitle={`${stats?.currentlyBorrowed || active.length} currently borrowed`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Borrowed" value={stats?.totalBorrowed ?? 0} />
        <Stat label="Currently Out" value={stats?.currentlyBorrowed ?? 0} />
        <Stat label="Overdue" value={stats?.overdue ?? 0} tone="text-status-overdue" />
        <Stat label="Unpaid Fines" value={formatNGN(stats?.unpaidFines ?? 0)} tone="text-status-danger" />
      </div>

      {active.length === 0 ? (
        <div className="card p-6 text-center text-neutral-500">You have no borrowed books right now.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map((t) => {
            const overdue = t.status === "Overdue" || daysOverdue(t.dueDate) > 0;
            return (
              <div key={t._id} className={`card p-4 border-t-4 ${overdue ? "border-status-danger" : "border-accent"}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-primary-dark">{t.book?.title || "Unknown"}</h3>
                  <Badge tone={overdue ? "overdue" : "issued"}>{overdue ? "Overdue" : "Issued"}</Badge>
                </div>
                <p className="text-xs text-neutral-500 mt-1">{t.transactionCode}</p>
                <dl className="mt-3 text-sm space-y-1">
                  <div className="flex justify-between"><dt className="text-neutral-500">Issued</dt><dd>{formatDate(t.issueDate)}</dd></div>
                  <div className="flex justify-between"><dt className="text-neutral-500">Due</dt><dd className={overdue ? "text-status-danger font-medium" : ""}>{formatDate(t.dueDate)}</dd></div>
                  {overdue && <div className="flex justify-between"><dt className="text-neutral-500">Days overdue</dt><dd className="text-status-danger font-medium">{daysOverdue(t.dueDate)}</dd></div>}
                  {t.fineAmount > 0 && <div className="flex justify-between"><dt className="text-neutral-500">Fine</dt><dd className={t.finePaid ? "text-status-success" : "text-status-danger font-medium"}>{formatNGN(t.fineAmount)} {t.finePaid ? "✓ paid" : ""}</dd></div>}
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "text-primary" }) {
  return (
    <div className="card p-3">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tone}`}>{value}</div>
    </div>
  );
}
