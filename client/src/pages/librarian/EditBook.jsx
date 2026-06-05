import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getBook, updateBook, uploadBookCover } from "../../api/books.api";
import { listCategories } from "../../api/categories.api";
import PageHeader from "../../components/common/PageHeader.jsx";
import { Field, Input, Textarea, Select } from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";

export default function EditBook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [cover, setCover] = useState(null);

  useEffect(() => {
    Promise.all([getBook(id), listCategories()])
      .then(([{ book }, cs]) => {
        setForm({
          title: book.title, author: book.author, isbn: book.isbn || "",
          category: book.category?._id || book.category || "",
          publisher: book.publisher || "", yearPublished: book.yearPublished || "",
          edition: book.edition || "", totalCopies: book.totalCopies, shelfLocation: book.shelfLocation || "",
          description: book.description || "", language: book.language || "English", isActive: book.isActive,
        });
        setCats(cs);
      })
      .catch((e) => toast.error(e?.response?.data?.message || "Failed to load book"))
      .finally(() => setLoading(false));
  }, [id]);

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateBook(id, { ...form, totalCopies: Number(form.totalCopies), yearPublished: form.yearPublished ? Number(form.yearPublished) : undefined });
      if (cover) { const fd = new FormData(); fd.append("cover", cover); await uploadBookCover(id, fd); }
      toast.success("Book updated");
      navigate("/books", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <div className="flex items-center gap-2 text-neutral-500"><Spinner /> Loading…</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader title="Edit Book" subtitle="Update fields and save." />
      <form onSubmit={onSubmit} className="card p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Title"><Input value={form.title} onChange={onChange("title")} required /></Field>
          <Field label="Author"><Input value={form.author} onChange={onChange("author")} required /></Field>
          <Field label="ISBN"><Input value={form.isbn} onChange={onChange("isbn")} /></Field>
          <Field label="Category">
            <Select value={form.category} onChange={onChange("category")} required>
              <option value="">Select…</option>
              {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Publisher"><Input value={form.publisher} onChange={onChange("publisher")} /></Field>
          <Field label="Year Published"><Input type="number" value={form.yearPublished} onChange={onChange("yearPublished")} /></Field>
          <Field label="Edition"><Input value={form.edition} onChange={onChange("edition")} /></Field>
          <Field label="Total Copies"><Input type="number" min="1" value={form.totalCopies} onChange={onChange("totalCopies")} required /></Field>
          <Field label="Shelf Location"><Input value={form.shelfLocation} onChange={onChange("shelfLocation")} /></Field>
          <Field label="Language"><Input value={form.language} onChange={onChange("language")} /></Field>
        </div>
        <Field label="Description"><Textarea rows={3} value={form.description} onChange={onChange("description")} /></Field>
        <Field label="Replace cover image (optional)">
          <input type="file" accept="image/jpeg,image/png" onChange={(e) => setCover(e.target.files?.[0] || null)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Active (uncheck to deactivate)
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}
