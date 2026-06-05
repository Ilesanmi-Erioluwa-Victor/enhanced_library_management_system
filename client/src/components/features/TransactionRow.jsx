import Badge from "../common/Badge.jsx";
import { formatDate } from "../../utils/formatDate.js";

const STATUS_TONE = {
  Issued:   "issued",
  Returned: "returned",
  Overdue:  "overdue",
  Lost:     "danger",
};

export default function TransactionRow({ txn }) {
  if (!txn) return null;
  const tone = STATUS_TONE[txn.status] || "neutral";
  return (
    <tr className={`row-${txn.status?.toLowerCase() || "neutral"}`}>
      <td className="px-4 py-2 text-sm">{txn.transactionCode}</td>
      <td className="px-4 py-2 text-sm">{txn.book?.title || "—"}</td>
      <td className="px-4 py-2 text-sm">{txn.member ? `${txn.member.firstName} ${txn.member.lastName}` : "—"}</td>
      <td className="px-4 py-2 text-sm">{formatDate(txn.issueDate)}</td>
      <td className="px-4 py-2 text-sm">{formatDate(txn.dueDate)}</td>
      <td className="px-4 py-2 text-sm"><Badge tone={tone}>{txn.status}</Badge></td>
    </tr>
  );
}
