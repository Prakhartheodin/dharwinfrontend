"use client";

import { useCallback, useEffect, useState } from "react";
import {
  captureGeolocationForAudit,
  fetchAndStoreRealIp,
  readStoredClientGeo,
  type StoredClientGeo,
} from "@/shared/lib/activity-log-client-geo";

export type GeoPermissionStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface ClientGeoAndIp {
  /** The user's real public IP, or null while loading / on failure. */
  realIp: string | null;
  /** Whether the IP fetch is in progress. */
  ipLoading: boolean;
  /** Current browser geolocation permission state. */
  geoStatus: GeoPermissionStatus;
  /** The stored GPS fix (if granted). */
  storedGeo: StoredClientGeo | null;
  /** Call this to trigger the native geolocation permission prompt. */
  requestGeo: () => void;
}

/**
 * Hook used by the platform audit page to:
 * 1. Fetch the user's real outbound IP from api.ipify.org (once per session).
 * 2. Reflect / request browser geolocation permission.
 */
export function useClientGeoAndIp(): ClientGeoAndIp {
  const [realIp, setRealIp] = useState<string | null>(null);
  const [ipLoading, setIpLoading] = useState(true);
  const [geoStatus, setGeoStatus] = useState<GeoPermissionStatus>("idle");
  const [storedGeo, setStoredGeo] = useState<StoredClientGeo | null>(null);

  // ── Fetch real IP once on mount ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ip = await fetchAndStoreRealIp();
      if (!cancelled) {
        setRealIp(ip);
        setIpLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Seed geo status from already-stored coords ────────────────────────────
  useEffect(() => {
    const existing = readStoredClientGeo();
    if (existing) {
      setStoredGeo(existing);
      setGeoStatus("granted");
      return;
    }
    // Check the Permissions API (non-blocking) if available
    if (typeof window === "undefined" || !navigator.permissions) {
      setGeoStatus(navigator?.geolocation ? "idle" : "unavailable");
      return;
    }
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "granted") {
          // Already granted — silently capture so we have fresh coords
          captureGeolocationForAudit(10000).then((ok) => {
            if (ok) {
              const geo = readStoredClientGeo();
              setStoredGeo(geo);
              setGeoStatus("granted");
            } else {
              setGeoStatus("denied");
            }
          });
        } else if (result.state === "denied") {
          setGeoStatus("denied");
        } else {
          setGeoStatus("idle"); // "prompt" — user hasn't decided yet
        }
      })
      .catch(() => {
        setGeoStatus(navigator?.geolocation ? "idle" : "unavailable");
      });
  }, []);

  // ── Manual trigger ─────────────────────────────────────────────────────────
  const requestGeo = useCallback(() => {
    if (!navigator?.geolocation) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("requesting");
    captureGeolocationForAudit(15000).then((ok) => {
      if (ok) {
        const geo = readStoredClientGeo();
        setStoredGeo(geo);
        setGeoStatus("granted");
      } else {
        setGeoStatus("denied");
      }
    });
  }, []);

  return { realIp, ipLoading, geoStatus, storedGeo, requestGeo };
}
