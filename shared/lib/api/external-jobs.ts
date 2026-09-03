"use client";

import { apiClient } from "@/shared/lib/api/client";

export type ExternalJobSource = "active-jobs-db" | "linkedin-job-search-api" | "linkedin-jobs-api";

export interface ExternalJob {
  externalId: string;
  source: ExternalJobSource;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  locationMeta?: { city?: string; state?: string; country?: string; countryCode?: string } | null;
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

export type ExternalJobWorkArrangement = "" | "remote_ok" | "remote_solely" | "remote_both";

export interface ExternalJobSearchFilters {
  job_title?: string;
  job_location?: string;
  offset?: number;
  date_posted?: string;
  work_arrangement?: ExternalJobWorkArrangement;
  /** @deprecated Prefer work_arrangement */
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
    ...(filters.work_arrangement ? { work_arrangement: filters.work_arrangement } : {}),
  });
  return data;
}

export async function saveExternalJob(job: ExternalJob): Promise<SavedExternalJob> {
  const { data } = await apiClient.post<SavedExternalJob>("/external-jobs/save", job);
  return data;
}

/** Shared by both saved lists. Blank values are dropped rather than sent as empty keys. */
export interface SavedListParams {
  limit?: number;
  page?: number;
  q?: string;
  /** `YYYY-MM-DD` from a date input, or a full ISO timestamp. */
  savedFrom?: string;
  savedTo?: string;
}

export interface SavedExternalJobsParams extends SavedListParams {
  source?: ExternalJobSource | "";
}

/** No `company`: one search box on the UI, and `q` already spans the company name. */
export type SavedHrContactsParams = SavedListParams;

/**
 * The backend validates with no `allowUnknown`, so an empty-string filter is not merely
 * useless -- it narrows the query to rows with a blank field. Strip anything empty here so
 * a cleared filter box means "no filter" rather than "match nothing".
 */
function compactParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ) as Partial<T>;
}

export async function listSavedExternalJobs(
  params?: SavedExternalJobsParams
): Promise<SavedExternalJobsResponse> {
  const { data } = await apiClient.get<SavedExternalJobsResponse>("/external-jobs/saved", {
    params: compactParams(params ?? {}),
  });
  return data;
}

/**
 * Every saved job's `externalId`, for the bookmark icons on the Search tab.
 *
 * The Saved list is paginated, so it cannot answer "is this job saved?" for a job that
 * happens to sit on another page. This does, in one small request.
 */
export async function listSavedExternalJobIds(): Promise<string[]> {
  const { data } = await apiClient.get<{ ids: string[] }>("/external-jobs/saved/ids");
  return data.ids || [];
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

export interface SavedHrContactsResponse {
  results: SavedHrContact[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function listSavedHrContacts(
  params?: SavedHrContactsParams
): Promise<SavedHrContactsResponse> {
  const { data } = await apiClient.get<SavedHrContactsResponse>('/external-jobs/hr-contacts', {
    params: compactParams(params ?? {}),
  });
  return data;
}

/** Saved contact ids, so the preview panel can tick "saved" without pulling every record. */
export async function listSavedHrContactIds(): Promise<string[]> {
  const { data } = await apiClient.get<{ ids: string[] }>('/external-jobs/hr-contacts/ids');
  return data.ids || [];
}

export async function deleteSavedHrContact(apolloId: string): Promise<void> {
  await apiClient.delete(`/external-jobs/hr-contacts/${encodeURIComponent(apolloId)}`);
}
