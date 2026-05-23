import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTenant } from "../config/tenant";
import UsageBar from "../components/UsageBar";
import client from "../api/client";

const RE_MODULES = [
  { to: "/re/listing", label: "Listing Generator", desc: "MLS-ready descriptions in 30 seconds" },
  { to: "/re/email", label: "Email Drafter", desc: "Buyer/seller emails for every scenario" },
  { to: "/re/cma", label: "CMA Narrative", desc: "Polished market analysis summaries" },
  { to: "/re/rpr", label: "Full RPR Report", desc: "One-stop property resource packet" },
  { to: "/re/bots", label: "Property Bots", desc: "24/7 Q&A chatbots for listings" },
];

const CO_MODULES = [
  { to: "/co/proposal", label: "Proposal Writer", desc: "Professional branded proposals" },
  { to: "/co/sow", label: "Scope of Work", desc: "Detailed SOWs with exclusions" },
  { to: "/co/email", label: "Email Drafter", desc: "Customer communications for every stage" },
  { to: "/co/job-brief", label: "Job Brief", desc: "Daily crew briefings, text-ready" },
  { to: "/co/completion", label: "Completion Letter", desc: "Job close docs with warranty cert" },
  { to: "/co/bots", label: "Service Chatbot", desc: "FAQ bot for your website" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const tenant = useTenant();
  const [usage, setUsage] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);

  const modules = tenant?.vertical === "contracting" ? CO_MODULES : RE_MODULES;

  useEffect(() => {
    client.get("/usage/summary").then((r) => setUsage(r.data)).catch(() => {});
    client.get("/documents?limit=5").then((r) => setRecentDocs(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{tenant?.company_name}</p>
      </div>

      {usage && (
        <div className="mb-6">
          <UsageBar
            used={usage.tokens_this_month}
            limit={usage.monthly_limit}
            percent={usage.percent_used}
          />
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modules.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <p className="font-semibold text-gray-900 group-hover:text-blue-600 text-sm">{m.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {recentDocs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Documents</h2>
            <Link to="/history" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                to={`/history`}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">{moduleLabel(doc.module)}</span>
                  <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">
                    {doc.output_text.slice(0, 80)}...
                  </p>
                </div>
                <span className="text-xs text-gray-400 ml-4 shrink-0">
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function moduleLabel(module) {
  const map = {
    re_listing: "Listing Description",
    re_email: "RE Email",
    re_cma: "CMA Narrative",
    re_rpr: "Full RPR Report",
    co_proposal: "Proposal",
    co_sow: "Scope of Work",
    co_email: "Contractor Email",
    co_completion: "Completion Letter",
    co_job_brief: "Job Brief",
  };
  return map[module] || module;
}
