"use client";

import { apiClient } from "@/shared/lib/api/client";

export type ExternalJobSource = "active-jobs-db" | "linkedin-jobs-api";

export interface ExternalJob {
  externalId: string;
  source: ExternalJobSource;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  description?: string | null;
  jobType?: string | null;
  experienceLevel?: string | null;
  isRemote?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  platformUrl?: string | null;
  postedAt?: string | null;
  timePosted?: string | null;
}

export interface ExternalJobSearchFilters {
  job_title?: string;
  job_location?: string;
  offset?: number;
  date_posted?: string;
  remote?: boolean | string;
  source: ExternalJobSource;
}

export interface ExternalJobSearchResponse {
  jobs: ExternalJob[];
  total: number;
  hasMore: boolean;
}

export interface SavedExternalJob extends ExternalJob {
  id?: string;
  savedAt?: string;
}

export interface SavedExternalJobsResponse {
  results: SavedExternalJob[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function searchExternalJobs(
  filters: ExternalJobSearchFilters
): Promise<ExternalJobSearchResponse> {
  const { data } = await apiClient.post<ExternalJobSearchResponse>("/external-jobs/search", {
    source: filters.source,
    job_title: filters.job_title || "",
    job_location: filters.job_location || "",
    offset: filters.offset ?? 0,
    date_posted: filters.date_posted || "24h",
    remote: filters.remote,
  });
  return data;
}

export async function saveExternalJob(job: ExternalJob): Promise<SavedExternalJob> {
  const { data } = await apiClient.post<SavedExternalJob>("/external-jobs/save", job);
  return data;
}

export async function listSavedExternalJobs(params?: {
  limit?: number;
  page?: number;
}): Promise<SavedExternalJobsResponse> {
  const { data } = await apiClient.get<SavedExternalJobsResponse>("/external-jobs/saved", {
    params,
  });
  return data;
}

export async function unsaveExternalJob(
  externalId: string,
  source: ExternalJobSource
): Promise<void> {
  await apiClient.delete(`/external-jobs/saved/${encodeURIComponent(externalId)}`, {
    params: { source },
  });
}
