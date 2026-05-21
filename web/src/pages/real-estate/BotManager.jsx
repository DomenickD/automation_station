import { useEffect, useState } from "react";
import client from "../../api/client";
import AddressSearch from "../../components/AddressSearch";
import Stepper from "../../components/Stepper";

export default function BotManager() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", beds: "", baths: "", price: "", hoa: "", schools: "", showing_instructions: "", seller_notes: "" });
  const [copied, setCopied] = useState(null);

  useEffect(() => { fetchBots(); }, []);

  async function fetchBots() {
    try { const r = await client.get("/bots"); setBots(r.data); } catch {}
  }

  async function createBot() {
    setLoading(true);
    try {
      await client.post("/bots", {
        name: form.name || `${form.address} Bot`,
        context_data: {
          property_address: form.address,
          bedrooms_bathrooms: [form.beds && `${form.beds}BR`, form.baths && `${form.baths}BA`].filter(Boolean).join(" / "),
          list_price: form.price,
          hoa_info: form.hoa,
          school_district: form.schools,
          showing_instructions: form.showing_instructions,
          seller_notes: form.seller_notes,
        },
      });
      setShowForm(false);
      setForm({ name: "", address: "", beds: "", baths: "", price: "", hoa: "", schools: "", showing_instructions: "", seller_notes: "" });
      await fetchBots();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to create bot");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBot(id) {
    if (!confirm("Delete this bot?")) return;
    await client.delete(`/bots/${id}`);
    fetchBots();
  }

  function copyEmbed(token) {
    const origin = window.location.origin;
    const snippet = `<script src="${origin}/embed.js" data-token="${token}"></script>`;
    navigator.clipboard.writeText(snippet);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Property Chatbots</h1>
          <p className="text-sm text-gray-500 mt-1">Create 24/7 Q&A bots for your listings.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm text-white font-medium rounded-lg"
          style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
        >
          + New Bot
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Create Property Bot</h2>
          <div className="space-y-3">
            {[
              ["name", "Bot Name (optional)", "123 Oak Ave Bot"],
              ["price", "List Price", "$485,000"],
              ["hoa", "HOA Info", "$150/mo — covers landscaping"],
              ["schools", "School District", "Eanes ISD — top rated"],
              ["showing_instructions", "Showing Instructions", "Call agent 1 hr ahead, no showings after 8pm"],
              ["seller_notes", "Seller Notes / Highlights", "New roof 2023, all appliances stay"],
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <label className="text-sm text-gray-700 font-medium">{label}</label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="text-sm text-gray-700 font-medium">Property Address</label>
              <div className="mt-1">
                <AddressSearch
                  value={form.address}
                  onChange={(val) => setForm((prev) => ({ ...prev, address: val }))}
                  placeholder="123 Oak Ave, Austin TX"
                />
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <label className="text-sm text-gray-700 font-medium block mb-1">Bedrooms</label>
                <Stepper value={form.beds} min={1} max={10} step={1} onChange={(val) => setForm((prev) => ({ ...prev, beds: val }))} />
              </div>
              <div>
                <label className="text-sm text-gray-700 font-medium block mb-1">Bathrooms</label>
                <Stepper value={form.baths} min={1} max={8} step={0.5} onChange={(val) => setForm((prev) => ({ ...prev, baths: val }))} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={createBot} disabled={loading} className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60" style={{ backgroundColor: "var(--brand-color, #2563eb)" }}>
              {loading ? "Creating..." : "Create Bot"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {bots.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🤖</p>
          <p>No bots yet. Create one for a listing!</p>
        </div>
      )}

      <div className="space-y-3">
        {bots.map((bot) => (
          <div key={bot.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{bot.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Token: {bot.embed_token.slice(0, 12)}...</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyEmbed(bot.embed_token)}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  {copied === bot.embed_token ? "Copied!" : "Copy Embed"}
                </button>
                <button onClick={() => deleteBot(bot.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
