import type { ActivityLog } from "@/shared/lib/types";

/** City/region/country from server IP (+ GeoLite / edge), not browser GPS. */
export function formatActivityLogIpGeoLine(geo: ActivityLog["geo"]): string {
  if (!geo) return "—";
  const parts = [geo.city, geo.region, geo.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

/** Browser-reported coordinates when stored on the log entry. */
export function formatActivityLogClientGeoLine(c: ActivityLog["clientGeo"] | null | undefined): string {
  if (!c || (c.lat == null && c.lng == null)) return "";
  const lat = typeof c.lat === "number" ? c.lat.toFixed(5) : "";
  const lng = typeof c.lng === "number" ? c.lng.toFixed(5) : "";
  const acc =
    typeof c.accuracyM === "number" && Number.isFinite(c.accuracyM)
      ? ` ±${Math.round(c.accuracyM)} m`
      : "";
  if (!lat && !lng) return "";
  return `Browser: ${lat}, ${lng}${acc}`;
}
