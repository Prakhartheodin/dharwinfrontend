export type OfferSortOption =
  | ""
  | "employee-asc"
  | "employee-desc"
  | "joining-asc"
  | "joining-desc"
  | "clear-sort";

const ALLOWED_API_SORTS = new Set([
  "candidate.fullName:asc",
  "candidate.fullName:desc",
  "joiningDate:asc",
  "joiningDate:desc",
]);

/** Public `?sortBy=` values (employee-facing naming). */
const URL_TO_API: Record<string, string> = {
  "employee.fullName:asc": "candidate.fullName:asc",
  "employee.fullName:desc": "candidate.fullName:desc",
  "candidate.fullName:asc": "candidate.fullName:asc",
  "candidate.fullName:desc": "candidate.fullName:desc",
  "joiningDate:asc": "joiningDate:asc",
  "joiningDate:desc": "joiningDate:desc",
};

/** API `sortBy` → canonical URL `?sortBy=` (always employee naming). */
const API_TO_URL: Record<string, string> = {
  "candidate.fullName:asc": "employee.fullName:asc",
  "candidate.fullName:desc": "employee.fullName:desc",
  "joiningDate:asc": "joiningDate:asc",
  "joiningDate:desc": "joiningDate:desc",
};

const UI_TO_API: Record<string, string> = {
  "employee-asc": "candidate.fullName:asc",
  "employee-desc": "candidate.fullName:desc",
  "joining-asc": "joiningDate:asc",
  "joining-desc": "joiningDate:desc",
};

/** Parse `?sortBy=` URL param → API `sortBy` for listOffers. Accepts legacy `candidate.fullName`. */
export function parseOfferSortFromUrl(raw: string | null | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? URL_TO_API[trimmed] : undefined;
}

/** API `sortBy` → canonical URL `?sortBy=` value (employee naming). */
export function apiSortByToUrlSort(sortBy: string | null | undefined): string | undefined {
  if (!sortBy) return undefined;
  return ALLOWED_API_SORTS.has(sortBy) ? API_TO_URL[sortBy] : undefined;
}

/** Toolbar option → `listOffers({ sortBy })` value. */
export function sortOptionToApiSortBy(option: string): string | undefined {
  if (!option || option === "clear-sort") return undefined;
  return UI_TO_API[option];
}

/** API `sortBy` → toolbar option for active-state highlighting. */
export function apiSortByToSortOption(sortBy: string | null | undefined): OfferSortOption {
  const entry = Object.entries(UI_TO_API).find(([, api]) => api === sortBy);
  return (entry?.[0] as OfferSortOption) || "";
}
