export default function OverdueAlert({ count = 0, onView }) {
  if (!count) return null;
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-status-danger flex items-center justify-between">
      <span><strong>{count}</strong> book(s) are overdue.</span>
      <button onClick={onView} className="font-medium underline">View List</button>
    </div>
  );
}
