import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import client from "../../api/client";

const MODULE_LABELS = {
  re_listing: "Listing Description",
  re_email: "RE Email",
  re_cma: "CMA Narrative",
  co_proposal: "Proposal",
  co_sow: "Scope of Work",
  co_email: "Contractor Email",
  co_completion: "Completion Letter",
  co_job_brief: "Job Brief",
};

export default function History() {
  const [docs, setDocs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = filter ? `/documents?module=${filter}&limit=50` : "/documents?limit=50";
    setLoading(true);
    client.get(url).then((r) => { setDocs(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [filter]);

  async function handleDelete(id) {
    if (!confirm("Delete this document?")) return;
    await client.delete(`/documents/${id}`);
    setDocs(docs.filter((d) => d.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function copy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Document History</h1>
          <p className="text-sm text-gray-500 mt-1">All your generated documents.</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="">All Types</option>
          {Object.entries(MODULE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {loading && <p className="text-sm text-gray-400">Loading...</p>}
          {!loading && docs.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">📄</p>
              <p>No documents yet. Generate something to see it here.</p>
            </div>
          )}
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelected(doc)}
              className={`w-full text-left rounded-xl border p-4 hover:shadow-sm transition-all ${selected?.id === doc.id ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">{MODULE_LABELS[doc.module] || doc.module}</span>
                <span className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-800 mt-1 line-clamp-2">{doc.output_text.replace(/[#*]/g, "").slice(0, 120)}...</p>
              {doc.version > 1 && <span className="text-xs text-blue-500 mt-1 block">Version {doc.version}</span>}
            </button>
          ))}
        </div>

        {selected && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-4 h-fit max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">{MODULE_LABELS[selected.module]}</span>
              <div className="flex gap-2">
                <button onClick={() => copy(selected.output_text)} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50">
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button onClick={() => handleDelete(selected.id)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none text-gray-800">
              <ReactMarkdown>{selected.output_text}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
