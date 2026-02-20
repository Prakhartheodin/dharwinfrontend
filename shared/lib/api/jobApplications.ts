"use client";

import { apiClient } from "@/shared/lib/api/client";

export type JobApplicationStatus = "Applied" | "Screening" | "Interview" | "Offered" | "Hired" | "Rejected";

export interface JobApplication {
  _id: string;
  id?: string;
  job: { _id: string; title?: string; organisation?: { name: string }; status?: string };
  candidate: { _id: string; fullName?: string; email?: string; phoneNumber?: string };
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

export interface UpdateJobApplicationStatusPayload {
  status: JobApplicationStatus;
  notes?: string | null;
}

export async function updateJobApplicationStatus(id: string, payload: UpdateJobApplicationStatusPayload): Promise<JobApplication> {
  const { data } = await apiClient.patch<JobApplication>(`/job-applications/${id}`, payload);
  return data;
}
