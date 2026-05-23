import { useState, useEffect } from "react";
import { useSavedListings } from "../../hooks/useSavedListings";
import AddressSearch from "../../components/AddressSearch";
import ChipSelect from "../../components/ChipSelect";
import client from "../../api/client";

const FEATURE_CHIPS = [
  "Hardwood Floors", "Tile Floors", "New Carpet",
  "Updated Kitchen", "Granite Countertops", "Quartz Countertops", "Stainless Appliances", "Kitchen Island",
  "Updated Bathrooms", "Primary Suite", "Walk-in Closet", "Soaking Tub",
  "Open Floor Plan", "Vaulted Ceilings", "Crown Molding", "Fireplace",
  "1-Car Garage", "2-Car Garage", "3-Car Garage", "EV Charger",
  "New Roof", "New HVAC", "Solar Panels", "Smart Home",
  "Pool", "Hot Tub", "Screened Porch", "Covered Patio", "Fenced Yard",
  "Waterfront", "Corner Lot", "Cul-de-Sac", "Mountain Views", "City Views",
];

const NEIGHBORHOOD_CHIPS = [
  "Top-Rated Schools", "Walkable to Shops", "Near Restaurants", "Near Parks",
  "Near Highway", "Near Public Transit", "Near Downtown", "Near Beach",
  "Quiet Street", "Cul-de-Sac", "Low Traffic", "Family Friendly",
  "Gated Community", "Mature Trees", "New Development", "Historic District",
];

const CONTACT_FIELDS = [
  { key: "seller_name", label: "Seller Name" },
  { key: "seller_email", label: "Seller Email", type: "email" },
  { key: "seller_phone", label: "Seller Phone", type: "tel" },
  { key: "buyer_name", label: "Buyer Name" },
  { key: "buyer_email", label: "Buyer Email", type: "email" },
  { key: "buyer_phone", label: "Buyer Phone", type: "tel" },
];

const PROPERTY_FIELDS = [
  { key: "property_type", label: "Property Type", type: "select", options: ["Single Family", "Condo", "Townhouse", "Multi-Family", "Land", "Commercial", "Mobile Home", "Other"] },
  { key: "property_style", label: "Style" },
  { key: "condition", label: "Condition" },
  { key: "garage", label: "Garage" },
  { key: "bedrooms", label: "Bedrooms", type: "number" },
  { key: "bathrooms", label: "Bathrooms", type: "number" },
  { key: "sqft", label: "Square Feet", type: "number" },
  { key: "lot_size", label: "Lot Size" },
  { key: "year_built", label: "Year Built", type: "number" },
  { key: "price_target", label: "Price / Target", formatter: "currency" },
];

const EXTRA_SECTIONS = [
  {
    title: "Location & Neighborhood",
    fields: [
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zip_code", label: "ZIP" },
      { key: "county", label: "County" },
      { key: "schools", label: "Schools", type: "textarea" },
    ],
  },
  {
    title: "Listing Logistics",
    fields: [
      { key: "listing_status", label: "Listing Status", type: "select", options: ["Active", "Coming Soon", "Pending", "Under Contract", "Sold", "Expired", "Withdrawn", "Off Market"] },
      { key: "mls_number", label: "MLS Number" },
      { key: "showing_instructions", label: "Showing Instructions", type: "textarea" },
      { key: "open_house", label: "Open House Info", type: "textarea" },
      { key: "closing_pref", label: "Closing Preference", type: "textarea" },
      { key: "inclusions", label: "Inclusions", type: "textarea" },
      { key: "exclusions", label: "Exclusions", type: "textarea" },
    ],
  },
  {
    title: "HOA & Due Diligence",
    fields: [
      { key: "hoa", label: "HOA", type: "select", options: ["Yes", "No", "TBD"] },
      { key: "hoa_fee", label: "HOA Fee", placeholder: "$50/month", formatter: "hoa_fee" },
      { key: "hoa_covers", label: "HOA Covers", type: "textarea" },
      { key: "flood_zone", label: "Flood Zone", type: "combobox", options: ["Zone X (Minimal Risk)", "Zone AE (High Risk)", "Zone A (High Risk)", "Zone VE (Coastal High Risk)", "Zone X500 (Moderate Risk)", "Zone D (Undetermined)"] },
      { key: "utilities", label: "Utilities", type: "textarea" },
      { key: "updates", label: "Recent Updates", type: "textarea" },
      { key: "property_details", label: "Property Details", type: "textarea" },
    ],
  },
  {
    title: "Market & Pricing",
    fields: [
      { key: "list_price", label: "List Price" },
      { key: "current_price", label: "Current Price" },
      { key: "recommended_price", label: "Recommended Price" },
      { key: "value_range", label: "Value Range" },
      { key: "target_buyer", label: "Target Buyer" },
      { key: "dom", label: "Days on Market", type: "number" },
      { key: "showings", label: "Showings", type: "number" },
      { key: "offers", label: "Offers", type: "textarea" },
      { key: "feedback", label: "Buyer Feedback", type: "textarea" },
      { key: "market_notes", label: "Market Notes", type: "textarea" },
      { key: "comparables", label: "Comparables", type: "textarea" },
      { key: "competitors", label: "Competitors", type: "textarea" },
    ],
  },
  {
    title: "Contract Context",
    fields: [
      { key: "seller_names", label: "Seller Names" },
      { key: "buyer_names", label: "Buyer Names" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
      { key: "commission", label: "Commission" },
      { key: "buyer_commission", label: "Buyer Agent Commission" },
      { key: "lockbox", label: "Lockbox" },
      { key: "mls_auth", label: "MLS Authorization" },
      { key: "special_terms", label: "Special Terms", type: "textarea" },
    ],
  },
];

function FieldGrid({ fields, form, update, inputCls, readOnly }) {
  if (readOnly) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, type }) => (
          <div key={key} className={type === "textarea" ? "col-span-2" : ""}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 break-words">
              {form[key] ? String(form[key]) : <span className="text-gray-300 dark:text-gray-600">—</span>}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(({ key, label, type, options, placeholder, formatter }) => (
        <div key={key} className={type === "textarea" ? "col-span-2" : ""}>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</label>
          {type === "textarea" ? (
            <textarea
              value={form[key] ?? ""}
              onChange={(e) => update(key, e.target.value)}
              rows={2}
              className={inputCls}
              placeholder={placeholder ?? "-"}
            />
          ) : type === "select" ? (
            <select
              value={form[key] ?? ""}
              onChange={(e) => update(key, e.target.value)}
              className={inputCls}
            >
              <option value="">Select…</option>
              {options.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : type === "combobox" ? (
            <>
              <input
                list={`datalist-${key}`}
                type="text"
                value={form[key] ?? ""}
                onChange={(e) => update(key, e.target.value)}
                className={inputCls}
                placeholder={placeholder ?? "-"}
              />
              <datalist id={`datalist-${key}`}>
                {options.map((o) => <option key={o} value={o} />)}
              </datalist>
            </>
          ) : (
            <input
              type={type || "text"}
              value={form[key] ?? ""}
              onChange={(e) => update(key, e.target.value)}
              onBlur={formatter ? (e) => update(key, FIELD_FORMATTERS[formatter]?.(e.target.value) ?? e.target.value) : undefined}
              className={inputCls}
              placeholder={placeholder ?? "-"}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function parseCurrency(raw) {
  if (!raw || !raw.trim()) return "";
  const s = raw.trim().replace(/[$,\s]/g, "");
  const multipliers = { k: 1_000, m: 1_000_000, b: 1_000_000_000 };
  const match = s.match(/^([\d.]+)([kmb]?)$/i);
  if (!match) return raw;
  const num = parseFloat(match[1]) * (multipliers[match[2].toLowerCase()] ?? 1);
  if (isNaN(num)) return raw;
  return "$" + Math.round(num).toLocaleString("en-US");
}

function parseHoaFee(raw) {
  if (!raw || !raw.trim()) return "";
  const s = raw.trim().replace(/[$,\s]/g, "").replace(/\/month.*$/i, "").trim();
  const multipliers = { k: 1_000, m: 1_000_000 };
  const match = s.match(/^([\d.]+)([km]?)$/i);
  if (!match) return raw;
  const num = parseFloat(match[1]) * (multipliers[match[2].toLowerCase()] ?? 1);
  if (isNaN(num)) return raw;
  return "$" + Math.round(num).toLocaleString("en-US") + "/month";
}

const FIELD_FORMATTERS = { hoa_fee: parseHoaFee, currency: parseCurrency };

const MODULE_LABELS = {
  re_listing: "Listing Description",
  re_email: "RE Email",
  re_cma: "CMA Narrative",
  re_rpr: "Full RPR Report",
  re_neighborhood: "Neighborhood Report",
  re_appointment: "Appointment Script",
  re_competitive: "Competitive Analysis",
  re_timeline: "Timeline",
  re_seller_update: "Seller Update",
  re_buyer_consult: "Buyer Consult",
  re_offer_letter: "Offer Letter",
  re_expired_outreach: "Expired Outreach",
  re_soi_campaign: "SOI Campaign",
  re_just_listed: "Just Listed",
  re_open_house_followup: "Open House Follow-up",
  re_virtual_staging: "Virtual Staging",
  re_property_faq: "Property FAQ",
  re_price_reduction: "Price Reduction",
  re_business_plan: "Business Plan",
  re_bio: "Agent Bio",
  re_testimonial: "Testimonial Request",
  re_referral: "Referral Request",
  contract_listing_agreement: "Listing Agreement",
};

function DocumentsTab({ listingId }) {
  const [docs, setDocs] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [copying, setCopying] = useState(null);

  useEffect(() => {
    let cancelled = false;
    client.get(`/listings/${listingId}/documents`).then((res) => {
      if (!cancelled) setDocs(res.data);
    }).catch(() => {
      if (!cancelled) setDocs([]);
    });
    return () => { cancelled = true; };
  }, [listingId]);

  function handleCopy(doc) {
    navigator.clipboard.writeText(doc.output_text);
    setCopying(doc.id);
    setTimeout(() => setCopying(null), 1500);
  }

  if (docs === null) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading documents…</p>;
  }

  if (docs.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">No generated documents linked to this listing yet.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Generate content using any RE tool with this property's address to link it here.</p>
      </div>
    );
  }

  // Group by module
  const grouped = docs.reduce((acc, doc) => {
    if (!acc[doc.module]) acc[doc.module] = [];
    acc[doc.module].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([module, moduleDocs]) => (
        <div key={module}>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
            {MODULE_LABELS[module] || module}
          </p>
          <div className="space-y-2">
            {moduleDocs.map((doc) => {
              const isExpanded = expanded === doc.id;
              const snippet = doc.output_text.trim().replace(/\s+/g, " ").slice(0, 120);
              const hasMore = doc.output_text.trim().length > 120;
              return (
                <div key={doc.id} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-3 pt-2.5 pb-2 bg-gray-50 dark:bg-gray-800/60">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {doc.tokens_used && <span className="ml-2 text-gray-400 dark:text-gray-500">{doc.tokens_used.toLocaleString()} tokens</span>}
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(doc)}
                          className="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {copying === doc.id ? "Copied!" : "Copy"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpanded(isExpanded ? null : doc.id)}
                          className="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {isExpanded ? "Hide" : "View"}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {snippet}{hasMore && !isExpanded ? <span className="text-gray-400 dark:text-gray-500">…</span> : ""}
                    </p>
                  </div>
                  {isExpanded && (
                    <div className="px-3 py-3 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap max-h-64 overflow-y-auto bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                      {doc.output_text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListingModal({ listing, onClose, onSave, onEdit, readOnly }) {
  const isEdit = !!listing && !readOnly;
  const [tab, setTab] = useState("details");
  const [fullscreen, setFullscreen] = useState(false);
  const [form, setForm] = useState(listing ? { ...listing } : {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isEdit && !form.address?.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await onSave(listing.id, form);
      } else {
        const payload = Object.fromEntries(
          Object.entries(form).filter(([, v]) => v !== "" && v !== null && v !== undefined)
        );
        await onSave(payload);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save listing");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`bg-white dark:bg-gray-900 shadow-2xl w-full overflow-y-auto transition-all ${
        fullscreen
          ? "fixed inset-0 rounded-none max-w-none max-h-none"
          : "rounded-2xl max-w-3xl max-h-[90vh]"
      }`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate pr-4">
            {isEdit ? listing.address : (listing ? listing.address : "Add New Listing")}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFullscreen((f) => !f)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
              title={fullscreen ? "Exit full screen" : "Full screen"}
            >
              {fullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/>
                </svg>
              )}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
          </div>
        </div>

        {(isEdit || readOnly) && (
          <div className="flex border-b border-gray-100 dark:border-gray-700 px-5">
            {["details", "documents"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`py-2.5 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t === "details" ? "Details" : "Documents"}
              </button>
            ))}
          </div>
        )}

        {(isEdit || readOnly) && tab === "documents" ? (
          <div className="p-5">
            <DocumentsTab listingId={listing.id} />
          </div>
        ) : readOnly ? (
          <div className="p-5 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Property Details</p>
              <FieldGrid fields={PROPERTY_FIELDS} form={form} readOnly />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Features</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 break-words">
                {form.features || <span className="text-gray-300 dark:text-gray-600">—</span>}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Neighborhood</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 break-words">
                {form.neighborhood || <span className="text-gray-300 dark:text-gray-600">—</span>}
              </p>
            </div>
            {EXTRA_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">{section.title}</p>
                <FieldGrid fields={section.fields} form={form} readOnly />
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Contact Info</p>
              <FieldGrid fields={CONTACT_FIELDS} form={form} readOnly />
            </div>
            {form.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{form.notes}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(listing)}
                  className="flex-1 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <AddressSearch
                value={form.address ?? ""}
                onChange={(val) => update("address", val)}
                onPick={({ city, state, zip, county }) => {
                  if (city) update("city", city);
                  if (state) update("state", state);
                  if (zip) update("zip_code", zip);
                  if (county) update("county", county);
                }}
                required
              />
            </div>
          )}

          {!isEdit && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Location</p>
              <div className="grid grid-cols-4 gap-3 mb-3">
                {[
                  { key: "city",     label: "City" },
                  { key: "state",    label: "State" },
                  { key: "zip_code", label: "ZIP" },
                  { key: "county",   label: "County" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                    <input
                      type="text"
                      value={form[key] ?? ""}
                      onChange={(e) => update(key, e.target.value)}
                      className={inputCls}
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Schools</label>
                <textarea
                  value={form.schools ?? ""}
                  onChange={(e) => update("schools", e.target.value)}
                  rows={2}
                  className={inputCls}
                  placeholder="Top-rated elementary, middle, and high schools…"
                />
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Property Details</p>
            <FieldGrid fields={PROPERTY_FIELDS} form={form} update={update} inputCls={inputCls} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Features &amp; Neighborhood</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Key Features</label>
                <ChipSelect
                  options={FEATURE_CHIPS}
                  value={form.features ?? ""}
                  onChange={(val) => update("features", val)}
                  placeholder="Type a feature and press Enter…"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Neighborhood Highlights</label>
                <ChipSelect
                  options={NEIGHBORHOOD_CHIPS}
                  value={form.neighborhood ?? ""}
                  onChange={(val) => update("neighborhood", val)}
                  placeholder="Type a highlight and press Enter…"
                />
              </div>
            </div>
          </div>

          {EXTRA_SECTIONS.filter((s) => isEdit || s.title !== "Location & Neighborhood").map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">{section.title}</p>
              <FieldGrid fields={section.fields} form={form} update={update} inputCls={inputCls} />
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Contact Info</p>
            <FieldGrid fields={CONTACT_FIELDS} form={form} update={update} inputCls={inputCls} />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Notes</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Any additional context…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || (!isEdit && !form.address?.trim())}
              className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
            >
              {saving ? (isEdit ? "Saving…" : "Adding…") : (isEdit ? "Save Changes" : "Add Listing")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

function ListingCard({ listing, onView, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
      onClick={(e) => {
        // Don't trigger view when clicking buttons
        if (e.target.closest("button")) return;
        onView(listing);
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{listing.address}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Updated {new Date(listing.updated_at).toLocaleDateString()}
            {listing.last_module && <span> via {listing.last_module.replace("re_", "").replaceAll("_", " ")}</span>}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onEdit(listing)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Edit
          </button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={() => onDelete(listing.id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {listing.bedrooms != null && (
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
            {listing.bedrooms} bd
          </span>
        )}
        {listing.bathrooms != null && (
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
            {listing.bathrooms} ba
          </span>
        )}
        {listing.sqft != null && (
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
            {Number(listing.sqft).toLocaleString()} sqft
          </span>
        )}
        {listing.price_target && (
          <span className="text-xs bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
            {listing.price_target}
          </span>
        )}
        {listing.property_type && (
          <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
            {listing.property_type}
          </span>
        )}
        {listing.listing_status && (
          <span className="text-xs bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
            {listing.listing_status}
          </span>
        )}
        {listing.data_enriched && (
          <span className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            Enriched
          </span>
        )}
      </div>

      {(listing.seller_name || listing.buyer_name) && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex gap-4">
          {listing.seller_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">Seller:</span> {listing.seller_name}
            </p>
          )}
          {listing.buyer_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">Buyer:</span> {listing.buyer_name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SavedListings() {
  const { listings, loading, error, updateListing, deleteListing, createOrUpdateListing } = useSavedListings();
  const [viewTarget, setViewTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = listings.filter((l) =>
    l.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Saved Listings</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-sm px-4 py-2 rounded-lg text-white font-medium"
          style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
        >
          + Add Listing
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Listings are saved automatically when you use any real estate tool. Add contact info and notes here.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {listings.length > 0 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by address…"
          className="w-full mb-4 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-sm">{listings.length === 0 ? "No saved listings yet." : "No listings match your search."}</p>
          {listings.length === 0 && (
            <p className="text-xs mt-1">Listings are saved automatically when you generate content for a property.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onView={setViewTarget}
              onEdit={setEditTarget}
              onDelete={deleteListing}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <ListingModal
          onClose={() => setShowAddModal(false)}
          onSave={createOrUpdateListing}
        />
      )}

      {viewTarget && (
        <ListingModal
          listing={viewTarget}
          readOnly
          onClose={() => setViewTarget(null)}
          onEdit={(l) => { setViewTarget(null); setEditTarget(l); }}
        />
      )}

      {editTarget && (
        <ListingModal
          listing={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={updateListing}
        />
      )}
    </div>
  );
}
