export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const prev = () => onPageChange(Math.max(1, page - 1));
  const next = () => onPageChange(Math.min(totalPages, page + 1));
  return (
    <div className="flex items-center justify-between mt-3 text-sm">
      <button onClick={prev} disabled={page === 1} className="btn-secondary disabled:opacity-50">Previous</button>
      <span className="text-neutral-600">Page {page} of {totalPages}</span>
      <button onClick={next} disabled={page === totalPages} className="btn-secondary disabled:opacity-50">Next</button>
    </div>
  );
}
