import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTenant } from "../config/tenant";
import { useDarkMode } from "../hooks/useDarkMode";
import { REAL_ESTATE_MODULES, CONTRACT_MODULES } from "../pages/real-estate/moduleConfigs";

const RE_NAV = [
  { to: "/re/listing", label: "Listing Generator" },
  { to: "/re/email", label: "Email Drafter" },
  { to: "/re/cma", label: "CMA Narrative" },
  ...REAL_ESTATE_MODULES.map((module) => ({ to: module.path, label: module.label })),
  { to: "/re/bots", label: "Property Bots" },
];

const CO_NAV = [
  { to: "/co/proposal", label: "Proposal Writer" },
  { to: "/co/sow", label: "Scope of Work" },
  { to: "/co/email", label: "Email Drafter" },
  { to: "/co/job-brief", label: "Job Brief" },
  { to: "/co/completion", label: "Completion Letter" },
  ...CONTRACT_MODULES.map((module) => ({ to: module.path, label: module.label })),
  { to: "/co/bots", label: "Service Chatbot" },
];

const SHARED_NAV = [
  { to: "/history", label: "Document History" },
  { to: "/usage", label: "Usage Dashboard" },
  { to: "/settings", label: "Settings" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const tenant = useTenant();
  const navigate = useNavigate();
  const [dark, setDark] = useDarkMode();

  const navItems = tenant?.vertical === "contracting" ? CO_NAV : RE_NAV;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.company_name} className="h-8 object-contain" />
          ) : (
            <span className="text-lg font-bold" style={{ color: "var(--brand-color, #2563eb)" }}>
              {tenant?.company_name || "Automation Station"}
            </span>
          )}
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">
            {tenant?.vertical === "contracting" ? "Contracting Tools" : "Real Estate Tools"}
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                  isActive
                    ? "text-white font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
              style={({ isActive }) =>
                isActive ? { backgroundColor: "var(--brand-color, #2563eb)" } : {}
              }
            >
              {item.label}
            </NavLink>
          ))}

          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2 mt-4">
            Account
          </p>
          {SHARED_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                  isActive
                    ? "text-white font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
              style={({ isActive }) =>
                isActive ? { backgroundColor: "var(--brand-color, #2563eb)" } : {}
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg mb-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span>{dark ? "Light Mode" : "Dark Mode"}</span>
            <span className="text-base leading-none">{dark ? "☀️" : "🌙"}</span>
          </button>
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name || user?.email}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        <div className="max-w-3xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
