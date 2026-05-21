import { useEffect, useState } from "react";
import client from "../../api/client";

export default function COBotManager() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", services: "", service_area: "", pricing_ranges: "", scheduling_process: "", warranty_policy: "", free_estimates: "", licensed_insured: "" });
  const [copied, setCopied] = useState(null);

  useEffect(() => { fetchBots(); }, []);

  async function fetchBots() {
    try { const r = await client.get("/bots"); setBots(r.data); } catch {}
  }

  async function createBot() {
    setLoading(true);
    try {
      await client.post("/bots", {
        name: form.name || "Service FAQ Bot",
        context_data: {
          services_offered: form.services,
          service_area: form.service_area,
          pricing_ranges: form.pricing_ranges,
          scheduling_process: form.scheduling_process,
          warranty_and_guarantee: form.warranty_policy,
          free_estimates: form.free_estimates,
          licensed_and_insured: form.licensed_insured,
        },
      });
      setShowForm(false);
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Service FAQ Chatbot</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Beta
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Deploy a customer-facing bot to your website. <span className="text-amber-600 font-medium">(Note: This feature is currently in Beta and not completely finished)</span>
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm text-white font-medium rounded-lg" style={{ backgroundColor: "var(--brand-color, #2563eb)" }}>
          + New Bot
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-gray-800">Configure Service Bot</h2>
          {[
            ["name", "Bot Name", "Smith Roofing FAQ Bot"],
            ["services", "Services Offered", "Roofing, gutters, attic insulation"],
            ["service_area", "Service Area", "Austin TX and surrounding areas within 50 miles"],
            ["pricing_ranges", "Pricing Ranges", "Roof replacement $8,000–15,000, gutter cleaning $150–300"],
            ["scheduling_process", "Scheduling Process", "Call or text to schedule a free estimate within 2 business days"],
            ["warranty_policy", "Warranty & Guarantee", "2-year workmanship warranty on all jobs"],
            ["free_estimates", "Free Estimates?", "Yes, always free with no obligation"],
            ["licensed_insured", "Licensed & Insured?", "Yes, TX License #12345, $1M general liability"],
          ].map(([key, label, placeholder]) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700">{label}</label>
              <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          ))}
          <div className="flex gap-3 mt-4">
            <button onClick={createBot} disabled={loading} className="px-4 py-2 text-sm text-white rounded-lg" style={{ backgroundColor: "var(--brand-color, #2563eb)" }}>
              {loading ? "Creating..." : "Create Bot"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {bots.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🤖</p>
          <p>No bots yet. Create one to handle customer FAQs 24/7.</p>
        </div>
      )}

      <div className="space-y-3">
        {bots.map((bot) => (
          <div key={bot.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{bot.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Created {new Date(bot.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => copyEmbed(bot.embed_token)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                {copied === bot.embed_token ? "Copied!" : "Copy Embed"}
              </button>
              <button onClick={() => deleteBot(bot.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
