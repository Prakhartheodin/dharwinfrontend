/**
 * Browser GPS for activity audit: reverse-geocode to city/region/country, store in sessionStorage,
 * send as JSON in X-Activity-Client-Geo (no precise coordinates persisted on the server).
 * Falls back to legacy lat,lng CSV in the header if reverse geocoding fails (server reverse-geocodes).
 */

const STORAGE_KEY = "dharwin_platform_audit_client_geo";
const LOGIN_GEO_PROMPT_KEY = "dharwin_login_geo_prompted";

/** Match backend CLIENT_GEO_MAX_AGE_MS (30 minutes). */
const CLIENT_GEO_MAX_AGE_MS = 30 * 60 * 1000;

const NOMINATIM_CACHE_PREFIX = "dharwin_nominatim_";
const PLACE_MAX = 128;

/** Persist Nominatim results across sessions (small JSON per ~4-decimal bucket; reduces API spam). */
function readNominatimCache(key: string): { city?: string; region?: string; country?: string } | null {
  if (typeof window === "undefined") return null;
  for (const store of [localStorage, sessionStorage]) {
    try {
      const hit = store.getItem(key);
      if (hit) return JSON.parse(hit) as { city?: string; region?: string; country?: string };
    } catch {
      /* ignore */
    }
  }
  return null;
}

function writeNominatimCache(key: string, value: { city: string | null; region: string | null; country: string | null }): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(value);
  try {
    localStorage.setItem(key, raw);
  } catch {
    /* ignore quota / private mode */
  }
  try {
    sessionStorage.setItem(key, raw);
  } catch {
    /* ignore */
  }
}

/** Nominatim usage policy: identify the application. */
const NOMINATIM_UA =
  "DharwinPlatform/1.0 (audit reverse-geocode; +https://www.openstreetmap.org/copyright)";

export const ACTIVITY_LOG_CLIENT_GEO_HEADER = "X-Activity-Client-Geo";

export type StoredClientGeo = {
  ts: number;
  accuracy: number;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  /** Present only if reverse geocoding failed (ephemeral); server may still resolve via CSV path. */
  lat?: number;
  lng?: number;
};

function trimPlace(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = String(v).trim().slice(0, PLACE_MAX);
  return s || null;
}

/**
 * OpenStreetMap Nominatim reverse (browser). Cached per ~4-decimal bucket (localStorage + sessionStorage).
 */
export async function reverseGeocodeCoordsForAudit(
  lat: number,
  lng: number,
  timeoutMs = 8000
): Promise<{ city: string | null; region: string | null; country: string | null } | null> {
  if (typeof window === "undefined") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const cacheKey = `${NOMINATIM_CACHE_PREFIX}${lat.toFixed(4)}_${lng.toFixed(4)}`;
  const cached = readNominatimCache(cacheKey);
  if (cached) {
    return {
      city: trimPlace(cached.city ?? null),
      region: trimPlace(cached.region ?? null),
      country: trimPlace(cached.country ?? null),
    };
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": NOMINATIM_UA,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: Record<string, string>;
    };
    const addr = data?.address ?? {};
    const city = trimPlace(
      addr.city ||
        addr.town ||
        addr.village ||
        addr.hamlet ||
        addr.municipality ||
        addr.county ||
        null
    );
    const region = trimPlace(addr.state || addr.region || null);
    const country = trimPlace(addr.country || null);
    if (!city && !region && !country) return null;
    const out = { city, region, country };
    writeNominatimCache(cacheKey, out);
    return out;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export function clearStoredActivityLogClientGeo(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Human-readable line for banners (place name or coordinates fallback). */
export function formatStoredClientGeoLine(geo: StoredClientGeo | null): string {
  if (!geo) return "";
  const parts = [geo.city, geo.region, geo.country].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (typeof geo.lat === "number" && typeof geo.lng === "number") {
    return `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`;
  }
  return "";
}

/**
 * Await before POST /auth/login so the login activity log can include browser location.
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
        void (async () => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          const places = await reverseGeocodeCoordsForAudit(lat, lng, Math.min(timeoutMs, 8000));
          if (places && (places.city || places.region || places.country)) {
            storeActivityLogClientGeo({
              accuracy,
              city: places.city,
              region: places.region,
              country: places.country,
            });
          } else {
            storeActivityLogClientGeo({
              latitude: lat,
              longitude: lng,
              accuracy,
            });
          }
          resolve(true);
        })();
      },
      () => {
        window.clearTimeout(timer);
        resolve(false);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

/** After sign-in: prompt once per tab session if we still have no stored location. */
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
      void (async () => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const places = await reverseGeocodeCoordsForAudit(lat, lng, 8000);
        if (places && (places.city || places.region || places.country)) {
          storeActivityLogClientGeo({
            accuracy: pos.coords.accuracy,
            city: places.city,
            region: places.region,
            country: places.country,
          });
        } else {
          storeActivityLogClientGeo({
            latitude: lat,
            longitude: lng,
            accuracy: pos.coords.accuracy,
          });
        }
      })();
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
  clearStoredRealIp();
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(LOGIN_GEO_PROMPT_KEY);
  } catch {
    /* ignore */
  }
}

export function storeActivityLogClientGeo(input: {
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): void {
  if (typeof window === "undefined") return;
  const ts = Date.now();
  const accuracy = Number.isFinite(input.accuracy ?? NaN) ? Number(input.accuracy) : 0;
  const city = trimPlace(input.city ?? null);
  const region = trimPlace(input.region ?? null);
  const country = trimPlace(input.country ?? null);
  const hasPlace = Boolean(city || region || country);

  const payload: StoredClientGeo = hasPlace
    ? { ts, accuracy, city, region, country }
    : {
        ts,
        accuracy,
        lat: input.latitude!,
        lng: input.longitude!,
      };

  if (!hasPlace) {
    if (
      typeof payload.lat !== "number" ||
      typeof payload.lng !== "number" ||
      !Number.isFinite(payload.lat) ||
      !Number.isFinite(payload.lng)
    ) {
      return;
    }
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/**
 * Browsers reject `setRequestHeader` values containing code points outside ISO-8859-1.
 * `JSON.stringify` emits raw UTF-16 for non-ASCII (e.g. Devanagari in OSM place names), which breaks XHR.
 * Escape to ASCII-only JSON; `JSON.parse` on the server restores Unicode.
 */
function jsonStringifyIso8859SafeForHeader(value: object): string {
  const raw = JSON.stringify(value);
  let out = "";
  for (let i = 0; i < raw.length; ) {
    const code = raw.codePointAt(i)!;
    if (code <= 0x7f) {
      out += raw[i];
      i += 1;
    } else if (code <= 0xffff) {
      out += "\\u" + code.toString(16).padStart(4, "0");
      i += 1;
    } else {
      const u = code - 0x10000;
      out += "\\u" + (0xd800 + (u >> 10)).toString(16).padStart(4, "0");
      out += "\\u" + (0xdc00 + (u & 0x3ff)).toString(16).padStart(4, "0");
      i += 2;
    }
  }
  return out;
}

/** JSON (preferred) or legacy CSV for the backend parser. */
export function getActivityLogClientGeoHeaderValue(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<StoredClientGeo>;
    if (typeof o.ts !== "number" || !Number.isFinite(o.ts)) return null;
    if (Date.now() - o.ts > CLIENT_GEO_MAX_AGE_MS) return null;

    const accuracy = typeof o.accuracy === "number" && Number.isFinite(o.accuracy) ? o.accuracy : 0;
    const city = trimPlace(o.city ?? null);
    const region = trimPlace(o.region ?? null);
    const country = trimPlace(o.country ?? null);
    if (city || region || country) {
      return jsonStringifyIso8859SafeForHeader({
        ts: o.ts,
        accuracy,
        city: city ?? undefined,
        region: region ?? undefined,
        country: country ?? undefined,
      });
    }

    if (
      typeof o.lat === "number" &&
      typeof o.lng === "number" &&
      Number.isFinite(o.lat) &&
      Number.isFinite(o.lng)
    ) {
      return jsonStringifyIso8859SafeForHeader({
        ts: o.ts,
        accuracy,
        lat: o.lat,
        lng: o.lng,
      });
    }
    return null;
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
    if (typeof o.ts !== "number" || !Number.isFinite(o.ts)) return null;
    if (Date.now() - o.ts > CLIENT_GEO_MAX_AGE_MS) return null;
    const accuracy = typeof o.accuracy === "number" && Number.isFinite(o.accuracy) ? o.accuracy : 0;
    const city = trimPlace(o.city ?? null);
    const region = trimPlace(o.region ?? null);
    const country = trimPlace(o.country ?? null);
    if (city || region || country) {
      return { ts: o.ts, accuracy, city, region, country };
    }
    if (
      typeof o.lat === "number" &&
      typeof o.lng === "number" &&
      Number.isFinite(o.lat) &&
      Number.isFinite(o.lng)
    ) {
      return { ts: o.ts, accuracy, lat: o.lat, lng: o.lng };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Real public IP (client-side, via api.ipify.org)
// ---------------------------------------------------------------------------

const REAL_IP_STORAGE_KEY = "dharwin_platform_real_ip";

/** Sent on API requests as `x-client-ip` for audit logging when proxy `req.ip` is wrong. */
export const X_CLIENT_IP_HEADER = "x-client-ip";

/** Returns the cached real IP from localStorage (legacy sessionStorage read once for migration). */
export function getStoredRealIp(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLocal = localStorage.getItem(REAL_IP_STORAGE_KEY);
    if (fromLocal) return fromLocal;
    const legacy = sessionStorage.getItem(REAL_IP_STORAGE_KEY);
    if (legacy) {
      try {
        localStorage.setItem(REAL_IP_STORAGE_KEY, legacy);
        sessionStorage.removeItem(REAL_IP_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches the user's real public IP once from api.ipify.org and caches it in
 * localStorage. Returns the IP string, or null on failure/timeout.
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
        localStorage.setItem(REAL_IP_STORAGE_KEY, ip);
        try {
          sessionStorage.removeItem(REAL_IP_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      }
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
    localStorage.removeItem(REAL_IP_STORAGE_KEY);
    sessionStorage.removeItem(REAL_IP_STORAGE_KEY);
  } catch {
    /* ignore */
  }
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
  } catch {
    /* ignore */
  }
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      city?: string;
      region?: string;
      country_name?: string;
      error?: boolean;
    };
    if (data?.error) return null;
    const result: IpGeoResult = {
      city: data.city ?? undefined,
      region: data.region ?? undefined,
      country: data.country_name ?? undefined,
      display: [data.city, data.region, data.country_name].filter(Boolean).join(", "),
    };
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      /* ignore */
    }
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
