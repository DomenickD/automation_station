import { createContext, useContext, useState, useEffect } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      client
        .get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem("access_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password, tenantSlug) {
    const res = await client.post("/auth/login", {
      email,
      password,
      tenant_slug: tenantSlug,
    });
    localStorage.setItem("access_token", res.data.access_token);
    localStorage.setItem("tenant_slug", tenantSlug);
    setUser(res.data);
    return res.data;
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("tenant_slug");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
