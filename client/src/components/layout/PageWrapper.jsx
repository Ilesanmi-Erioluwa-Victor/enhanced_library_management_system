import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";

export default function PageWrapper({ children }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 overflow-x-hidden">
      <Navbar />
      <Sidebar />
      <div
        className="min-h-screen w-full max-w-full relative"
        style={{
          paddingTop: "var(--navbar-height, 3.5rem)",
          paddingLeft: "var(--sidebar-width, 0px)",
        }}
      >
        <div className="px-4 sm:px-6 py-4 sm:py-6 w-full max-w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
