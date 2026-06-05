const TONE = {
  success:  "bg-green-100 text-status-success",
  warning:  "bg-amber-100 text-status-warning",
  danger:   "bg-red-100 text-status-danger",
  info:     "bg-cyan-100 text-status-info",
  overdue:  "bg-red-100 text-status-overdue",
  returned: "bg-green-100 text-status-returned",
  issued:   "bg-cyan-100 text-status-issued",
  reserved: "bg-amber-100 text-status-reserved",
  neutral:  "bg-neutral-100 text-neutral-700",
};

export default function Badge({ tone = "neutral", children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[tone] || TONE.neutral}`}>{children}</span>;
}
