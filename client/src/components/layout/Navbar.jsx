import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useLayout } from "../../context/LayoutContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toggleMobile } = useLayout();

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      className="fixed top-0 inset-x-0 bg-primary-dark text-white shadow z-30"
      style={{ height: "var(--navbar-height, 3.5rem)" }}
    >
      <div
        className="flex items-center justify-between px-4 sm:px-6 w-full"
        style={{ height: "var(--navbar-height, 3.5rem)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={toggleMobile}
            aria-label="Toggle navigation"
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded hover:bg-primary-light/30 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/" className="text-lg font-semibold tracking-wide truncate">
            <span className="text-accent">L</span>ibrary MS
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-sm">
          <span className="hidden sm:inline text-neutral-200 truncate max-w-[40vw]">
            {user?.fullName} <span className="text-accent">({user?.role})</span>
          </span>
          <button
            onClick={onLogout}
            className="rounded bg-accent px-3 py-1 text-primary-dark font-medium hover:bg-accent-dark hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
