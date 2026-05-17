import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client";

const TenantContext = createContext(null);

const DEFAULT_CONFIG = {
  primary_color: "#2563eb",
  logo_url: null,
  vertical: null,
  company_name: "Automation Station",
  slug: import.meta.env.VITE_TENANT_SLUG || "demo",
};

export function TenantProvider({ children }) {
  const [config, setConfig] = useState(() => {
    const cached = localStorage.getItem("tenant_config");
    return cached ? JSON.parse(cached) : DEFAULT_CONFIG;
  });

  useEffect(() => {
    const slug = import.meta.env.VITE_TENANT_SLUG || localStorage.getItem("tenant_slug") || "demo";
    client
      .get(`/admin/config/public?slug=${slug}`)
      .then((res) => {
        const cfg = { ...DEFAULT_CONFIG, ...res.data };
        setConfig(cfg);
        localStorage.setItem("tenant_config", JSON.stringify(cfg));
        document.documentElement.style.setProperty("--brand-color", cfg.primary_color);
      })
      .catch(() => {
        document.documentElement.style.setProperty("--brand-color", DEFAULT_CONFIG.primary_color);
      });
  }, []);

  return <TenantContext.Provider value={config}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
