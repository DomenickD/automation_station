import { useState } from "react";
import { useSavedListings } from "../../hooks/useSavedListings";

const CONTACT_FIELDS = [
  { key: "seller_name", label: "Seller Name" },
  { key: "seller_email", label: "Seller Email", type: "email" },
  { key: "seller_phone", label: "Seller Phone", type: "tel" },
  { key: "buyer_name", label: "Buyer Name" },
  { key: "buyer_email", label: "Buyer Email", type: "email" },
  { key: "buyer_phone", label: "Buyer Phone", type: "tel" },
];

const PROPERTY_FIELDS = [
  { key: "property_type", label: "Property Type" },
  { key: "property_style", label: "Style" },
  { key: "condition", label: "Condition" },
  { key: "garage", label: "Garage" },
  { key: "bedrooms", label: "Bedrooms", type: "number" },
  { key: "bathrooms", label: "Bathrooms", type: "number" },
  { key: "sqft", label: "Square Feet", type: "number" },
  { key: "lot_size", label: "Lot Size" },
  { key: "year_built", label: "Year Built", type: "number" },
  { key: "price_target", label: "Price / Target" },
];

const EXTRA_SECTIONS = [
  {
    title: "Location & Neighborhood",
    fields: [
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zip_code", label: "ZIP" },
      { key: "county", label: "County" },
      { key: "neighborhood", label: "Neighborhood Highlights", type: "textarea" },
      { key: "schools", label: "Schools", type: "textarea" },
    ],
  },
  {
    title: "Listing Logistics",
    fields: [
      { key: "listing_status", label: "Listing Status" },
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
      { key: "hoa", label: "HOA" },
      { key: "hoa_fee", label: "HOA Fee" },
      { key: "hoa_covers", label: "HOA Covers", type: "textarea" },
      { key: "flood_zone", label: "Flood Zone" },
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

function FieldGrid({ fields, form, update, inputCls }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(({ key, label, type }) => (
        <div key={key} className={type === "textarea" ? "col-span-2" : ""}>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</label>
          {type === "textarea" ? (
            <textarea
              value={form[key] ?? ""}
              onChange={(e) => update(key, e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="-"
            />
          ) : (
            <input
              type={type || "text"}
              value={form[key] ?? ""}
              onChange={(e) => update(key, e.target.value)}
              className={inputCls}
              placeholder="-"
            />
          )}
        </div>
      ))}
    </div>
  );
}

function EditModal({ listing, onClose, onSave }) {
  const [form, setForm] = useState({ ...listing });
  const [saving, setSaving] = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(listing.id, form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate pr-4">{listing.address}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Property Details</p>
            <div className="grid grid-cols-2 gap-3">
              {PROPERTY_FIELDS.map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                  <input
                    type={type || "text"}
                    value={form[key] ?? ""}
                    onChange={(e) => update(key, e.target.value)}
                    className={inputCls}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Features &amp; Neighborhood</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Key Features</label>
                <textarea
                  value={form.features ?? ""}
                  onChange={(e) => update("features", e.target.value)}
                  rows={2}
                  className={inputCls}
                  placeholder="Hardwood floors, granite countertops…"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Neighborhood Highlights</label>
                <textarea
                  value={form.neighborhood ?? ""}
                  onChange={(e) => update("neighborhood", e.target.value)}
                  rows={2}
                  className={inputCls}
                  placeholder="Top-rated schools, walkable…"
                />
              </div>
            </div>
          </div>

          {EXTRA_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">{section.title}</p>
              <FieldGrid fields={section.fields} form={form} update={update} inputCls={inputCls} />
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Contact Info</p>
            <div className="grid grid-cols-2 gap-3">
              {CONTACT_FIELDS.map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                  <input
                    type={type || "text"}
                    value={form[key] ?? ""}
                    onChange={(e) => update(key, e.target.value)}
                    className={inputCls}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
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
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
            >
              {saving ? "Saving…" : "Save Changes"}
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
      </div>
    </div>
  );
}

function ListingCard({ listing, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
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
            enriched
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
  const [editTarget, setEditTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = listings.filter((l) =>
    l.address.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAddListing(e) {
    e.preventDefault();
    if (!newAddress.trim()) return;
    setAdding(true);
    try {
      await createOrUpdateListing({ address: newAddress.trim() });
      setNewAddress("");
      setShowAddForm(false);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Saved Listings</h1>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="text-sm px-4 py-2 rounded-lg text-white font-medium"
          style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
        >
          + Add Listing
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Listings are saved automatically when you use any real estate tool. Add contact info and notes here.
      </p>

      {showAddForm && (
        <form onSubmit={handleAddListing} className="mb-5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
          <input
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="123 Main St, Austin, TX 78701"
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
          >
            {adding ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
          >
            Cancel
          </button>
        </form>
      )}

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
              onEdit={setEditTarget}
              onDelete={deleteListing}
            />
          ))}
        </div>
      )}

      {editTarget && (
        <EditModal
          listing={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={updateListing}
        />
      )}
    </div>
  );
}
