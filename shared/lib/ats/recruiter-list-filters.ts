import type { ListRecruitersParams } from '@/shared/lib/api/users';

export interface RecruiterSidebarFilters {
  name: string[];
  domain: string[];
  education: string[];
  location: string[];
  email: string;
}

export interface RecruiterListQueryInput {
  page: number;
  limit: number;
  sortBy: string;
  search?: string;
  filters: RecruiterSidebarFilters;
}

export function filterRecruiterFacetOptions(options: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((option) => option.toLowerCase().includes(q));
}

export function buildRecruiterListParams(input: RecruiterListQueryInput): ListRecruitersParams {
  const params: ListRecruitersParams = {
    page: input.page,
    limit: input.limit,
    sortBy: input.sortBy,
  };

  if (input.search?.trim()) {
    params.search = input.search.trim();
  }
  if (input.filters.name.length) {
    params.names = input.filters.name;
  }
  if (input.filters.domain.length) {
    params.domains = input.filters.domain;
  }
  if (input.filters.education.length) {
    params.education = input.filters.education;
  }
  if (input.filters.location.length) {
    params.locations = input.filters.location;
  }
  if (input.filters.email.trim()) {
    params.email = input.filters.email.trim();
  }

  return params;
}

export function buildRecruiterExportParams(input: RecruiterListQueryInput): ListRecruitersParams {
  const { page: _page, limit: _limit, ...params } = buildRecruiterListParams({
    ...input,
    page: 1,
    limit: input.limit ?? 10,
  });
  return params;
}
