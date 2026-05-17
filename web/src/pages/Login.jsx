import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTenant } from "../config/tenant";

export default function Login() {
  const { login } = useAuth();
  const tenant = useTenant();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", tenant_slug: import.meta.env.VITE_TENANT_SLUG || "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function submitLogin(credentials, setPending) {
    setError(null);
    setPending(true);
    try {
      await login(credentials.email, credentials.password, credentials.tenant_slug);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await submitLogin(form, setLoading);
  }

  async function handleDemoLogin() {
    const credentials = {
      email: "admin@demo.com",
      password: "changeme123",
      tenant_slug: form.tenant_slug || import.meta.env.VITE_TENANT_SLUG || "demo-re",
    };
    setForm(credentials);
    await submitLogin(credentials, setDemoLoading);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.company_name} className="h-12 mx-auto mb-3 object-contain" />
          ) : (
            <div
              className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
            >
              A
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{tenant?.company_name || "Automation Station"}</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!import.meta.env.VITE_TENANT_SLUG && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workspace</label>
                <input
                  type="text"
                  placeholder="your-company-slug"
                  value={form.tenant_slug}
                  onChange={(e) => setForm({ ...form, tenant_slug: e.target.value })}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60"
              style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading || demoLoading}
              className="w-full py-2.5 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {demoLoading ? "Signing in..." : "Demo Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
