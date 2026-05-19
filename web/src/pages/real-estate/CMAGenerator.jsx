import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import OutputCard from "../../components/OutputCard";
import ListingSelector from "../../components/ListingSelector";
import client from "../../api/client";
import { useGenerate } from "../../hooks/useGenerate";

// ─────────────────────────── constants ──────────────────────────────

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
  is_subject_property: false,
  similarity_score: 0,
};

const PROPERTY_TYPES = ["Single Family", "Condo", "Townhouse", "Multi-Family", "Villa", "Land"];
const GARAGE_OPTIONS = ["None", "1-Car", "2-Car", "3+ Car"];
const CONDITION_OPTIONS = ["Original", "Updated", "Fully Renovated", "New Construction"];
const EXTRA_FEATURES = ["Pool", "Solar Panels", "Hardwood Floors", "Updated Kitchen", "Updated Bathrooms", "Screened Porch", "Fenced Yard", "Waterfront"];

// ──────────────────────── address autocomplete ──────────────────────

function AddressSearch({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleInput(e) {
    const val = e.target.value;
    onChange(val);
    clearTimeout(timerRef.current);
    if (val.length < 4) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=6&countrycodes=us`,
          { headers: { "Accept-Language": "en-US,en" } }
        );
        const data = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch { /* network unavailable, ignore */ }
    }, 420);
  }

  function pick(displayName) {
    onChange(displayName);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="789 Pine St, Austin, TX 78702"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 text-sm pr-9"
        />
        <Icon icon="mdi:magnify" className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.place_id}>
              <button
                type="button"
                onMouseDown={() => pick(s.display_name)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs leading-snug border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────── structured property details ─────────────────────

function Stepper({ label, value, min = 0, max = 10, step = 1, onChange }) {
  const num = parseFloat(value) || 0;

  function handleInput(e) {
    const raw = e.target.value;
    // Allow empty string while typing
    if (raw === "" || raw === ".") { onChange(raw); return; }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) onChange(String(Math.min(max, Math.max(min, parsed))));
  }

  return (
    <div>
      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(String(Math.max(min, num - step)))}
          className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">−</button>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleInput}
          placeholder="—"
          className="w-10 text-center text-sm font-semibold text-gray-800 dark:text-gray-100 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
        />
        <button type="button" onClick={() => onChange(String(Math.min(max, num + step)))}
          className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">+</button>
      </div>
    </div>
  );
}

function PropertyDetailsForm({ value, onChange }) {
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [propType, setPropType] = useState("Single Family");
  const [garage, setGarage] = useState("None");
  const [yearBuilt, setYearBuilt] = useState("");
  const [sqft, setSqft] = useState("");
  const [condition, setCondition] = useState("Updated");
  const [features, setFeatures] = useState([]);

  function toggleFeature(f) {
    setFeatures((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }

  useEffect(() => {
    const parts = [];
    if (beds) parts.push(`${beds}BR`);
    if (baths) parts.push(`${baths}BA`);
    if (sqft) parts.push(`${Number(sqft).toLocaleString()} sqft`);
    parts.push(propType);
    if (garage !== "None") parts.push(`${garage} garage`);
    if (yearBuilt) parts.push(`built ${yearBuilt}`);
    parts.push(condition);
    if (features.length) parts.push(features.join(", "));
    onChange(parts.join(", "));
  }, [beds, baths, propType, garage, yearBuilt, sqft, condition, features]);

  const selectCls = "w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1.5 text-sm";
  const textCls = "w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 px-2 py-1.5 text-sm";

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
      {/* Beds, Baths, Sqft, Year */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stepper label="Bedrooms" value={beds} min={1} max={10} step={1} onChange={setBeds} />
        <Stepper label="Bathrooms" value={baths} min={1} max={8} step={0.5} onChange={setBaths} />
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Sq Ft</label>
          <input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="1850" className={textCls} />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Year Built</label>
          <input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="2005" className={textCls} />
        </div>
      </div>

      {/* Property Type, Garage, Condition */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Property Type</label>
          <select value={propType} onChange={(e) => setPropType(e.target.value)} className={selectCls}>
            {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Garage</label>
          <select value={garage} onChange={(e) => setGarage(e.target.value)} className={selectCls}>
            {GARAGE_OPTIONS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Condition</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className={selectCls}>
            {CONDITION_OPTIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Extra Features */}
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">Additional Features</label>
        <div className="flex flex-wrap gap-1.5">
          {EXTRA_FEATURES.map((f) => (
            <button key={f} type="button" onClick={() => toggleFeature(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                features.includes(f)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
              }`}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* Preview */}
      {value && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600 px-3 py-2">
          <span className="font-semibold text-gray-600 dark:text-gray-300">Summary: </span>{value}
        </div>
      )}
    </div>
  );
}

// ──────────────────────── comparable row ────────────────────────────

function ComparableRow({ comp, index, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);

  function update(field, value) {
    onChange(index, { ...comp, [field]: value });
  }

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg mb-2 overflow-hidden">
      {/* Collapsed header — always visible */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800">
        <input
          type="checkbox"
          checked={comp.selected}
          disabled={comp.is_subject_property}
          onChange={(e) => update("selected", e.target.checked)}
          className="rounded border-gray-300 shrink-0 disabled:opacity-40"
        />
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 shrink-0 w-14">#{index + 1}</span>
        <span className="flex-1 text-xs text-gray-700 dark:text-gray-200 truncate min-w-0">
          {comp.address || <span className="text-gray-400 italic">No address</span>}
        </span>
        {comp.sale_price && (
          <span className="text-xs font-semibold text-green-700 dark:text-green-400 shrink-0 ml-1">{comp.sale_price}</span>
        )}
        {comp.is_subject_property && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 rounded px-1.5 py-0.5">
            Subject
          </span>
        )}
        <button type="button" onClick={() => setExpanded((v) => !v)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 px-1 shrink-0">
          <Icon icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => onRemove(index)}
          className="text-xs text-gray-400 hover:text-red-500 shrink-0">✕</button>
      </div>

      {/* Expanded detail fields */}
      {expanded && (
        <div className="p-3 bg-white dark:bg-gray-900/30">
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
                <label className="text-xs text-gray-500 dark:text-gray-400">{label}</label>
                <input value={comp[name] || ""} onChange={(e) => update(name, e.target.value)}
                  className="w-full rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-2 py-1 text-xs"
                  placeholder={label} />
              </div>
            ))}
          </div>
          <div className="mt-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">Source URL</label>
            <input value={comp.source_url || ""} onChange={(e) => update("source_url", e.target.value)}
              className="w-full rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-2 py-1 text-xs"
              placeholder="https://..." />
          </div>
          {(comp.source_url || comp.evidence) && (
            <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-600 px-3 py-2">
              {comp.source_url && (
                <a href={comp.source_url} target="_blank" rel="noreferrer"
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">Verify source</a>
              )}
              {comp.evidence && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{comp.evidence}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── loading overlay ───────────────────────────

function LoadingOverlay({ message }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 max-w-sm mx-4 text-center">
        <Icon icon="svg-spinners:ring-resize" className="w-10 h-10 text-blue-600" />
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{message}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">This may take 30–60 seconds</p>
      </div>
    </div>
  );
}

// ──────────────────── price range from comps ─────────────────────────

function parsePrice(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*([KkMm])?/);
  if (!match) return null;
  let price = parseFloat(match[1].replace(/,/g, ""));
  const suffix = (match[2] || "").toLowerCase();
  if (suffix === "k") price *= 1000;
  if (suffix === "m") price *= 1000000;
  return price > 10000 ? price : null;
}

function parseSqft(value) {
  const text = String(value || "");
  const match = text.match(/([\d,]+)\s*(?:sq\.?\s*ft\.?|sqft|square feet)/i)
    || (text.trim().match(/^[\d,]+$/) ? text.trim().match(/^([\d,]+)$/) : null);
  if (!match) return null;
  const sqft = parseInt(match[1].replace(/,/g, ""), 10);
  return sqft > 200 ? sqft : null;
}

function calcPriceRange(candidates, subjectDetails = "") {
  const selected = candidates.filter((c) => c.selected && !c.is_subject_property);
  const subjectSqft = parseSqft(subjectDetails);

  const compData = selected
    .map((c) => ({
      price: parsePrice(c.sale_price),
      sqft: parseSqft(c.sqft),
    }))
    .filter((c) => c.price);

  if (compData.length === 0) return "";

  const estimates = compData
    .map((c) => {
      if (subjectSqft && c.sqft) return (c.price / c.sqft) * subjectSqft;
      return c.price;
    })
    .filter((p) => !isNaN(p) && p > 10000)
    .sort((a, b) => a - b);

  if (estimates.length === 0) return "";

  const trimmed = estimates.length >= 5 ? estimates.slice(1, -1) : estimates;
  const mid = trimmed[Math.floor(trimmed.length / 2)];
  const lowObserved = trimmed[0];
  const highObserved = trimmed[trimmed.length - 1];
  const spread = Math.max(
    7500,
    mid * (trimmed.length >= 3 ? 0.025 : 0.04),
    Math.min((highObserved - lowObserved) / 2, mid * 0.06)
  );
  const round = (n) => Math.round(n / 2500) * 2500;
  const lo = round(mid - spread);
  const hi = round(mid + spread);
  return `$${lo.toLocaleString("en-US")} - $${hi.toLocaleString("en-US")}`;
}

function selectedCompCount(candidates) {
  return candidates.filter((c) => c.selected && !c.is_subject_property && parsePrice(c.sale_price)).length;
}

function legacyCalcPriceRange(candidates) {
  const prices = candidates
    .filter((c) => c.sale_price)
    .map((c) => parseFloat(String(c.sale_price).replace(/[^0-9.]/g, "")))
    .filter((p) => !isNaN(p) && p > 10000)
    .sort((a, b) => a - b);

  if (prices.length === 0) return "";

  const lo = prices[Math.floor(prices.length * 0.25)] ?? prices[0];
  const hi = prices[Math.ceil(prices.length * 0.75) - 1] ?? prices[prices.length - 1];
  const round = (n) => Math.round(n / 5000) * 5000;
  return `$${round(lo).toLocaleString("en-US")} – $${round(hi).toLocaleString("en-US")}`;
}

// ──────────────────────── main component ────────────────────────────

export default function CMAGenerator() {
  const { generate, regenerate, loading, result, error } = useGenerate("/generate/re/cma");
  const [subjectProperty, setSubjectProperty] = useState("");
  const [subjectDetails, setSubjectDetails] = useState("");
  const [comps, setComps] = useState([{ ...EMPTY_COMP }, { ...EMPTY_COMP }, { ...EMPTY_COMP }]);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchMessage, setResearchMessage] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [priceAutoFilled, setPriceAutoFilled] = useState(false);
  const [marketNotes, setMarketNotes] = useState("");
  const [marketNotesAutoFilled, setMarketNotesAutoFilled] = useState(false);

  useEffect(() => {
    if (!priceAutoFilled) return;
    const suggested = calcPriceRange(comps, subjectDetails);
    if (suggested) setPriceRange(suggested);
  }, [comps, subjectDetails, priceAutoFilled]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!subjectProperty.trim()) return;

    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());

    data.subject_property = subjectProperty;
    data.subject_details = subjectDetails;
    data.price_range = priceRange;
    data.market_notes = marketNotes;

    const selectedComps = comps
      .filter((c) => c.selected && c.address.trim())
      .map((c, i) => {
        const src = c.source_url ? ` Source URL: ${c.source_url}` : "";
        return `${i + 1}. ${c.address} — ${c.sqft || "?"} sqft, ${c.beds_baths || "beds/baths n/a"}, sold ${c.sale_price || "price n/a"} on ${c.sale_date || "date n/a"} (DOM: ${c.dom || "n/a"}).${src}`;
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
        max_results: 10,
      });
      setResearchMessage(res.data.message || "");
      if (res.data.candidates?.length) {
        const candidates = res.data.candidates.map((c) => ({ ...EMPTY_COMP, ...c }));
        setComps(candidates);
        const suggested = calcPriceRange(candidates, subjectDetails);
        if (suggested) { setPriceRange(suggested); setPriceAutoFilled(true); }
      }
      if (res.data.market_notes) {
        setMarketNotes(res.data.market_notes);
        setMarketNotesAutoFilled(true);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = typeof detail === "string"
        ? detail
        : err.response?.data?.message || "Comparable research failed. Please add comps manually.";
      setResearchMessage(message);
    } finally {
      setResearchLoading(false);
    }
  }

  function updateComp(index, next) {
    setComps((cur) => cur.map((c, i) => (i === index ? next : c)));
  }
  function removeComp(index) {
    setComps((cur) => cur.filter((_, i) => i !== index));
  }
  function addComp() {
    setComps((cur) => [...cur, { ...EMPTY_COMP }]);
  }

  const canResearch = subjectProperty.trim().length > 0;

  function handleListingSelect(listing) {
    if (listing.address) setSubjectProperty(listing.address);
  }

  return (
    <div>
      {/* Loading overlay for generate */}
      {loading && <LoadingOverlay message="Generating your CMA narrative…" />}
      {/* Loading overlay for research */}
      {researchLoading && <LoadingOverlay message="Searching for comparable sales…" />}

      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">CMA Narrative Generator</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Generate polished written narratives for Comparative Market Analyses.
      </p>

      <ListingSelector onSelect={handleListingSelect} />

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">

        {/* Subject Property Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Subject Property Address <span className="text-red-500">*</span>
          </label>
          <AddressSearch value={subjectProperty} onChange={setSubjectProperty} />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Start typing for address suggestions, or enter it directly.
          </p>
        </div>

        {/* Subject Property Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Subject Property Details <span className="text-red-500">*</span>
          </label>
          <PropertyDetailsForm value={subjectDetails} onChange={setSubjectDetails} />
        </div>

        {/* Comparable Sales */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Comparable Sales
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            The AI searches for recently sold properties similar to your subject. Review and edit the results, or add comps manually.
          </p>

          {/* Prominent Research CTA */}
          <button
            type="button"
            onClick={researchComps}
            disabled={!canResearch || researchLoading}
            className="w-full mb-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
          >
            <Icon icon="mdi:magnify" className="w-4 h-4 shrink-0" />
            Find Comparable Sales with AI
          </button>

          {!canResearch && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mb-3">
              Enter an address above to enable AI comp research
            </p>
          )}

          {researchMessage && (
            <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              {researchMessage}
            </div>
          )}

          {comps.map((comp, index) => (
            <ComparableRow key={index} comp={comp} index={index} onChange={updateComp} onRemove={removeComp} />
          ))}

          <button type="button" onClick={addComp}
            className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
            + Add Comparable Manually
          </button>
        </div>

        {/* Market Trend Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Market Trend Notes</label>
          <textarea
            rows={3}
            value={marketNotes}
            onChange={(e) => { setMarketNotes(e.target.value); setMarketNotesAutoFilled(false); }}
            placeholder="Inventory is low, prices rising 5% YoY…"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 text-sm"
          />
          {marketNotesAutoFilled && (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              ✓ Auto-filled from comparable sales data — edit as needed
            </p>
          )}
        </div>

        {/* Price Range */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Recommended List Price Range <span className="text-red-500">*</span>
            </label>
            {selectedCompCount(comps) > 0 && (
              <button
                type="button"
                onClick={() => {
                  const suggested = calcPriceRange(comps, subjectDetails);
                  if (suggested) { setPriceRange(suggested); setPriceAutoFilled(true); }
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                ↻ Recalculate from comps
              </button>
            )}
          </div>
          <input
            required
            value={priceRange}
            onChange={(e) => { setPriceRange(e.target.value); setPriceAutoFilled(false); }}
            placeholder="$470,000 – $485,000"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 text-sm"
          />
          {priceAutoFilled && (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              ✓ Calculated from {selectedCompCount(comps)} comparable{selectedCompCount(comps) !== 1 ? "s" : ""} — adjust as needed
            </p>
          )}
        </div>

        {/* Generated output */}
        {result && (
          <OutputCard output={result.output} documentId={result.document_id} onRegenerate={regenerate} loading={loading} />
        )}

        {/* Generate button */}
        <button
          type="submit"
          disabled={loading || !subjectProperty.trim() || !subjectDetails.trim()}
          className="w-full py-3 rounded-lg text-white font-semibold text-sm disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
        >
          Generate CMA Narrative
        </button>
      </form>
    </div>
  );
}

