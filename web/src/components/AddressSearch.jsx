import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";

export default function AddressSearch({
  value,
  onChange,
  onPick,
  placeholder = "123 Main St, Austin, TX 78701",
  required,
}) {
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
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=6&countrycodes=us&addressdetails=1`,
          { headers: { "Accept-Language": "en-US,en" } }
        );
        const data = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch { /* network unavailable, ignore */ }
    }, 420);
  }

  function buildAddress(s) {
    const a = s.address || {};
    const parts = [
      a.house_number ? `${a.house_number} ${a.road || ""}`.trim() : (a.road || ""),
      a.city || a.town || a.village || a.county || "",
      a.state ? stateAbbr(a.state) : "",
      a.postcode || "",
    ].map((p) => p.trim()).filter(Boolean);
    return parts.length >= 2 ? parts.join(", ").replace(/,\s*,/g, ",") : s.display_name;
  }

  function stateAbbr(stateName) {
    const map = {
      Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
      Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
      Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
      Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
      Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
      Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH",
      "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
      "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA",
      "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN",
      Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
      "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "District of Columbia": "DC",
    };
    return map[stateName] || stateName;
  }

  function pick(s) {
    onChange(buildAddress(s));
    if (onPick) {
      const a = s.address || {};
      onPick({
        city: a.city || a.town || a.village || "",
        state: stateAbbr(a.state || ""),
        zip: a.postcode || "",
        county: a.county || "",
      });
    }
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
          placeholder={placeholder}
          required={required}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Icon icon="mdi:magnify" className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.place_id}>
              <button
                type="button"
                onMouseDown={() => pick(s)}
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
