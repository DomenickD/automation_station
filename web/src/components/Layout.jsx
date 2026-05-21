import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTenant } from "../config/tenant";
import { useDarkMode } from "../hooks/useDarkMode";
import { REAL_ESTATE_MODULES, CONTRACT_MODULES } from "../pages/real-estate/moduleConfigs";
import { useGenerationQueue } from "../hooks/useGenerationQueue";

function moduleLink(slug) {
  const module = REAL_ESTATE_MODULES.find((item) => item.slug === slug);
  return module ? { to: module.path, label: module.label, description: module.description } : null;
}

const RE_NAV_GROUPS = [
  {
    id: "listings",
    label: "Listings",
    items: [
      { to: "/re/saved-listings", label: "Saved Listings", description: "Save and revisit properties for client comparisons and follow-up." },
      { to: "/re/listing", label: "Listing Generator", description: "Generate professional MLS listing descriptions from property details." },
      moduleLink("property-faq"),
      moduleLink("virtual-staging"),
      moduleLink("just-listed"),
      moduleLink("price-reduction"),
      { to: "/re/bots", label: "Property Bots", description: "Deploy AI-powered chatbots for individual property listings." },
    ],
  },
  {
    id: "market",
    label: "Market Prep",
    items: [
      { to: "/re/cma", label: "CMA Narrative", description: "Create a narrative summary for a Comparative Market Analysis report." },
      moduleLink("neighborhood"),
      moduleLink("appointment"),
      moduleLink("competitive"),
    ],
  },
  {
    id: "clients",
    label: "Client Workflows",
    items: [
      { to: "/re/email", label: "Email Drafter", description: "Draft professional emails for buyers, sellers, and prospects." },
      moduleLink("timeline"),
      moduleLink("seller-update"),
      moduleLink("buyer-consult"),
      moduleLink("offer-letter"),
    ],
  },
  {
    id: "leads",
    label: "Lead Outreach",
    items: [
      { to: "/re/leads", label: "Chatbot Leads", description: "Monitor leads and chat transcripts captured by property chatbots." },
      moduleLink("expired-outreach"),
      moduleLink("soi-campaign"),
      moduleLink("open-house-followup"),
      moduleLink("referral"),
    ],
  },
  {
    id: "agent",
    label: "Agent Growth",
    items: [
      moduleLink("business-plan"),
      moduleLink("bio"),
      moduleLink("testimonial"),
    ],
  },
  {
    id: "contracts",
    label: "Contracts",
    items: [
      { to: "/re/contracts", label: "Contracts List", description: "View and manage listing and buyer broker agreements." },
      { to: "/re/contracts/new", label: "New Contract", description: "Draft a listing agreement or buyer broker agreement." },
    ],
  },
].map((group) => ({
  ...group,
  items: group.items.filter(Boolean),
}));

const CO_NAV = [
  { to: "/co/proposal", label: "Proposal Writer", description: "Generate detailed project proposals for prospective clients." },
  { to: "/co/sow", label: "Scope of Work", description: "Define project deliverables, tasks, and technical requirements." },
  { to: "/co/email", label: "Email Drafter", description: "Draft professional project communications and client emails." },
  { to: "/co/job-brief", label: "Job Brief", description: "Summarize a job clearly for your team or subcontractors." },
  { to: "/co/completion", label: "Completion Letter", description: "Generate a project completion certificate or sign-off letter." },
  ...CONTRACT_MODULES.map((module) => ({ to: module.path, label: module.label, description: module.description })),
  { to: "/co/bots", label: "Service Chatbot", description: "Deploy a chatbot to handle client FAQs and service inquiries." },
];

const SHARED_NAV = [
  { to: "/history", label: "Document History", description: "View and reopen all previously generated documents." },
  { to: "/usage", label: "Usage Dashboard", description: "Monitor your AI usage and remaining credits." },
  { to: "/settings", label: "Settings", description: "Manage account, branding, and tenant preferences." },
];

function InfoTooltip({ description }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  if (!description) return null;

  function handleMouseEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({ x: rect.right + 8, y: rect.top + rect.height / 2 });
    }
    setVisible(true);
  }

  return (
    <span
      ref={ref}
      className="ml-auto flex-shrink-0 cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
      onClick={(e) => e.preventDefault()}
    >
      <Icon icon="mdi:information-outline" className="w-3.5 h-3.5 opacity-50 hover:opacity-100 transition-opacity" />
      {visible && createPortal(
        <div
          className="fixed z-[9999] w-48 -translate-y-1/2 rounded-md bg-gray-900 px-2.5 py-2 text-xs text-white shadow-lg pointer-events-none"
          style={{ left: coords.x, top: coords.y }}
        >
          {description}
        </div>,
        document.body
      )}
    </span>
  );
}

function NavItem({ item, nested = false }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg text-sm mb-0.5 transition-colors ${
          nested ? "px-3 py-1.5 ml-3" : "px-3 py-2"
        } ${
          isActive
            ? "text-white font-medium"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`
      }
      style={({ isActive }) =>
        isActive ? { backgroundColor: "var(--brand-color, #2563eb)" } : {}
      }
    >
      <span className="flex-1 min-w-0 truncate">{item.label}</span>
      <InfoTooltip description={item.description} />
    </NavLink>
  );
}

function NavGroup({ group, currentPath }) {
  const hasActiveChild = group.items.some((item) => currentPath === item.to);
  const [open, setOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
          hasActiveChild
            ? "text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
        aria-expanded={open}
      >
        <span>{group.label}</span>
        <Icon icon={open ? "mdi:chevron-down" : "mdi:chevron-right"} className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="mt-1 border-l border-gray-200 dark:border-gray-700 ml-2 pl-1">
          {group.items.map((item) => (
            <NavItem key={item.to} item={item} nested />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const tenant = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, setDark] = useDarkMode();
  const { activeCount } = useGenerationQueue();

  const isContracting = tenant?.vertical === "contracting";
  const navItems = isContracting ? CO_NAV : [];

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

        {activeCount > 0 && (
          <div className="mx-3 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-300 font-medium truncate">
              {activeCount === 1 ? "Generating…" : `${activeCount} generating…`}
            </span>
          </div>
        )}

        <nav className="flex-1 p-3 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">
            {tenant?.vertical === "contracting" ? "Contracting Tools" : "Real Estate Tools"}
          </p>
          {isContracting
            ? navItems.map((item) => <NavItem key={item.to} item={item} />)
            : RE_NAV_GROUPS.map((group) => (
                <NavGroup key={group.id} group={group} currentPath={location.pathname} />
              ))}

          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2 mt-4">
            Account
          </p>
          {SHARED_NAV.map((item) => <NavItem key={item.to} item={item} />)}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg mb-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span>{dark ? "Light Mode" : "Dark Mode"}</span>
            <Icon icon={dark ? "mdi:white-balance-sunny" : "mdi:moon-waning-crescent"} className="text-lg" />
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
