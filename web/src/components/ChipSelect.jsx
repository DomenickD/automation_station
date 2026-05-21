import { useState } from "react";

export default function ChipSelect({ options, value, onChange, placeholder = "Type a feature and press Enter..." }) {
  const selected = value ? value.split(", ").filter(Boolean) : [];
  const presetSet = new Set(options);
  const customChips = selected.filter((s) => !presetSet.has(s));
  const [input, setInput] = useState("");

  function toggle(chip) {
    const next = selected.includes(chip)
      ? selected.filter((s) => s !== chip)
      : [...selected, chip];
    onChange(next.join(", "));
  }

  function addCustom(raw) {
    const chip = raw.trim().replace(/,$/, "");
    if (!chip || selected.includes(chip)) { setInput(""); return; }
    onChange([...selected, chip].join(", "));
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCustom(input);
    }
    if (e.key === "Backspace" && !input && customChips.length > 0) {
      toggle(customChips[customChips.length - 1]);
    }
  }

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 space-y-2.5">
      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5">
        {options.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => toggle(chip)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              selected.includes(chip)
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Custom chips + freetext input */}
      <div className="flex flex-wrap gap-1.5 items-center min-h-[28px]">
        {customChips.map((chip) => (
          <span
            key={chip}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-600 text-white border border-blue-600"
          >
            {chip}
            <button
              type="button"
              onClick={() => toggle(chip)}
              className="leading-none hover:text-blue-200 text-sm"
            >×</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input.trim() && addCustom(input)}
          placeholder={selected.length === 0 ? placeholder : "Add more..."}
          className="flex-1 min-w-[160px] text-xs bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
        />
      </div>

      {selected.length > 0 && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          {selected.length} selected · <button type="button" onClick={() => onChange("")} className="underline hover:text-gray-600 dark:hover:text-gray-300">Clear all</button>
        </p>
      )}
    </div>
  );
}
