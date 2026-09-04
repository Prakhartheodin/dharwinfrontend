export type RecruiterSortOption =
  | ''
  | 'name-asc'
  | 'name-desc'
  | 'education-asc'
  | 'education-desc'
  | 'location-asc'
  | 'location-desc';

export const DEFAULT_RECRUITER_SORT_API = 'name:asc';

const SORT_OPTION_TO_API: Record<Exclude<RecruiterSortOption, ''>, string> = {
  'name-asc': 'name:asc',
  'name-desc': 'name:desc',
  'education-asc': 'education:asc',
  'education-desc': 'education:desc',
  'location-asc': 'location:asc',
  'location-desc': 'location:desc',
};

export function isRecruiterSortOption(value: string): value is RecruiterSortOption {
  return value === '' || value in SORT_OPTION_TO_API;
}

export function sortOptionToApiSortBy(option: RecruiterSortOption): string {
  if (!option) return DEFAULT_RECRUITER_SORT_API;
  return SORT_OPTION_TO_API[option] ?? DEFAULT_RECRUITER_SORT_API;
}

/** Split domain field on comma or pipe for badges and filters. */
export function parseRecruiterDomains(domain: string | string[] | undefined | null): string[] {
  if (Array.isArray(domain)) return domain.map((d) => d.trim()).filter(Boolean);
  if (!domain) return [];
  return domain
    .split(/[,|]/)
    .map((d) => d.trim())
    .filter(Boolean);
}
