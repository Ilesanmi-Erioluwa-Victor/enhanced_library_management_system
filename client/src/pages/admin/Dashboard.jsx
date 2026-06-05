import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { getDashboard } from "../../api/reports.api";
import PageHeader from "../../components/common/PageHeader.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import OverdueAlert from "../../components/features/OverdueAlert.jsx";
import { formatDate } from "../../utils/formatDate.js";

const PIE_COLORS = ["#2C3E7A", "#3D54A8", "#C0882A", "#FAF0DC", "#5C6A8A", "#8A97B8", "#16A34A", "#0891B2"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [byCat, setByCat] = useState([]);
  const [top, setTop] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((d) => {
        setSummary(d.summary);
        setByCat(d.booksByCategory);
        setTop(d.topBorrowed || []);
        setMonthly((d.monthly || []).map((m) => ({
          month: `${m._id.y}-${String(m._id.m).padStart(2, "0")}`,
          Issued: m.issues,
          Returned: m.returns,
        })));
        setRecent(d.recentTxns || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-neutral-500"><Spinner /> Loading dashboard...</div>;

  const cards = [
    { label: "Unique Books", value: summary?.totalBooks?.unique ?? 0, tone: "bg-primary-pale text-primary-dark" },
    { label: "Total Copies", value: summary?.totalBooks?.copies ?? 0, tone: "bg-primary-pale text-primary-dark" },
    { label: "Members", value: summary?.totalMembers ?? 0, tone: "bg-accent-light text-accent-dark" },
    { label: "Active Issues", value: summary?.activeIssues ?? 0, tone: "bg-cyan-100 text-status-issued" },
    { label: "Overdue", value: summary?.overdue ?? 0, tone: "bg-red-100 text-status-overdue", onClick: () => navigate("/transactions/overdue") },
    { label: "Available Today", value: summary?.totalBooks?.available ?? 0, tone: "bg-green-100 text-status-success" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle={`Welcome back. Generated ${formatDate(summary?.generatedAt) || "—"}`} />

      <OverdueAlert count={summary?.overdue || 0} onView={() => navigate("/transactions/overdue")} />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div key={c.label} onClick={c.onClick} className={`card p-4 min-w-0 ${c.tone} ${c.onClick ? "cursor-pointer hover:shadow-md" : ""}`}>
            <div className="text-xs uppercase tracking-wider opacity-75">{c.label}</div>
            <div className="text-2xl xl:text-3xl font-bold mt-2 truncate">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-primary-dark mb-3">Issues vs Returns — last 12 months</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE1EF" />
                <XAxis dataKey="month" stroke="#5C6A8A" />
                <YAxis stroke="#5C6A8A" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Issued" fill="#2C3E7A" />
                <Bar dataKey="Returned" fill="#16A34A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-primary-dark mb-3">Books by category</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byCat} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80} label>
                  {byCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-primary-dark mb-3">Top 5 most borrowed books</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={top} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE1EF" />
              <XAxis type="number" stroke="#5C6A8A" allowDecimals={false} />
              <YAxis type="category" dataKey="title" stroke="#5C6A8A" width={150} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="borrowCount" fill="#C0882A" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-primary-dark mb-3">Recent transactions</h3>
        <Table
          columns={[
            { key: "transactionCode", header: "TXN" },
            { key: "title", header: "Book", render: (r) => r.book?.title || "—" },
            { key: "member", header: "Member", render: (r) => r.member ? `${r.member.firstName} ${r.member.lastName}` : "—" },
            { key: "issueDate", header: "Issued", render: (r) => formatDate(r.issueDate) },
            { key: "status", header: "Status", render: (r) => <Badge tone={r.status === "Overdue" ? "overdue" : r.status === "Returned" ? "returned" : "issued"}>{r.status}</Badge> },
          ]}
          rows={recent}
          empty="No recent transactions."
        />
      </div>
    </div>
  );
}
