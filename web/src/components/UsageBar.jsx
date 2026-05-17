export default function UsageBar({ used, limit, percent }) {
  const pct = percent ?? Math.min((used / limit) * 100, 100);
  const color = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "var(--brand-color, #2563eb)";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600 font-medium">Monthly Token Usage</span>
        <span className="text-gray-900 font-semibold">{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{(used || 0).toLocaleString()} tokens used</span>
        <span>{(limit || 0).toLocaleString()} limit</span>
      </div>
    </div>
  );
}
