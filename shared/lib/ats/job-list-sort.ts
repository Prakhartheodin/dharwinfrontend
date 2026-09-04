export type JobSortOption =
  | ""
  | "newest-first"
  | "oldest-first"
  | "title-asc"
  | "title-desc"
  | "company-asc"
  | "company-desc"
  | "location-asc"
  | "location-desc"
  | "experience-asc"
  | "experience-desc"
  | "clear-sort";

export const DEFAULT_JOB_SORT_API = "createdAt:desc";

const UI_TO_API: Record<string, string> = {
  "newest-first": "createdAt:desc",
  "date-newest": "createdAt:desc",
  "oldest-first": "createdAt:asc",
  "date-oldest": "createdAt:asc",
  "title-asc": "title:asc",
  "title-desc": "title:desc",
  "company-asc": "organisation.name:asc",
  "company-desc": "organisation.name:desc",
  "location-asc": "location:asc",
  "location-desc": "location:desc",
  "experience-asc": "minExperience:asc",
  "experience-desc": "minExperience:desc",
};

export function sortOptionToApiSortBy(option: string): string {
  if (!option || option === "clear-sort") return DEFAULT_JOB_SORT_API;
  return UI_TO_API[option] ?? DEFAULT_JOB_SORT_API;
}

export function apiSortByToSortOption(sortBy: string): JobSortOption {
  const entry = Object.entries(UI_TO_API).find(([, api]) => api === sortBy);
  return (entry?.[0] as JobSortOption) || "newest-first";
}
