import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import UsageBar from "../../components/UsageBar";
import client from "../../api/client";

export default function Usage() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    client.get("/usage/summary").then((r) => setSummary(r.data)).catch(() => {});
    client.get("/usage/history?days=30").then((r) => setHistory(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Usage Dashboard</h1>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Generations This Month" value={summary.total_generations} />
          <StatCard label="Chat Messages" value={summary.total_chats} />
          <StatCard label="Tokens Used" value={summary.tokens_this_month.toLocaleString()} />
        </div>
      )}

      {summary && (
        <div className="mb-6">
          <UsageBar used={summary.tokens_this_month} limit={summary.monthly_limit} percent={summary.percent_used} />
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Token Usage (30 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={history} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(v) => [v.toLocaleString(), "Tokens"]}
              />
              <Bar dataKey="tokens" fill="var(--brand-color, #2563eb)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
