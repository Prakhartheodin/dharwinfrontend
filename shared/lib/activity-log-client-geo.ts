/**
 * Browser GPS for activity audit: stored in sessionStorage and sent as X-Activity-Client-Geo
 * on API requests (including login/logout) when coordinates are available.
 */

const STORAGE_KEY = "dharwin_platform_audit_client_geo";
const LOGIN_GEO_PROMPT_KEY = "dharwin_login_geo_prompted";

/** Match backend CLIENT_GEO_MAX_AGE_MS (30 minutes). */
const CLIENT_GEO_MAX_AGE_MS = 30 * 60 * 1000;

export const ACTIVITY_LOG_CLIENT_GEO_HEADER = "X-Activity-Client-Geo";

export function clearStoredActivityLogClientGeo(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Await before POST /auth/login so the login activity log can include browser coordinates.
 * Shows the native permission dialog if needed.
 */
export function captureGeolocationForAudit(timeoutMs = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      resolve(false);
      return;
    }
    const timer = window.setTimeout(() => resolve(false), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        storeActivityLogClientGeo({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        resolve(true);
      },
      () => {
        window.clearTimeout(timer);
        resolve(false);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

/** After sign-in: prompt once per tab session if we still have no stored coords. */
export function requestGeolocationAfterLoginIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (readStoredClientGeo()) return;
  try {
    if (sessionStorage.getItem(LOGIN_GEO_PROMPT_KEY)) return;
    sessionStorage.setItem(LOGIN_GEO_PROMPT_KEY, "1");
  } catch {
    return;
  }
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      storeActivityLogClientGeo({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    },
    () => {
      /* denied or unavailable */
    },
    { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 }
  );
}

/** Call on logout / session expiry so the next sign-in can prompt again. */
export function resetActivityLogGeoForSignOut(): void {
  clearStoredActivityLogClientGeo();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(LOGIN_GEO_PROMPT_KEY);
    } catch {
      /* ignore */
    }
  }
}

export type StoredClientGeo = {
  lat: number;
  lng: number;
  accuracy: number;
  ts: number;
};

export function storeActivityLogClientGeo(coords: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}): void {
  if (typeof window === "undefined") return;
  const payload: StoredClientGeo = {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: Number.isFinite(coords.accuracy ?? NaN) ? Number(coords.accuracy) : 0,
    ts: Date.now(),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** Comma-separated lat,lng,accuracyM,epochMs for the backend parser. */
export function getActivityLogClientGeoHeaderValue(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<StoredClientGeo>;
    if (
      typeof o.lat !== "number" ||
      typeof o.lng !== "number" ||
      typeof o.ts !== "number" ||
      !Number.isFinite(o.lat) ||
      !Number.isFinite(o.lng)
    ) {
      return null;
    }
    if (Date.now() - o.ts > CLIENT_GEO_MAX_AGE_MS) return null;
    const accuracy = typeof o.accuracy === "number" && Number.isFinite(o.accuracy) ? o.accuracy : 0;
    return `${o.lat},${o.lng},${accuracy},${o.ts}`;
  } catch {
    return null;
  }
}

export function readStoredClientGeo(): StoredClientGeo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<StoredClientGeo>;
    if (
      typeof o.lat !== "number" ||
      typeof o.lng !== "number" ||
      typeof o.ts !== "number" ||
      !Number.isFinite(o.lat) ||
      !Number.isFinite(o.lng)
    ) {
      return null;
    }
    const accuracy = typeof o.accuracy === "number" && Number.isFinite(o.accuracy) ? o.accuracy : 0;
    return { lat: o.lat, lng: o.lng, accuracy, ts: o.ts };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Real public IP (client-side, via api.ipify.org)
// ---------------------------------------------------------------------------

const REAL_IP_STORAGE_KEY = "dharwin_platform_real_ip";

/** Returns the cached real IP from sessionStorage (may be null). */
export function getStoredRealIp(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(REAL_IP_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetches the user's real public IP once from api.ipify.org and caches it in
 * sessionStorage. Returns the IP string, or null on failure/timeout.
 * Safe to call multiple times — resolves immediately from cache after first call.
 */
export async function fetchAndStoreRealIp(timeoutMs = 8000): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const cached = getStoredRealIp();
  if (cached) return cached;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { ip?: string };
    const ip = data?.ip ?? null;
    if (ip && typeof ip === "string") {
      try {
        sessionStorage.setItem(REAL_IP_STORAGE_KEY, ip);
      } catch { /* ignore */ }
      return ip;
    }
    return null;
  } catch {
    return null;
  }
}

/** Clears the cached real IP — call on sign-out so the next session re-fetches. */
export function clearStoredRealIp(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(REAL_IP_STORAGE_KEY);
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// IP → location lookup (via ipapi.co)
// ---------------------------------------------------------------------------

/** True for loopback IPs that indicate a local proxy (127.x.x.x, ::1). */
export function isLocalhostIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  return ip === "::1" || ip.startsWith("127.") || ip.toLowerCase() === "localhost";
}

export interface IpGeoResult {
  city?: string;
  region?: string;
  country?: string;
  /** Formatted "City, Region, Country" string. */
  display: string;
}

const IP_GEO_CACHE_PREFIX = "dharwin_ip_geo_";

/**
 * Resolves city/region/country for `ip` via ipapi.co (free, no API key).
 * Results are cached in sessionStorage so each unique IP is only fetched once per session.
 */
export async function fetchIpGeoFromIp(ip: string, timeoutMs = 8000): Promise<IpGeoResult | null> {
  if (!ip || typeof window === "undefined") return null;
  const cacheKey = IP_GEO_CACHE_PREFIX + ip;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as IpGeoResult;
  } catch { /* ignore */ }
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      city?: string; region?: string; country_name?: string; error?: boolean;
    };
    if (data?.error) return null;
    const result: IpGeoResult = {
      city: data.city ?? undefined,
      region: data.region ?? undefined,
      country: data.country_name ?? undefined,
      display: [data.city, data.region, data.country_name].filter(Boolean).join(", "),
    };
    try { sessionStorage.setItem(cacheKey, JSON.stringify(result)); } catch { /* ignore */ }
    return result;
  } catch {
    return null;
  }
}
/**
 * Returns the cached IP-based location (city, region, country) from sessionStorage.
 */
export function getStoredIpGeo(): IpGeoResult | null {
  if (typeof window === "undefined") return null;
  const ip = getStoredRealIp();
  if (!ip) return null;
  const cacheKey = IP_GEO_CACHE_PREFIX + ip;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as IpGeoResult;
  } catch {
    /* ignore */
  }
  return null;
}
