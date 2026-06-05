import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createBook, uploadBookCover } from "../../api/books.api";
import { listCategories } from "../../api/categories.api";
import PageHeader from "../../components/common/PageHeader.jsx";
import { Field, Input, Textarea, Select } from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";
import Spinner from "../../components/common/Spinner.jsx";

export default function AddBook() {
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", author: "", isbn: "", category: "", publisher: "",
    yearPublished: "", edition: "", totalCopies: 1, shelfLocation: "",
    description: "", language: "English",
  });
  const [cover, setCover] = useState(null);
  const [createdId, setCreatedId] = useState(null);

  useEffect(() => {
    listCategories()
      .then((c) => { setCats(c); if (c[0]) setForm((f) => ({ ...f, category: c[0]._id })); })
      .finally(() => setLoading(false));
  }, []);

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) return toast.error("Pick a category");
    if (Number(form.totalCopies) < 1) return toast.error("Total copies must be at least 1");
    setSaving(true);
    try {
      const book = await createBook({ ...form, totalCopies: Number(form.totalCopies), yearPublished: form.yearPublished ? Number(form.yearPublished) : undefined });
      setCreatedId(book._id);
      if (cover) {
        const fd = new FormData(); fd.append("cover", cover);
        await uploadBookCover(book._id, fd);
      }
      toast.success(`Book created (${book.accessionNumber})`);
      navigate("/books", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-neutral-500"><Spinner /> Loading form…</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader title="Add New Book" subtitle="Fill the details — the accession number is auto-generated." />
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
          <Field label="Shelf Location"><Input value={form.shelfLocation} onChange={onChange("shelfLocation")} placeholder="e.g. A3-Shelf2" /></Field>
          <Field label="Language"><Input value={form.language} onChange={onChange("language")} /></Field>
        </div>
        <Field label="Description"><Textarea rows={3} value={form.description} onChange={onChange("description")} /></Field>
        <Field label="Cover Image (optional)">
          <input type="file" accept="image/jpeg,image/png" onChange={(e) => setCover(e.target.files?.[0] || null)} />
          <p className="text-xs text-neutral-500 mt-1">JPEG or PNG, max 2 MB. Uploads after the book is created.</p>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Book"}</Button>
        </div>
      </form>
    </div>
  );
}
