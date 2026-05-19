import { useSavedListings } from "../hooks/useSavedListings";
import { Icon } from "@iconify/react";

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
      <Icon icon="mdi:home" className="w-4 h-4 text-blue-500 shrink-0" />
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
