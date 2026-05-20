export default function Stepper({ label, value, min = 0, max = 10, step = 1, onChange }) {
  const num = parseFloat(value) || 0;

  function handleInput(e) {
    const raw = e.target.value;
    if (raw === "" || raw === ".") { onChange(raw); return; }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) onChange(String(Math.min(max, Math.max(min, parsed))));
  }

  return (
    <div>
      {label && <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{label}</label>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(String(Math.max(min, num - step)))}
          className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >−</button>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleInput}
          placeholder="—"
          className="w-10 text-center text-sm font-semibold text-gray-800 dark:text-gray-100 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
        />
        <button
          type="button"
          onClick={() => onChange(String(Math.min(max, num + step)))}
          className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >+</button>
      </div>
    </div>
  );
}
