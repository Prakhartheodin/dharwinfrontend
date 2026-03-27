/**
 * Browser GPS for activity audit: sent as X-Activity-Client-Geo when the user is signed in
 * and has allowed location (prompt once per browser tab session after login).
 */

const STORAGE_KEY = "dharwin_platform_audit_client_geo";
const LOGIN_GEO_PROMPT_KEY = "dharwin_login_geo_prompted";

export const ACTIVITY_LOG_CLIENT_GEO_HEADER = "X-Activity-Client-Geo";

let attachmentEnabled = false;

export function setActivityLogClientGeoAttachmentEnabled(enabled: boolean): void {
  attachmentEnabled = !!enabled;
}

export function clearStoredActivityLogClientGeo(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** After sign-in: one browser location prompt per tab session (native permission dialog). */
export function requestGeolocationAfterLoginIfNeeded(): void {
  if (typeof window === "undefined") return;
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
    { enableHighAccuracy: false, timeout: 20_000, maximumAge: 120_000 }
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
  setActivityLogClientGeoAttachmentEnabled(false);
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
  if (!attachmentEnabled || typeof window === "undefined") return null;
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
