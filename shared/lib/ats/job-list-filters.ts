import type { JobsListParams } from "@/shared/lib/api/jobs";

export interface JobSidebarFilters {
  jobTitle: string[];
  company: string[];
  location: string[];
  experience: [number, number];
  salary: [number, number];
  salaryNotSpecified: boolean;
  status: string;
  postingDate: string;
}

export interface JobListQueryInput {
  page: number;
  limit: number;
  sortBy: string;
  search?: string;
  listJobOrigin: "" | "internal" | "external";
  filters: JobSidebarFilters;
  salaryBounds: { min: number; max: number };
  experienceBounds: { min: number; max: number };
}

export function isSalaryFilterActive(
  filters: JobSidebarFilters,
  bounds: { min: number; max: number }
): boolean {
  if (filters.salaryNotSpecified) return true;
  return filters.salary[0] !== bounds.min || filters.salary[1] !== bounds.max;
}

export function isExperienceFilterActive(
  filters: JobSidebarFilters,
  bounds: { min: number; max: number }
): boolean {
  return filters.experience[0] !== bounds.min || filters.experience[1] !== bounds.max;
}

export function buildJobListParams(input: JobListQueryInput): JobsListParams {
  const params: JobsListParams = {
    page: input.page,
    limit: input.limit,
    sortBy: input.sortBy,
  };

  if (input.search?.trim()) {
    params.search = input.search.trim();
  }

  if (input.listJobOrigin === "internal" || input.listJobOrigin === "external") {
    params.jobOrigin = input.listJobOrigin;
  }

  if (input.filters.status && input.filters.status !== "all") {
    params.status = input.filters.status;
  } else if (input.filters.status === "all") {
    params.status = "all";
  }

  if (input.filters.jobTitle.length) {
    params.titles = input.filters.jobTitle;
  }
  if (input.filters.company.length) {
    params.companies = input.filters.company;
  }
  if (input.filters.location.length) {
    params.locations = input.filters.location;
  }
  if (input.filters.postingDate) {
    params.postingDate = input.filters.postingDate;
  }

  filtersSalary(input, params);

  if (isExperienceFilterActive(input.filters, input.experienceBounds)) {
    params.experienceMin = input.filters.experience[0];
    params.experienceMax = input.filters.experience[1];
  }

  return params;
}

function filtersSalary(input: JobListQueryInput, params: JobsListParams): void {
  if (input.filters.salaryNotSpecified) {
    params.salaryNotSpecified = true;
    return;
  }
  if (isSalaryFilterActive(input.filters, input.salaryBounds)) {
    params.salaryMin = input.filters.salary[0];
    params.salaryMax = input.filters.salary[1];
  }
}

export function buildJobExportParams(input: JobListQueryInput): Omit<JobsListParams, "page" | "limit"> {
  const { page: _page, limit: _limit, ...params } = buildJobListParams({
    ...input,
    page: 1,
    limit: input.limit ?? 10,
  });
  return params;
}

export function filterJobFacetOptions(options: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return options.filter((option) => option.toLowerCase().includes(q));
}
