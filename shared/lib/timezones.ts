/**
 * All IANA timezones for dropdowns. Uses Intl.supportedValuesOf when available,
 * merged with a fallback list so UTC and common zones are always present.
 */
const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Sao_Paulo",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Melbourne",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Pacific/Auckland",
  "Pacific/Fiji",
];

function getTimeZoneList(): string[] {
  if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
    try {
      const fromIntl = (Intl as unknown as { supportedValuesOf(key: string): string[] }).supportedValuesOf("timeZone");
      const set = new Set<string>([...FALLBACK_TIMEZONES, ...fromIntl]);
      return Array.from(set).sort();
    } catch {
      return [...FALLBACK_TIMEZONES].sort();
    }
  }
  return [...FALLBACK_TIMEZONES].sort();
}

let cached: { value: string; label: string }[] | null = null;

/**
 * Returns all timezones for dropdowns: { value: IANA id, label: display string }.
 * Sorted; label includes optional offset for convenience.
 */
export function getAllTimeZones(): { value: string; label: string }[] {
  if (cached) return cached;
  const list = getTimeZoneList();
  cached = list.map((value) => {
    try {
      const offset = getTimezoneOffset(value);
      const label = offset != null ? `${value} (${offset})` : value;
      return { value, label };
    } catch {
      return { value, label: value };
    }
  });
  return cached;
}

function getTimezoneOffset(tz: string): string | null {
  if (typeof Intl === "undefined") return null;
  try {
    const d = new Date();
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "shortOffset" });
    const parts = fmt.formatToParts(d);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    return offsetPart?.value ?? null;
  } catch {
    return null;
  }
}
