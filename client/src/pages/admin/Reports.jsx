import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { getSummary, getBooksByCategory, getTopBorrowed, getMonthlyIssues, exportBooksPDF, exportMembersPDF, exportOverduePDF, exportTransactionsPDF } from "../../api/reports.api";
import PageHeader from "../../components/common/PageHeader.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import Button from "../../components/common/Button.jsx";
import { Field, Input } from "../../components/common/Input.jsx";
import { formatNGN } from "../../utils/formatCurrency.js";

const PIE_COLORS = ["#2C3E7A", "#3D54A8", "#C0882A", "#FAF0DC", "#5C6A8A", "#8A97B8", "#16A34A", "#0891B2"];

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [byCat, setByCat] = useState([]);
  const [top, setTop] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([getSummary(), getBooksByCategory(), getTopBorrowed(), getMonthlyIssues()])
      .then(([s, bc, tb, mi]) => {
        setSummary(s); setByCat(bc); setTop(tb);
        setMonthly((mi || []).map((m) => ({
          month: `${m._id.y}-${String(m._id.m).padStart(2, "0")}`,
          Issued: m.issues, Returned: m.returns,
        })));
      })
      .finally(() => setLoading(false));
  }, []);

  const onExport = async (kind) => {
    setExporting(true);
    try {
      let blob, name;
      if (kind === "books")      { blob = await exportBooksPDF(); name = "book-catalogue.pdf"; }
      else if (kind === "members"){ blob = await exportMembersPDF(); name = "member-list.pdf"; }
      else if (kind === "overdue"){ blob = await exportOverduePDF(); name = "overdue-report.pdf"; }
      else if (kind === "transactions") {
        if (!range.startDate || !range.endDate) { toast.error("Pick a date range first"); return; }
        blob = await exportTransactionsPDF(range); name = "transaction-history.pdf";
      }
      downloadBlob(blob, name);
      toast.success("Downloaded");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-neutral-500"><Spinner /> Loading reports...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Library statistics, charts, and PDF exports." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        {[
          { label: "Total Books", value: summary?.totalBooks?.unique },
          { label: "Total Members", value: summary?.totalMembers },
          { label: "Active Issues", value: summary?.activeIssues },
          { label: "Overdue", value: summary?.overdue },
        ].map((c) => (
          <div key={c.label} className="card p-4 bg-primary-pale text-primary-dark">
            <div className="text-xs uppercase opacity-75">{c.label}</div>
            <div className="text-3xl font-bold mt-2">{c.value ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-primary-dark mb-3">Books by category</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byCat} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80} label>
                  {byCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-primary-dark mb-3">Top 10 most borrowed</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={top} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE1EF" />
                <XAxis type="number" stroke="#5C6A8A" allowDecimals={false} />
                <YAxis type="category" dataKey="title" stroke="#5C6A8A" width={150} tick={{ fontSize: 12 }} />
                <Tooltip /><Bar dataKey="borrowCount" fill="#C0882A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-primary-dark mb-3">Monthly issues & returns</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE1EF" />
              <XAxis dataKey="month" stroke="#5C6A8A" />
              <YAxis stroke="#5C6A8A" allowDecimals={false} />
              <Tooltip /><Legend />
              <Bar dataKey="Issued" fill="#2C3E7A" />
              <Bar dataKey="Returned" fill="#16A34A" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-primary-dark mb-3">Export PDF</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button onClick={() => onExport("books")} disabled={exporting}>📚 Book Catalogue</Button>
          <Button onClick={() => onExport("members")} disabled={exporting}>👥 Member List</Button>
          <Button onClick={() => onExport("overdue")} disabled={exporting}>⏰ Overdue Report</Button>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="From"><Input type="date" value={range.startDate} onChange={(e) => setRange({ ...range, startDate: e.target.value })} /></Field>
              <Field label="To"><Input type="date" value={range.endDate} onChange={(e) => setRange({ ...range, endDate: e.target.value })} /></Field>
            </div>
            <Button onClick={() => onExport("transactions")} disabled={exporting} className="w-full">📄 Transaction History</Button>
          </div>
        </div>
        <p className="text-xs text-neutral-500 mt-3">All exports are generated server-side as PDF using pdfkit.</p>
      </div>
    </div>
  );
}
