"use client";

import axios from "axios";
import { apiClient, normalizeApiBase } from "@/shared/lib/api/client";

export interface JobOrganisation {
  name: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
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
  const { data } = await apiClient.post(`/jobs/${jobId}/share-email`, { to, message });
  return data;
}

export interface JobTemplate {
  _id: string;
  title: string;
  jobDescription: string;
  createdAt?: string;
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

