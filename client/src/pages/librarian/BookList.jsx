import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { listBooks, softDeleteBook } from "../../api/books.api";
import { listCategories } from "../../api/categories.api";
import { useAuth } from "../../hooks/useAuth";
import usePaginatedList from "../../hooks/usePaginatedList.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import SearchBar from "../../components/common/SearchBar.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import ConfirmDialog from "../../components/common/ConfirmDialog.jsx";
import { Field, Select } from "../../components/common/Input.jsx";
import toast from "react-hot-toast";
import { formatDate } from "../../utils/formatDate.js";

export default function BookList() {
  const { role } = useAuth();
  const [filter, setFilter] = useState({ q: "", category: "", availability: "", sort: "newest" });
  const [cats, setCats] = useState([]);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { listCategories().then(setCats).catch(() => {}); }, []);

  const fetcher = useCallback(
    (p) => listBooks({ ...p, q: filter.q, category: filter.category, availability: filter.availability, sort: filter.sort }),
    [filter]
  );
  const { items, total, pages, page, loading, goToPage, refresh } = usePaginatedList(fetcher, {});

  useEffect(() => { refresh(); }, [filter.q, filter.category, filter.availability, filter.sort]);

  const availabilityTone = (b) => {
    if (b.availableCopies === 0) return "danger";
    if (b.availableCopies === 1) return "warning";
    return "success";
  };
  const availabilityLabel = (b) => {
    if (b.availableCopies === 0) return "Unavailable";
    if (b.availableCopies === 1) return "Limited";
    return "Available";
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Book Catalogue"
        subtitle={`${total} book${total === 1 ? "" : "s"}`}
        actions={
          (role === "admin" || role === "librarian") ? (
            <Link to="/books/new"><Button>+ Add New Book</Button></Link>
          ) : null
        }
      />

      <div className="card p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <SearchBar value={filter.q} onChange={(v) => setFilter((f) => ({ ...f, q: v }))} placeholder="Search title, author, ISBN, accession…" delay={400} />
        <Field label="Category">
          <Select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Availability">
          <Select value={filter.availability} onChange={(e) => setFilter({ ...filter, availability: e.target.value })}>
            <option value="">All</option><option value="available">Available</option><option value="unavailable">Unavailable</option>
          </Select>
        </Field>
        <Field label="Sort">
          <Select value={filter.sort} onChange={(e) => setFilter({ ...filter, sort: e.target.value })}>
            <option value="newest">Newest first</option>
            <option value="title-asc">Title A–Z</option>
            <option value="title-desc">Title Z–A</option>
            <option value="author-asc">Author A–Z</option>
            <option value="year-desc">Newest year</option>
            <option value="year-asc">Oldest year</option>
          </Select>
        </Field>
      </div>

      {loading ? <Spinner /> : (
        <Table
          columns={[
            { key: "accessionNumber", header: "Acc. No" },
            { key: "title", header: "Title", render: (r) => <div><div className="font-medium">{r.title}</div><div className="text-xs text-neutral-500">{r.author}</div></div> },
            { key: "category", header: "Category", render: (r) => r.category?.name || "—" },
            { key: "isbn", header: "ISBN", render: (r) => r.isbn || "—" },
            { key: "totalCopies", header: "Total" },
            { key: "availableCopies", header: "Avail." },
            { key: "status", header: "Status", render: (r) => <Badge tone={availabilityTone(r)}>{availabilityLabel(r)}</Badge> },
            { key: "shelfLocation", header: "Shelf" },
            {
              key: "actions", header: "Actions", render: (r) => (
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link to={`/books/${r._id}/edit`} className="text-primary hover:underline">Edit</Link>
                  <Link to={`/transactions/issue?bookId=${r._id}`} className="text-status-issued hover:underline">Issue</Link>
                  {role === "admin" && (
                    <button onClick={() => setConfirm(r)} className="text-status-danger hover:underline">Delete</button>
                  )}
                </div>
              )
            },
          ]}
          rows={items}
          empty="No books match these filters."
        />
      )}

      <div className="flex justify-between text-sm text-neutral-600">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => goToPage(page - 1)} disabled={page <= 1}>Prev</Button>
          <Button variant="secondary" onClick={() => goToPage(page + 1)} disabled={page >= pages}>Next</Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title="Delete book"
        message={`Deactivate "${confirm?.title}"? It will be hidden from new issues but its transaction history is preserved.`}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          try { await softDeleteBook(confirm._id); toast.success("Book deactivated"); refresh(); }
          catch (e) { toast.error(e?.response?.data?.message || "Delete failed"); }
          setConfirm(null);
        }}
        confirmText="Deactivate"
        danger
      />
    </div>
  );
}
