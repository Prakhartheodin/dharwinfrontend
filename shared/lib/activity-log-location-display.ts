import type { ActivityLog } from "@/shared/lib/types";

/** Prefer API `displayIp`, then stored `clientIp` (browser ipify), then server `ip`. */
export function getActivityLogDisplayIp(
  log: Pick<ActivityLog, "displayIp" | "clientIp" | "ip">
): string {
  const d = log.displayIp?.trim();
  if (d) return d;
  const c = log.clientIp?.trim();
  if (c) return c;
  const s = log.ip?.trim();
  return s || "—";
}

/** City/region/country from server IP (+ GeoLite / edge), not browser GPS. */
export function formatActivityLogIpGeoLine(geo: ActivityLog["geo"]): string {
  if (!geo) return "—";
  const parts = [geo.city, geo.region, geo.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

/** Reverse-geocoded place from device GPS (stored on the log). */
export function formatActivityLogClientGeoPlaceLine(
  c: ActivityLog["clientGeo"] | null | undefined
): string {
  if (!c) return "";
  const parts = [c.city, c.region, c.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "";
}

/** Browser-reported coordinates when stored on the log entry (legacy “Browser:” single-line). */
export function formatActivityLogClientGeoLine(c: ActivityLog["clientGeo"] | null | undefined): string {
  const coords = formatActivityLogClientGeoCoords(c);
  return coords ? `Browser: ${coords}` : "";
}

/** Coordinates only — for a muted secondary line under city/region/country. */
export function formatActivityLogClientGeoCoords(c: ActivityLog["clientGeo"] | null | undefined): string {
  if (!c || (c.lat == null && c.lng == null)) return "";
  const lat = typeof c.lat === "number" ? c.lat.toFixed(5) : "";
  const lng = typeof c.lng === "number" ? c.lng.toFixed(5) : "";
  const acc =
    typeof c.accuracyM === "number" && Number.isFinite(c.accuracyM)
      ? ` ±${Math.round(c.accuracyM)} m`
      : "";
  if (!lat && !lng) return "";
  return `${lat}, ${lng}${acc}`;
}
