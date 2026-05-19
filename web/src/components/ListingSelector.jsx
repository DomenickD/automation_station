import { useSavedListings } from "../hooks/useSavedListings";

/**
 * Renders a "Load Saved Listing" bar above a form.
 * onSelect(listing) is called with the full listing object when the user picks one.
 */
export default function ListingSelector({ onSelect }) {
  const { listings, loading } = useSavedListings();

  if (!loading && listings.length === 0) return null;

  function handleChange(e) {
    const id = e.target.value;
    if (!id) return;
    const listing = listings.find((l) => l.id === id);
    if (listing) onSelect(listing);
    e.target.value = "";
  }

  return (
    <div className="mb-5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 flex items-center gap-3">
      <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      <span className="text-sm font-medium text-blue-700 dark:text-blue-300 shrink-0">Load saved listing:</span>
      <select
        onChange={handleChange}
        disabled={loading}
        defaultValue=""
        className="flex-1 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
      >
        <option value="" disabled>
          {loading ? "Loading…" : "— Select a property —"}
        </option>
        {listings.map((l) => (
          <option key={l.id} value={l.id}>
            {l.address}
            {l.bedrooms ? ` · ${l.bedrooms}bd` : ""}
            {l.bathrooms ? `/${l.bathrooms}ba` : ""}
            {l.sqft ? ` · ${Number(l.sqft).toLocaleString()} sqft` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
