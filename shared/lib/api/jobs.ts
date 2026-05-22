"use client";

import axios from "axios";
import { apiClient, API_MUTATION_TIMEOUT_MS, normalizeApiBase } from "@/shared/lib/api/client";

export type CompanySizeBucket =
  | '1-10'
  | '11-50'
  | '51-200'
  | '201-500'
  | '501-1000'
  | '1001-5000'
  | '5000+';

export const COMPANY_SIZE_BUCKETS: readonly CompanySizeBucket[] = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5000+',
];

export interface JobOrganisation {
  name: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  /** Company-information fields surfaced in the job details panel. */
  industry?: string;
  founded?: number | null;
  companySize?: CompanySizeBucket | string;
}

export interface JobSalaryRange {
  min?: number | null;
  max?: number | null;
  currency?: string;
}

export interface Job {
  _id?: string;
  id?: string;
  title: string;
  organisation: JobOrganisation;
  jobDescription: string;
  jobType: string;
  location: string;
  skillTags?: string[];
  salaryRange?: JobSalaryRange;
  experienceLevel?: string | null;
  /** Numeric experience-years range (SSoT for the listing/details Experience string). */
  minExperience?: number | null;
  maxExperience?: number | null;
  /** Number of openings for this posting. */
  vacancies?: number | null;
  status: string;
  /** internal = ATS-created; external = mirrored from saved external listing */
  jobOrigin?: "internal" | "external";
  externalRef?: { externalId: string; source: string };
  externalPlatformUrl?: string;
  createdBy?: { _id: string; name?: string; email?: string } | { id: string; name?: string };
  createdAt?: string;
  updatedAt?: string;
}

export function isExternalJob(job: { jobOrigin?: string }): boolean {
  return job.jobOrigin === "external";
}

export interface JobsListParams {
  title?: string;
  jobType?: string;
  location?: string;
  status?: string;
  experienceLevel?: string;
  createdBy?: string;
  search?: string;
  forCandidates?: boolean;
  jobOrigin?: "internal" | "external";
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface JobsListResponse {
  results: Job[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function listJobs(
  params?: JobsListParams,
  requestConfig?: { signal?: AbortSignal }
): Promise<JobsListResponse> {
  const { data } = await apiClient.get<JobsListResponse>("/jobs", { params, ...requestConfig });
  return data;
}

export async function getJobById(id: string): Promise<Job> {
  const { data } = await apiClient.get<Job>(`/jobs/${id}`);
  return data;
}

export interface CreateJobPayload {
  title: string;
  organisation: JobOrganisation;
  jobDescription: string;
  jobType: string;
  location: string;
  skillTags?: string[];
  salaryRange?: JobSalaryRange;
  experienceLevel?: string | null;
  minExperience?: number | null;
  maxExperience?: number | null;
  vacancies?: number | null;
  status?: string;
}

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  const { data } = await apiClient.post<Job>("/jobs", payload);
  return data;
}

export interface UpdateJobPayload {
  title?: string;
  organisation?: Partial<JobOrganisation>;
  jobDescription?: string;
  jobType?: string;
  location?: string;
  skillTags?: string[];
  salaryRange?: JobSalaryRange;
  experienceLevel?: string | null;
  minExperience?: number | null;
  maxExperience?: number | null;
  vacancies?: number | null;
  status?: string;
}

export async function updateJob(id: string, payload: UpdateJobPayload): Promise<Job> {
  const { data } = await apiClient.patch<Job>(`/jobs/${id}`, payload);
  return data;
}

export async function deleteJob(id: string): Promise<void> {
  await apiClient.delete(`/jobs/${id}`);
}

export interface BrowseJobsParams {
  search?: string;
  jobType?: string;
  location?: string;
  experienceLevel?: string;
  jobOrigin?: "internal" | "external";
  sortBy?: string;
  limit?: number;
  page?: number;
}

export async function browseJobs(params?: BrowseJobsParams): Promise<JobsListResponse> {
  const { data } = await apiClient.get<JobsListResponse>("/jobs/browse", { params });
  return data;
}

export async function browseJobById(id: string): Promise<Job> {
  const { data } = await apiClient.get<Job>(`/jobs/browse/${id}`);
  return data;
}

export interface BrowseApplyResponse {
  application: unknown;
  candidateId: string;
}

export async function browseApplyToJob(
  jobId: string,
  body?: { ref?: string }
): Promise<BrowseApplyResponse> {
  const { data } = await apiClient.post<BrowseApplyResponse>(`/jobs/browse/${jobId}/apply`, body ?? {});
  return data;
}

export async function exportJobsToExcel(params?: JobsListParams): Promise<Blob> {
  const { data } = await apiClient.get<Blob>("/jobs/export/excel", {
    params,
    responseType: "blob",
  });
  return data;
}

export async function downloadJobsTemplate(): Promise<Blob> {
  const { data } = await apiClient.get<Blob>("/jobs/template/excel", { responseType: "blob" });
  return data;
}

export async function applyToJob(jobId: string, candidateId: string): Promise<unknown> {
  const { data } = await apiClient.post(`/jobs/${jobId}/apply`, { candidateId });
  return data;
}

export async function shareJobByEmail(jobId: string, to: string, message?: string): Promise<{ message: string }> {
  const id = String(jobId || "").trim();
  if (!id) {
    throw new Error("Job id is missing — close the share dialog and try again.");
  }
  const { data } = await apiClient.post<{ message: string }>(
    `/jobs/${id}/share-email`,
    { to, message },
    { timeout: API_MUTATION_TIMEOUT_MS }
  );
  return data;
}

export type JobTemplateVisibility = "public" | "private";

export interface JobTemplate {
  _id: string;
  title: string;
  jobDescription: string;
  visibility?: JobTemplateVisibility;
  // Optional structured defaults (full prefill). All optional — older templates
  // saved before this field set was added simply return undefined for these.
  jobType?: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Internship' | 'Freelance' | null;
  location?: string | null;
  skillTags?: string[];
  salaryRange?: { min?: number | null; max?: number | null; currency?: string } | null;
  experienceLevel?: 'Entry Level' | 'Mid Level' | 'Senior Level' | 'Executive' | null;
  education?: string | null;
  createdAt?: string;
  updatedAt?: string;
  usageCount?: number;
  lastUsedAt?: string | null;
  createdBy?: { _id?: string; name?: string; email?: string };
}

export interface JobTemplateUpsertExtras {
  jobType?: JobTemplate['jobType'];
  location?: string | null;
  skillTags?: string[];
  salaryRange?: JobTemplate['salaryRange'];
  experienceLevel?: JobTemplate['experienceLevel'];
  education?: string | null;
}

export interface JobTemplatesResponse {
  results: JobTemplate[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function listJobTemplates(params?: { limit?: number; page?: number }): Promise<JobTemplatesResponse> {
  const { data } = await apiClient.get<JobTemplatesResponse>("/jobs/templates", { params });
  return data;
}

export async function getJobTemplate(id: string): Promise<JobTemplate> {
  const { data } = await apiClient.get<JobTemplate>(`/jobs/templates/${id}`);
  return data;
}

export async function createJobTemplate(payload: {
  title: string;
  jobDescription: string;
  visibility?: JobTemplateVisibility;
} & JobTemplateUpsertExtras): Promise<JobTemplate> {
  const { data } = await apiClient.post<JobTemplate>("/jobs/templates", payload);
  return data;
}

export async function updateJobTemplate(
  id: string,
  payload: { title?: string; jobDescription?: string; visibility?: JobTemplateVisibility } & JobTemplateUpsertExtras,
): Promise<JobTemplate> {
  const { data } = await apiClient.patch<JobTemplate>(`/jobs/templates/${id}`, payload);
  return data;
}

export async function deleteJobTemplate(id: string): Promise<void> {
  await apiClient.delete(`/jobs/templates/${id}`);
}

export async function importJobsFromExcel(file: File): Promise<{
  message: string;
  results?: { successful: unknown[]; failed: unknown[] };
  summary?: { total: number; successful: number; failed: number };
}> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post("/jobs/import/excel", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ============================================
// PUBLIC JOB APIS (No Authentication Required)
// ============================================

/** No auth interceptors; same base URL + credentials as apiClient for cookie-based login after apply. */
const publicApiClient = axios.create({
  baseURL: normalizeApiBase(),
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export interface PublicJobsListParams {
  title?: string;
  /** Full-text style search (same as browse jobs) */
  search?: string;
  location?: string;
  jobType?: string;
  experienceLevel?: string;
  jobOrigin?: "internal" | "external";
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface PublicJob {
  id: string;
  title: string;
  organisation: JobOrganisation;
  jobDescription: string;
  jobType: string;
  location: string;
  skillTags?: string[];
  salaryRange?: JobSalaryRange;
  experienceLevel?: string;
  createdAt?: string;
  status?: string;
  jobOrigin?: "internal" | "external";
  externalPlatformUrl?: string;
}

export interface PublicJobsListResponse {
  results: PublicJob[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function getPublicJobs(params?: PublicJobsListParams): Promise<PublicJobsListResponse> {
  const { data } = await publicApiClient.get<PublicJobsListResponse>("/public/jobs", { params });
  return data;
}

export async function getPublicJobById(id: string): Promise<PublicJob> {
  const { data } = await publicApiClient.get<PublicJob>(`/public/jobs/${id}`);
  return data;
}

export interface PublicApplyPayload {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  countryCode: string;
  coverLetter?: string;
  /** Signed referral token from job URL `?ref=`; must match candidate email in token. */
  ref?: string;
}

export interface PublicApplyResponse {
  user: {
    id: string;
    name: string;
    email: string;
    status?: string;
  };
  candidate: {
    id: string;
    fullName: string;
  };
  application: {
    id: string;
    status: string;
    jobTitle?: string;
  };
  /** Present when the flow created a new account: pending, verify email, then admin activation (no session). */
  message?: string;
}

export async function publicApplyToJob(
  jobId: string,
  payload: PublicApplyPayload,
  resume: File,
  documents?: File[]
): Promise<PublicApplyResponse> {
  const formData = new FormData();

  // Add text fields
  formData.append("fullName", payload.fullName);
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  formData.append("phoneNumber", payload.phoneNumber);
  formData.append("countryCode", payload.countryCode);
  if (payload.coverLetter) {
    formData.append("coverLetter", payload.coverLetter);
  }
  if (payload.ref && payload.ref.trim()) {
    formData.append("ref", payload.ref.trim());
  }

  // Add resume file
  formData.append("resume", resume);

  // Add additional documents if provided
  if (documents && documents.length > 0) {
    documents.forEach((doc) => {
      formData.append("documents", doc);
    });
  }

  const { data } = await publicApiClient.post<PublicApplyResponse>(
    `/public/jobs/${jobId}/apply`,
    formData,
    {
      timeout: 120_000,
      transformRequest: [
        (body: unknown, headers: Record<string, string>) => {
          delete headers["Content-Type"];
          return body;
        },
      ],
    }
  );

  return data;
}

export type BookmarkVisibility = "public" | "private";

export interface JobBookmarkNote {
  id: string;
  jobId: string;
  user: string;
  note: string;
  visibility: BookmarkVisibility;
  createdAt: string;
}

export async function listJobBookmarks(jobId: string): Promise<JobBookmarkNote[]> {
  const { data } = await apiClient.get<{ results: JobBookmarkNote[] }>(`/jobs/${jobId}/bookmarks`);
  return data.results ?? [];
}

export async function addJobBookmark(
  jobId: string,
  payload: { note: string; visibility?: BookmarkVisibility }
): Promise<JobBookmarkNote> {
  const { data } = await apiClient.post<JobBookmarkNote>(`/jobs/${jobId}/bookmarks`, payload);
  return data;
}

export async function deleteJobBookmark(jobId: string, bookmarkId: string): Promise<void> {
  await apiClient.delete(`/jobs/${jobId}/bookmarks/${bookmarkId}`);
}

export interface JobStatsFunnelRow {
  status: "Applied" | "Screening" | "Interview" | "Offered" | "Hired" | "Rejected";
  count: number;
}

export interface JobStatsRecentApplication {
  id: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  appliedAt: string;
}

export interface JobStatsResponse {
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  totalApplications: number;
  funnel: JobStatsFunnelRow[];
  conversionRate: number;
  recentApplications: JobStatsRecentApplication[];
}

export async function getJobStats(jobId: string): Promise<JobStatsResponse> {
  const { data } = await apiClient.get<JobStatsResponse>(`/jobs/${jobId}/stats`);
  return data;
}

