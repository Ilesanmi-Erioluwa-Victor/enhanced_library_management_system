import Badge from "../common/Badge.jsx";

export default function BookCard({ book }) {
  if (!book) return null;
  const available = book.availableCopies;
  const tone = available > 1 ? "success" : available === 1 ? "warning" : "danger";
  return (
    <div className="card p-4 border-t-4 border-accent">
      <h3 className="font-semibold text-primary-dark">{book.title}</h3>
      <p className="text-sm text-neutral-600">{book.author}</p>
      <p className="text-xs text-neutral-500 mt-1">{book.accessionNumber} • {book.shelfLocation}</p>
      <div className="mt-3 flex items-center justify-between">
        <Badge tone={tone}>
          {available > 0 ? `${available} available` : "Unavailable"}
        </Badge>
      </div>
    </div>
  );
}
