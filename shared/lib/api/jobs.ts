"use client";

import { apiClient } from "@/shared/lib/api/client";

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
  createdBy?: { _id: string; name?: string; email?: string } | { id: string; name?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface JobsListParams {
  title?: string;
  jobType?: string;
  location?: string;
  status?: string;
  experienceLevel?: string;
  createdBy?: string;
  search?: string;
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

export async function listJobs(params?: JobsListParams): Promise<JobsListResponse> {
  const { data } = await apiClient.get<JobsListResponse>("/jobs", { params });
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
