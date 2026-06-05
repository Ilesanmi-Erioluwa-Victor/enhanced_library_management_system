import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import useOverdueCount from "../../hooks/useOverdueCount";
import { useLayout } from "../../context/LayoutContext";

const adminLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/books", label: "Books" },
  { to: "/members", label: "Members" },
  { to: "/transactions/issue", label: "Issue Book" },
  { to: "/transactions/return", label: "Return Book" },
  { to: "/transactions", label: "Transactions" },
  { to: "/transactions/overdue", label: "Overdue" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/audit-logs", label: "Audit Logs" },
  { to: "/admin/settings", label: "Settings" },
  { to: "/profile", label: "Profile" },
];

const librarianLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/books", label: "Books" },
  { to: "/books/new", label: "Add Book" },
  { to: "/members", label: "Members" },
  { to: "/members/new", label: "Register Member" },
  { to: "/transactions/issue", label: "Issue Book" },
  { to: "/transactions/return", label: "Return Book" },
  { to: "/transactions", label: "Transactions" },
  { to: "/transactions/overdue", label: "Overdue" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/profile", label: "Profile" },
];

const memberLinks = [
  { to: "/my-books", label: "My Books" },
  { to: "/my-fines", label: "My Fines" },
  { to: "/my-history", label: "My History" },
  { to: "/profile", label: "Profile" },
];

export default function Sidebar() {
  const { role } = useAuth();
  const { count: overdueCount } = useOverdueCount();
  const { mobileOpen, closeMobile } = useLayout();

  const links =
    role === "admin" ? adminLinks :
    role === "librarian" ? librarianLinks :
    role === "member" ? memberLinks : [];

  return (
    <>
      <div
        onClick={closeMobile}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 md:w-60 md:top-14 md:h-[calc(100vh-3.5rem)] bg-primary-dark text-white shadow-lg md:shadow-none transform transition-transform duration-200 ease-in-out md:transform-none md:transition-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-primary-light/30">
          <span className="text-lg font-semibold tracking-wide">
            <span className="text-accent">L</span>ibrary MS
          </span>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation"
            className="inline-flex items-center justify-center w-9 h-9 rounded hover:bg-primary-light/30 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-3.5rem)] md:h-full">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={closeMobile}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm transition ${
                  isActive ? "bg-primary-light text-white" : "text-neutral-200 hover:bg-primary-light/30"
                }`
              }
            >
              <span className="flex items-center justify-between">
                <span>{l.label}</span>
                {l.to === "/transactions/overdue" && overdueCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-status-danger text-white text-xs">
                    {overdueCount}
                  </span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
