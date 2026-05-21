import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import client from "../../api/client";

export default function ContractList() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  async function fetchContracts() {
    setLoading(true);
    try {
      const res = await client.get("/contracts");
      setContracts(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load contracts");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this contract?")) return;
    try {
      await client.delete(`/contracts/${id}`);
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert("Failed to delete contract");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contracts & Agreements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create, manage, and execute branded agreements with electronic signatures.
          </p>
        </div>
        <Link
          to="/re/contracts/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
        >
          <Icon icon="lucide:plus" className="h-4.5 w-4.5" />
          New Contract
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Icon icon="svg-spinners:ring-resize" className="h-10 w-10 text-blue-600 animate-spin" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
            <Icon icon="lucide:file-text" className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-950 dark:text-gray-50 mb-1">No contracts generated yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
            Generate your first Listing Agreement or Buyer Broker Agreement to get started.
          </p>
          <Link
            to="/re/contracts/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
          >
            Create Contract
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Title / Address</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Signatures</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm text-gray-700 dark:text-gray-300">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-950 dark:text-gray-50">
                      <Link to={`/re/contracts/${c.id}`} className="hover:underline">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {c.contract_type === "listing_agreement" ? "Listing Agreement" : "Buyer Broker Agreement"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          c.status === "signed"
                            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
                            : "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            c.status === "signed" ? "bg-green-600" : "bg-blue-600"
                          }`}
                        />
                        {c.status === "signed" ? "Signed" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {c.signed_count} / {c.required_signatures} signed
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/re/contracts/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                      >
                        <Icon icon="lucide:eye" className="h-4 w-4" />
                        View
                      </Link>
                      {c.pdf_url && (
                        <a
                          href={`${client.defaults.baseURL}${c.pdf_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium hover:underline"
                        >
                          <Icon icon="lucide:download" className="h-4 w-4" />
                          PDF
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium hover:underline"
                      >
                        <Icon icon="lucide:trash" className="h-4 w-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
