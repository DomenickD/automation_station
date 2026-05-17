import { useState } from "react";
import OutputCard from "../../components/OutputCard";
import client from "../../api/client";
import { useGenerate } from "../../hooks/useGenerate";

const EMPTY_COMP = {
  selected: true,
  address: "",
  sqft: "",
  beds_baths: "",
  sale_price: "",
  dom: "",
  sale_date: "",
  source_url: "",
  evidence: "",
};

function ComparableRow({ comp, index, onChange, onRemove }) {
  function update(field, value) {
    onChange(index, { ...comp, [field]: value });
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 mb-2 relative">
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs"
      >
        Remove
      </button>

      <label className="flex items-center gap-2 pr-16 text-xs font-semibold text-gray-600 mb-2">
        <input
          type="checkbox"
          checked={comp.selected}
          onChange={(e) => update("selected", e.target.checked)}
          className="rounded border-gray-300"
        />
        Comparable #{index + 1}
      </label>

      <div className="grid grid-cols-2 gap-2">
        {[
          ["address", "Address"],
          ["sqft", "Sq Ft"],
          ["beds_baths", "Beds/Baths"],
          ["sale_price", "Sale Price"],
          ["dom", "Days on Market"],
          ["sale_date", "Sale Date"],
        ].map(([name, label]) => (
          <div key={name}>
            <label className="text-xs text-gray-500">{label}</label>
            <input
              value={comp[name] || ""}
              onChange={(e) => update(name, e.target.value)}
              className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
              placeholder={label}
            />
          </div>
        ))}
      </div>

      <div className="mt-2">
        <label className="text-xs text-gray-500">Source URL</label>
        <input
          value={comp.source_url || ""}
          onChange={(e) => update("source_url", e.target.value)}
          className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
          placeholder="https://..."
        />
      </div>

      {(comp.source_url || comp.evidence) && (
        <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
          {comp.source_url && (
            <a
              href={comp.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Verify source
            </a>
          )}
          {comp.evidence && <p className="mt-1 text-xs text-gray-500 line-clamp-3">{comp.evidence}</p>}
        </div>
      )}
    </div>
  );
}

export default function CMAGenerator() {
  const { generate, regenerate, loading, result, error } = useGenerate("/generate/re/cma");
  const [subjectProperty, setSubjectProperty] = useState("");
  const [subjectDetails, setSubjectDetails] = useState("");
  const [comps, setComps] = useState([{ ...EMPTY_COMP }, { ...EMPTY_COMP }, { ...EMPTY_COMP }]);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchMessage, setResearchMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());

    const selectedComps = comps
      .filter((comp) => comp.selected && comp.address.trim())
      .map((comp, index) => {
        const source = comp.source_url ? ` Source URL: ${comp.source_url}` : "";
        return `${index + 1}. ${comp.address} - ${comp.sqft || "unknown"} sqft, ${comp.beds_baths || "beds/baths not verified"}, sold/listed ${comp.sale_price || "price not verified"} on ${comp.sale_date || "date not verified"} (${comp.dom || "DOM not verified"}).${source}`;
      });

    data.comparables = selectedComps.join("\n");
    await generate(data);
  }

  async function researchComps() {
    setResearchMessage("");
    setResearchLoading(true);
    try {
      const res = await client.post("/generate/re/cma/research", {
        subject_property: subjectProperty,
        subject_details: subjectDetails,
        max_results: 8,
      });

      setResearchMessage(res.data.message || "");
      if (res.data.candidates?.length) {
        setComps(res.data.candidates.map((candidate) => ({ ...EMPTY_COMP, ...candidate })));
      }
    } catch (err) {
      setResearchMessage(err.response?.data?.detail || "Comparable research failed. Use manual comps for now.");
    } finally {
      setResearchLoading(false);
    }
  }

  function updateComp(index, nextComp) {
    setComps((current) => current.map((comp, i) => (i === index ? nextComp : comp)));
  }

  function removeComp(index) {
    setComps((current) => current.filter((_, i) => i !== index));
  }

  function addComp() {
    setComps((current) => [...current, { ...EMPTY_COMP }]);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">CMA Narrative Generator</h1>
      <p className="text-sm text-gray-500 mb-6">
        Generate polished written narratives for Comparative Market Analyses.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <OutputCard output={result.output} documentId={result.document_id} onRegenerate={regenerate} loading={loading} />
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Subject Property Address <span className="text-red-500">*</span>
          </label>
          <input
            name="subject_property"
            required
            value={subjectProperty}
            onChange={(e) => setSubjectProperty(e.target.value)}
            placeholder="789 Pine St, Austin, TX 78702"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject Property Details <span className="text-red-500">*</span>
          </label>
          <textarea
            name="subject_details"
            required
            value={subjectDetails}
            onChange={(e) => setSubjectDetails(e.target.value)}
            rows={2}
            placeholder="3BR/2BA, 1850 sqft, updated kitchen, 2005..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="block text-sm font-medium text-gray-700">Comparable Sales</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={researchComps}
                disabled={researchLoading || !subjectProperty || !subjectDetails}
                className="text-xs text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {researchLoading ? "Researching..." : "Research comps"}
              </button>
              <button type="button" onClick={addComp} className="text-xs text-blue-600 hover:underline">
                + Add Comparable
              </button>
            </div>
          </div>

          {researchMessage && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {researchMessage}
            </div>
          )}

          {comps.map((comp, index) => (
            <ComparableRow
              key={index}
              comp={comp}
              index={index}
              onChange={updateComp}
              onRemove={removeComp}
            />
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Market Trend Notes</label>
          <textarea
            name="market_notes"
            rows={2}
            placeholder="Inventory is low, prices rising 5% YoY..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recommended List Price Range <span className="text-red-500">*</span>
          </label>
          <input
            name="price_range"
            required
            placeholder="$470,000 - $485,000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60"
          style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
        >
          {loading ? "Generating CMA..." : "Generate CMA Narrative"}
        </button>
      </form>
    </div>
  );
}
