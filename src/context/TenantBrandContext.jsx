import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { applyTheme } from '../utils/colorTheme';

// Resolves whether the current hostname is a white-label org domain. When it
// is, the app skips the public Custally landing page and shows a login screen
// branded with the org's logo/name — so visitors on that domain never see any
// Custally branding or marketing. On the canonical domain (custally.com) and
// the Vercel default domain, the lookup returns nothing and the normal landing
// page is shown.
const TenantBrandContext = createContext({ brand: null, loading: true, isCustomDomain: false });

const HOST = typeof window !== 'undefined' ? window.location.hostname : '';
const CACHE_KEY = `tenant_brand:${HOST}`;

// Read a cached result (per browser tab session) so repeat loads on a custom
// domain never flash the landing page before the lookup resolves.
function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch { return undefined; }
}

function applyTabBranding(brand) {
  if (!brand) return;
  if (brand.org_name) document.title = brand.org_name;
  if (brand.logo_url) {
    document.querySelectorAll("link[rel~='icon']").forEach(el => el.remove());
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = brand.logo_url;
    document.head.appendChild(link);
  }
}

export function TenantBrandProvider({ children }) {
  const cached = readCache();
  const [brand, setBrand]     = useState(cached?.brand ?? null);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    if (cached?.brand) applyTabBranding(cached.brand);

    let cancelled = false;
    axios.get('/api/auth/login', { params: { host: HOST } })
      .then(r => {
        if (cancelled) return;
        const next = r.data?.found
          ? { org_name: r.data.org_name, logo_url: r.data.logo_url, theme_color: r.data.theme_color || null }
          : null;
        setBrand(next);
        applyTabBranding(next);
        // Pre-login: apply the org's theme so the Sign In button already matches.
        if (next?.theme_color) applyTheme(next.theme_color);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ brand: next })); } catch {}
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TenantBrandContext.Provider value={{ brand, loading, isCustomDomain: !!brand }}>
      {children}
    </TenantBrandContext.Provider>
  );
}

export const useTenantBrand = () => useContext(TenantBrandContext);
