"use client";

import { apiClient } from "@/shared/lib/api/client";

export type JobApplicationStatus = "Applied" | "Screening" | "Interview" | "Offered" | "Hired" | "Rejected";

export interface JobApplication {
  _id: string;
  id?: string;
  /** Populated job; API JSON uses `id` (toJSON) — use `_id ?? id` when reading. */
  job: { _id?: string; id?: string; title?: string; organisation?: { name: string }; status?: string };
  candidate: {
    _id?: string;
    id?: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    countryCode?: string;
    address?: {
      streetAddress?: string;
      streetAddress2?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  status: JobApplicationStatus;
  coverLetter?: string | null;
  appliedBy?: { _id: string; name?: string; email?: string };
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobApplicationsListParams {
  jobId?: string;
  candidateId?: string;
  status?: JobApplicationStatus;
  /** When true, only applications tied to jobs that exist with status Active (drops closed/archived/draft and orphans after job delete). */
  activeJobsOnly?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface JobApplicationsListResponse {
  results: JobApplication[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function listJobApplications(params?: JobApplicationsListParams): Promise<JobApplicationsListResponse> {
  const { data } = await apiClient.get<JobApplicationsListResponse>("/job-applications", { params });
  return data;
}

export async function getJobApplicationById(id: string): Promise<JobApplication> {
  const { data } = await apiClient.get<JobApplication>(`/job-applications/${id}`);
  return data;
}

export interface CreateJobApplicationPayload {
  job: string;
  candidate: string;
  status?: JobApplicationStatus;
  coverLetter?: string | null;
  notes?: string | null;
}

export async function createJobApplication(payload: CreateJobApplicationPayload): Promise<JobApplication> {
  const { data } = await apiClient.post<JobApplication>("/job-applications", payload);
  return data;
}

export interface UpdateJobApplicationStatusPayload {
  job?: string;
  candidate?: string;
  status?: JobApplicationStatus;
  coverLetter?: string | null;
  notes?: string | null;
}

export async function updateJobApplicationStatus(id: string, payload: UpdateJobApplicationStatusPayload): Promise<JobApplication> {
  const { data } = await apiClient.patch<JobApplication>(`/job-applications/${id}`, payload);
  return data;
}

export async function deleteJobApplication(id: string): Promise<void> {
  await apiClient.delete(`/job-applications/${id}`);
}

export interface MyApplicationsListParams {
  status?: JobApplicationStatus;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export async function getMyApplications(params?: MyApplicationsListParams): Promise<JobApplicationsListResponse> {
  const { data } = await apiClient.get<JobApplicationsListResponse>("/job-applications/my-applications", { params });
  return data;
}

export async function withdrawMyApplication(applicationId: string): Promise<void> {
  await apiClient.delete(`/job-applications/my-applications/${applicationId}`);
}
