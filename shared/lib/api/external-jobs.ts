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

export interface ApolloContact {
  apolloId: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phoneFetched: boolean;
  phoneNumbers?: { rawNumber: string; sanitizedNumber: string; typeCd: string }[];
  linkedinUrl?: string;
  location?: string;
}

export interface SavedHrContact extends ApolloContact {
  id?: string;
  companyName?: string;
  savedAt?: string;
}

export interface ApolloEnrichResponse {
  contacts: ApolloContact[];
}

export async function enrichExternalJobContacts(
  company: string,
  externalId: string,
  location?: string | null
): Promise<ApolloEnrichResponse> {
  const { data } = await apiClient.post<ApolloEnrichResponse>('/external-jobs/enrich', {
    company,
    externalId,
    ...(location ? { location } : {}),
  });
  return data;
}

export async function saveHrContact(contact: ApolloContact & { companyName?: string }): Promise<SavedHrContact> {
  const { data } = await apiClient.post<SavedHrContact>('/external-jobs/hr-contacts', contact);
  return data;
}

export async function listSavedHrContacts(): Promise<{ contacts: SavedHrContact[] }> {
  const { data } = await apiClient.get<{ contacts: SavedHrContact[] }>('/external-jobs/hr-contacts');
  return data;
}

export async function deleteSavedHrContact(apolloId: string): Promise<void> {
  await apiClient.delete(`/external-jobs/hr-contacts/${encodeURIComponent(apolloId)}`);
}
