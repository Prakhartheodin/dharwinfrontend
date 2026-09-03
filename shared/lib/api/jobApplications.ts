"use client";

import { apiClient } from "@/shared/lib/api/client";

export type JobApplicationStatus = "Applied" | "Screening" | "Interview" | "Shortlisted" | "Offered" | "Hired" | "Rejected";

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
    /** Populated owner User — fallback when applicantUser is missing on legacy rows. */
    owner?: { _id?: string; id?: string; name?: string; email?: string };
  };
  /**
   * Authoritative applicant identity. Set on create from Employee.owner of the candidate;
   * NULL for synthetic offer-letter standalone applications and pre-migration legacy rows.
   * Frontend resolvers MUST prefer this over candidate.owner to avoid leaking admin emails.
   */
  applicantUser?: { _id?: string; id?: string; name?: string; email?: string } | null;
  status: JobApplicationStatus;
  coverLetter?: string | null;
  appliedBy?: { _id: string; name?: string; email?: string };
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Virtual mirror of createdAt (toJSON strips raw createdAt); use this for the application date. */
  appliedAt?: string;
  /**
   * Candidate-visible badge label (e.g. "Pre-boarding", "Rejected · Offer").
   * From GET /job-applications/my-applications.
   */
  candidateVisibleStatus?: string;
  /** Candidate-facing lifecycle stage. Canonical: prefer this over deriving from `status`. */
  candidateLifecycleStage?:
    | "interview"
    | "offer"
    | "preboarding"
    | "onboarding"
    | "hired"
    | "deferred"
    | "rejected";
  /** Stage at which the selection closed; null while the candidate is still on the selected path. */
  rejectionStage?: "interview" | "offer" | "preboarding" | "onboarding" | null;
  /** A durable selection (offer or placement) exists for this application. */
  selectionPersisted?: boolean;
  /** Drives the congratulations banner — selection persisted AND not closed. */
  showCongratulations?: boolean;
  /**
   * Interview outcome for this application (Meeting.interviewResult). Populated on my-applications
   * when the backend joins the latest interview for the job application.
   */
  interviewResult?: "pending" | "selected" | "rejected";
}

export interface JobApplicationsListParams {
  jobId?: string;
  candidateId?: string;
  recruiterId?: string;
  status?: JobApplicationStatus;
  /** Text search across candidate name/email and job title (server-side regex). */
  q?: string;
  /** Match candidate's Employee.department (case-insensitive exact match). */
  department?: string;
  /** ISO 8601 — filters by application createdAt. */
  dateFrom?: string;
  dateTo?: string;
  /** When true, only applications tied to jobs that exist with status Active (drops closed/archived/draft and orphans after job delete). */
  activeJobsOnly?: boolean;
  /** When true, hide synthetic offer-letter placeholder applications (no real applicant). */
  excludeInternal?: boolean;
  /** When true, return all applications including duplicates by the same applicant. */
  includeDuplicates?: boolean;
  /** When 1/true, backend emits one structured log line per row for applicant-email diagnostics. */
  debug?: boolean | 1;
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
  /**
   * Filters the stored `JobApplication.status` server-side. This does NOT match the badge a
   * candidate sees: `candidateVisibleStatus` is derived from Offer/Placement AFTER the query, so
   * an offer-stage rejection keeps status "Offered" while its badge reads "Rejected · Offer".
   * Filter on the resolved lifecycle instead — see `resolveCandidateLifecycle`.
   */
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
