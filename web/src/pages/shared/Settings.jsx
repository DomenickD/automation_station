import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTenant } from "../../config/tenant";
import client from "../../api/client";

export default function Settings() {
  const { user } = useAuth();
  const tenant = useTenant();
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (password.next !== password.confirm) {
      setPwMsg({ type: "error", text: "Passwords do not match" });
      return;
    }
    setPwMsg({ type: "info", text: "Password change not yet implemented via UI — contact your admin." });
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await client.post("/knowledge/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setUploadMsg({ type: "success", text: `Uploaded ${r.data.length} chunk(s) from ${file.name}` });
    } catch (err) {
      setUploadMsg({ type: "error", text: err.response?.data?.detail || "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Account Info */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">Account</h2>
        <div className="space-y-2 text-sm">
          <Row label="Email" value={user?.email} />
          <Row label="Name" value={user?.name || "—"} />
          <Row label="Role" value={user?.role} />
          <Row label="Workspace" value={tenant?.company_name} />
          <Row label="Vertical" value={tenant?.vertical?.replace("_", " ")} />
        </div>
      </section>

      {/* Knowledge Base Upload */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-1">Knowledge Base</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload SOPs, FAQs, or brand documents (.txt, .md files). These train your internal bot.
        </p>
        <label className="block">
          <input type="file" accept=".txt,.md,.csv" onChange={handleFileUpload} className="hidden" />
          <span
            className="inline-block px-4 py-2 text-sm text-white font-medium rounded-lg cursor-pointer"
            style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </span>
        </label>
        {uploadMsg && (
          <p className={`mt-2 text-sm ${uploadMsg.type === "error" ? "text-red-600" : "text-green-600"}`}>
            {uploadMsg.text}
          </p>
        )}
      </section>

      {/* Password */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
          {[
            ["current", "Current Password", "current"],
            ["next", "New Password", "next"],
            ["confirm", "Confirm New Password", "confirm"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="password"
                value={password[key]}
                onChange={(e) => setPassword({ ...password, [key]: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
          {pwMsg && (
            <p className={`text-sm ${pwMsg.type === "error" ? "text-red-600" : "text-blue-600"}`}>{pwMsg.text}</p>
          )}
          <button type="submit" className="px-4 py-2 text-sm text-white font-medium rounded-lg" style={{ backgroundColor: "var(--brand-color, #2563eb)" }}>
            Update Password
          </button>
        </form>
      </section>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 capitalize">{value}</span>
    </div>
  );
}
