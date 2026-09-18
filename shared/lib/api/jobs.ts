"use client";

import axios from "axios";
import { apiClient, API_MUTATION_TIMEOUT_MS, normalizeApiBase } from "@/shared/lib/api/client";
import { consumeCaptchaToken, getOptionalCaptchaToken } from "@/shared/lib/publicApplyResume";
import { criteriaWeightError, type RubricCriterion } from "@/shared/lib/api/rubricTemplates";
import type { InterviewRoundType } from "@/shared/lib/api/meetings";

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
  applicationDeadline?: string | null;
  status: string;
  /** internal = ATS-created; external = mirrored from saved external listing */
  jobOrigin?: "internal" | "external";
  externalRef?: { externalId: string; source: string };
  externalPlatformUrl?: string;
  createdBy?: { _id: string; name?: string; email?: string } | { id: string; name?: string };
  createdAt?: string;
  updatedAt?: string;
  /** This job's interview rubrics. Empty/absent = inherit the global rubric. */
  rubricAssignments?: RubricAssignment[];
  /** Ordered interview round plan. Empty/absent = no fixed sequence. */
  interviewRounds?: InterviewRoundPlanRow[];
}

export function isExternalJob(job: { jobOrigin?: string }): boolean {
  return job.jobOrigin === "external";
}

export interface JobsListParams {
  title?: string;
  titles?: string[];
  companies?: string[];
  locations?: string[];
  jobType?: string;
  location?: string;
  status?: string;
  experienceLevel?: string;
  experienceMin?: number;
  experienceMax?: number;
  postingDate?: string;
  createdBy?: string;
  search?: string;
  forCandidates?: boolean;
  jobOrigin?: "internal" | "external";
  sortBy?: string;
  limit?: number;
  page?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryNotSpecified?: boolean;
}

export interface JobFilterOptionItem {
  id: string;
  title: string;
}

export interface JobFilterOptions {
  titles: string[];
  companies: string[];
  locations: string[];
  statuses: string[];
  experience: { min: number; max: number };
  /** Id + title pairs for job-id filter dropdowns (e.g. Applications page). */
  jobs?: JobFilterOptionItem[];
}

function serializeJobsListParams(params?: JobsListParams): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const query: Record<string, string | number | boolean> = {};
  if (params.title) query.title = params.title;
  if (params.titles?.length) query.titles = params.titles.join(",");
  if (params.companies?.length) query.companies = params.companies.join(",");
  if (params.locations?.length) query.locations = params.locations.join(",");
  if (params.jobType) query.jobType = params.jobType;
  if (params.location) query.location = params.location;
  if (params.status) query.status = params.status;
  if (params.experienceLevel) query.experienceLevel = params.experienceLevel;
  if (params.experienceMin != null) query.experienceMin = params.experienceMin;
  if (params.experienceMax != null) query.experienceMax = params.experienceMax;
  if (params.postingDate) query.postingDate = params.postingDate;
  if (params.createdBy) query.createdBy = params.createdBy;
  if (params.search) query.search = params.search;
  if (params.forCandidates != null) query.forCandidates = params.forCandidates;
  if (params.jobOrigin) query.jobOrigin = params.jobOrigin;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.limit != null) query.limit = params.limit;
  if (params.page != null) query.page = params.page;
  if (params.salaryMin != null) query.salaryMin = params.salaryMin;
  if (params.salaryMax != null) query.salaryMax = params.salaryMax;
  if (params.salaryNotSpecified != null) query.salaryNotSpecified = params.salaryNotSpecified;
  return query;
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
  const { data } = await apiClient.get<JobsListResponse>("/jobs", {
    params: serializeJobsListParams(params),
    ...requestConfig,
  });
  return data;
}

export async function getJobFilterOptions(
  params?: Pick<JobsListParams, "status" | "search" | "jobOrigin">
): Promise<JobFilterOptions> {
  const { data } = await apiClient.get<JobFilterOptions>("/jobs/filter-options", {
    params: serializeJobsListParams(params),
  });
  return data;
}

export type JobFacet = "title" | "company" | "location";

/**
 * Server-side lookup for one filter facet. `getJobFilterOptions` only ever sees the
 * first page of jobs, so filtering its result client-side silently hid matches once
 * the tenant grew past that cap.
 */
export async function searchJobFacet(
  facet: JobFacet,
  q: string,
  extra?: { status?: string; jobOrigin?: string },
  config?: { signal?: AbortSignal }
): Promise<string[]> {
  const params: Record<string, string | number> = { facet, q };
  if (extra?.status) params.status = extra.status;
  if (extra?.jobOrigin) params.jobOrigin = extra.jobOrigin;
  const { data } = await apiClient.get<{ values: string[] }>("/jobs/filter-options/facet", {
    params,
    ...(config?.signal ? { signal: config.signal } : {}),
  });
  return data.values ?? [];
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
  applicationDeadline?: string | null;
  status?: string;
  /** This job's interview rubrics. Empty/absent = inherit the global rubric. */
  rubricAssignments?: RubricAssignment[];
  interviewRounds?: InterviewRoundPlanRow[];
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
  applicationDeadline?: string | null;
  status?: string;
  /** This job's interview rubrics. Empty/absent = inherit the global rubric. */
  rubricAssignments?: RubricAssignment[];
  interviewRounds?: InterviewRoundPlanRow[];
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
  jobTypes?: string[];
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

export type BrowseApplyOptions = {
  ref?: string;
  resumeVersion?: number;
  resumeFile?: File;
};

export async function browseApplyToJob(
  jobId: string,
  options?: BrowseApplyOptions
): Promise<BrowseApplyResponse> {
  if (options?.resumeFile) {
    const form = new FormData();
    if (options.ref?.trim()) form.append("ref", options.ref.trim());
    form.append("resume", options.resumeFile);
    const { data } = await apiClient.post<BrowseApplyResponse>(`/jobs/browse/${jobId}/apply`, form);
    return data;
  }
  const body: { ref?: string; resumeVersion?: number } = {};
  if (options?.ref?.trim()) body.ref = options.ref.trim();
  if (options?.resumeVersion != null) body.resumeVersion = options.resumeVersion;
  const { data } = await apiClient.post<BrowseApplyResponse>(`/jobs/browse/${jobId}/apply`, body);
  return data;
}

/**
 * Export jobs to xlsx using the same server-side filters as the list view.
 */
export async function exportJobsToExcel(
  params: Omit<JobsListParams, "page" | "limit"> = {}
): Promise<{ blob: Blob; capped: boolean; totalResults?: number; exportMax?: number }> {
  const body: Record<string, unknown> = {};
  if (params.status) body.status = params.status;
  if (params.search) body.search = params.search;
  if (params.titles?.length) body.titles = params.titles;
  if (params.companies?.length) body.companies = params.companies;
  if (params.locations?.length) body.locations = params.locations;
  if (params.jobOrigin) body.jobOrigin = params.jobOrigin;
  if (params.salaryMin != null) body.salaryMin = params.salaryMin;
  if (params.salaryMax != null) body.salaryMax = params.salaryMax;
  if (params.salaryNotSpecified != null) body.salaryNotSpecified = params.salaryNotSpecified;
  if (params.experienceMin != null) body.experienceMin = params.experienceMin;
  if (params.experienceMax != null) body.experienceMax = params.experienceMax;
  if (params.postingDate) body.postingDate = params.postingDate;
  if (params.sortBy) body.sortBy = params.sortBy;

  const res = await apiClient.post<Blob>("/jobs/export/excel", body, { responseType: "blob" });
  const capped = res.headers["x-export-capped"] === "true";
  const totalResults = res.headers["x-export-total-results"]
    ? Number(res.headers["x-export-total-results"])
    : undefined;
  const exportMax = res.headers["x-export-max-rows"]
    ? Number(res.headers["x-export-max-rows"])
    : undefined;
  return { blob: res.data, capped, totalResults, exportMax };
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
  jobTypes?: string[];
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
  applicationDeadline?: string;
  status?: string;
  jobOrigin?: "internal" | "external";
  externalPlatformUrl?: string;
  /** True when this role already has as many hires as it has declared vacancies. */
  vacancyFilled?: boolean;
}

export interface PublicJobsListResponse {
  results: PublicJob[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function getPublicJobs(params?: PublicJobsListParams): Promise<PublicJobsListResponse> {
  const query: Record<string, string | number> = {};
  if (params?.title) query.title = params.title;
  if (params?.search) query.search = params.search;
  if (params?.location) query.location = params.location;
  if (params?.jobTypes?.length) query.jobTypes = params.jobTypes.join(",");
  else if (params?.jobType) query.jobType = params.jobType;
  if (params?.experienceLevel) query.experienceLevel = params.experienceLevel;
  if (params?.jobOrigin) query.jobOrigin = params.jobOrigin;
  if (params?.sortBy) query.sortBy = params.sortBy;
  if (params?.limit != null) query.limit = params.limit;
  if (params?.page != null) query.page = params.page;
  const { data } = await publicApiClient.get<PublicJobsListResponse>("/public/jobs", { params: query });
  return data;
}

export async function getPublicJobById(id: string): Promise<PublicJob> {
  const { data } = await publicApiClient.get<PublicJob>(`/public/jobs/${id}`);
  return data;
}

/**
 * Lightweight check used by the public apply form to detect an existing account
 * before the user fills the whole form. Returns false on any error so a flaky
 * network never blocks the application.
 */
export async function checkPublicAccountExists(email: string): Promise<boolean> {
  try {
    const { data } = await publicApiClient.get<{ exists: boolean }>("/public/account-exists", {
      params: { email },
    });
    return !!data?.exists;
  } catch {
    return false;
  }
}

export interface PublicApplyExperience {
  company: string;
  role: string;
  startDate?: string | null;
  endDate?: string | null;
  currentlyWorking?: boolean;
  description?: string | null;
}

export interface PublicApplyQualification {
  degree: string;
  institute: string;
  location?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  description?: string | null;
}

export interface PublicApplySocialLink {
  platform: string;
  url: string;
}

export type PublicApplyEntryMode = "manual" | "ai";

export interface PublicApplyPayload {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  countryCode: string;
  /** Tells the backend whether to run resume skill extraction (`ai`) or not (`manual`). */
  entryMode?: PublicApplyEntryMode;
  /** Signed referral token from job URL `?ref=`; must match candidate email in token. */
  ref?: string;
  /** Skills from resume parse prefill — JSON-serialized on submit to skip duplicate extraction. */
  skills?: Array<{ name: string; level?: string; category?: string }>;
  experiences?: PublicApplyExperience[];
  qualifications?: PublicApplyQualification[];
  socialLinks?: PublicApplySocialLink[];
}

export type PublicResumeParseStatus = "success" | "partial" | "failed";

export interface PublicResumeParseSkill {
  name: string;
  level: string;
  category?: string;
}

export interface PublicResumeParseResponse {
  status: PublicResumeParseStatus;
  warnings: string[];
  fields: {
    fullName: string | null;
    email: string | null;
    phoneNumber: string | null;
    countryCode: string | null;
    skills: PublicResumeParseSkill[];
    experiences: PublicApplyExperience[];
    qualifications: PublicApplyQualification[];
    socialLinks: PublicApplySocialLink[];
  };
}

function publicApiHeaders(extra?: Record<string, string>): Record<string, string> {
  const captcha = getOptionalCaptchaToken();
  return {
    ...(captcha ? { "x-captcha-token": captcha } : {}),
    ...extra,
  };
}

function releaseCaptchaTokenIfSent(headers: Record<string, string>): void {
  if (headers["x-captcha-token"]) {
    consumeCaptchaToken();
  }
}

async function postPublicMultipart<T>(
  url: string,
  formData: FormData,
  timeout: number
): Promise<T> {
  const headers = publicApiHeaders();
  try {
    const { data } = await publicApiClient.post<T>(url, formData, {
      timeout,
      headers,
      transformRequest: [
        (body: unknown, requestHeaders: Record<string, string>) => {
          delete requestHeaders["Content-Type"];
          return body;
        },
      ],
    });
    releaseCaptchaTokenIfSent(headers);
    return data;
  } catch (err) {
    releaseCaptchaTokenIfSent(headers);
    throw err;
  }
}

export async function parsePublicResume(jobId: string, resume: File): Promise<PublicResumeParseResponse> {
  const formData = new FormData();
  formData.append("resume", resume);

  return postPublicMultipart<PublicResumeParseResponse>(
    `/public/jobs/${jobId}/parse-resume`,
    formData,
    90_000
  );
}

/**
 * Progress events from the streaming parse. `result` is authoritative and always last on success;
 * everything before it is a preview the UI may show and must be willing to discard.
 */
export type PublicResumeParseSection = "experiences" | "qualifications" | "socialLinks";

export type PublicResumeParseStreamEvent =
  | { type: "stage"; stage: "extracting" | "reading" | PublicResumeParseSection; chars?: number }
  | { type: "field"; field: "fullName" | "email" | "phoneNumber" | "countryCode"; value: string }
  | { type: "skill"; name: string }
  | { type: "item"; section: PublicResumeParseSection; label: string }
  | ({ type: "result" } & PublicResumeParseResponse)
  | { type: "error"; message: string };

/**
 * Parse a resume over Server-Sent Events, reporting progress as the model writes.
 *
 * Falls back to the buffered endpoint when the streaming route is missing (404) or the browser
 * cannot expose a response body stream, so a frontend deployed ahead of its backend still works —
 * it just shows no progress. Resolves with the same payload `parsePublicResume` returns.
 */
export async function parsePublicResumeStream(
  jobId: string | null,
  resume: File,
  onEvent: (event: PublicResumeParseStreamEvent) => void,
  signal?: AbortSignal
): Promise<PublicResumeParseResponse> {
  const buffered = () => (jobId ? parsePublicResume(jobId, resume) : parsePublicResumeOnboard(resume));

  const formData = new FormData();
  formData.append("resume", resume);
  const headers = publicApiHeaders();
  const path = jobId ? `/public/jobs/${jobId}/parse-resume/stream` : "/public/parse-resume/stream";

  let response: Response;
  try {
    response = await fetch(`${normalizeApiBase()}${path}`, {
      method: "POST",
      body: formData,
      headers,
      credentials: "include",
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    releaseCaptchaTokenIfSent(headers);
    return buffered();
  }

  releaseCaptchaTokenIfSent(headers);

  // No streaming route on this backend yet, or no readable body: fall back rather than fail.
  if (response.status === 404 || !response.body) {
    return buffered();
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Resume parsing failed (${response.status}).`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let result: PublicResumeParseResponse | null = null;

  const consumeFrame = (frame: string) => {
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    if (!data) return;
    let event: PublicResumeParseStreamEvent;
    try {
      event = JSON.parse(data) as PublicResumeParseStreamEvent;
    } catch {
      return; // A malformed frame is skipped; the `result` event decides the outcome.
    }
    if (event.type === "result") {
      const { type: _type, ...payload } = event;
      result = payload as PublicResumeParseResponse;
    }
    onEvent(event);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });
    let split = carry.indexOf("\n\n");
    while (split !== -1) {
      consumeFrame(carry.slice(0, split));
      carry = carry.slice(split + 2);
      split = carry.indexOf("\n\n");
    }
  }
  if (carry.trim()) consumeFrame(carry);

  if (!result) {
    throw new Error("Resume parsing ended early. You can fill in the form manually.");
  }
  return result;
}

/** Candidate onboarding — same parse shape as job apply, without a job id. */
export async function parsePublicResumeOnboard(resume: File): Promise<PublicResumeParseResponse> {
  const formData = new FormData();
  formData.append("resume", resume);
  return postPublicMultipart<PublicResumeParseResponse>("/public/parse-resume", formData, 90_000);
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
  documents?: File[],
  coverLetter?: File | null
): Promise<PublicApplyResponse> {
  const formData = new FormData();

  // Add text fields
  formData.append("fullName", payload.fullName);
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  formData.append("phoneNumber", payload.phoneNumber);
  formData.append("countryCode", payload.countryCode);
  formData.append("entryMode", payload.entryMode === "ai" ? "ai" : "manual");
  if (coverLetter) {
    formData.append("coverLetter", coverLetter);
  }
  if (payload.ref && payload.ref.trim()) {
    formData.append("ref", payload.ref.trim());
  }
  if (payload.skills && payload.skills.length > 0) {
    formData.append("skills", JSON.stringify(payload.skills));
  }
  if (payload.experiences && payload.experiences.length > 0) {
    formData.append("experiences", JSON.stringify(payload.experiences));
  }
  if (payload.qualifications && payload.qualifications.length > 0) {
    formData.append("qualifications", JSON.stringify(payload.qualifications));
  }
  if (payload.socialLinks && payload.socialLinks.length > 0) {
    formData.append("socialLinks", JSON.stringify(payload.socialLinks));
  }

  // Add resume file
  formData.append("resume", resume);

  // Add additional documents if provided
  if (documents && documents.length > 0) {
    documents.forEach((doc) => {
      formData.append("documents", doc);
    });
  }

  return postPublicMultipart<PublicApplyResponse>(
    `/public/jobs/${jobId}/apply`,
    formData,
    120_000
  );
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

export async function listBookmarkedJobIds(): Promise<string[]> {
  const { data } = await apiClient.get<{ ids: string[] }>("/jobs/bookmarked-ids");
  return data.ids ?? [];
}

export async function unsaveMyJobBookmarks(jobId: string): Promise<{ removed: number }> {
  const { data } = await apiClient.delete<{ removed: number }>(`/jobs/${jobId}/bookmarks/me`);
  return data;
}

export interface JobAlertCriteria {
  jobTypes?: string[];
  location?: string;
  experienceLevel?: string;
  jobOrigin?: "" | "internal" | "external";
  search?: string;
}

export interface JobAlertPreference {
  enabled: boolean;
  criteria: JobAlertCriteria;
  channels: { email: boolean; inApp: boolean };
}

export async function getJobAlertPreference(): Promise<JobAlertPreference> {
  const { data } = await apiClient.get<JobAlertPreference>("/jobs/job-alerts/me");
  return data;
}

export async function updateJobAlertPreference(
  payload: Partial<JobAlertPreference>
): Promise<JobAlertPreference> {
  const { data } = await apiClient.patch<JobAlertPreference>("/jobs/job-alerts/me", payload);
  return data;
}

export interface JobStatsFunnelRow {
  status: "Applied" | "Screening" | "Interview" | "Shortlisted" | "Offered" | "Hired" | "Rejected";
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

/* ----------------------------------------------------------------------- *
 * Per-job interview rubrics.
 *
 * Backend: Job.rubricAssignments, validated by rubricAssignmentsError in
 * src/constants/interviewRubric.js. Sending this key needs interview management
 * access — a job-only user gets 403 rubric_requires_interview_access.
 * ----------------------------------------------------------------------- */

/** A job can declare at most this many assignments. Mirrors MAX_RUBRIC_ASSIGNMENTS. */
export const MAX_RUBRIC_ASSIGNMENTS = 12;

export interface RubricAssignment {
  /** null = this job's default row, used by any round without a row of its own. */
  roundType: InterviewRoundType | null;
  /** Set => reuse this saved rubric. Mutually exclusive with `criteria`. */
  templateId?: string | null;
  /** Set => this job's own criteria. Mutually exclusive with `templateId`. */
  criteria?: RubricCriterion[] | null;
}

/**
 * Mirrors backend rubricAssignmentsError.
 *
 * Duplicated on purpose so the job form can block its own Save before a round trip; the
 * backend stays the authority. If the rule changes, change both.
 */
export function rubricAssignmentsError(
  assignments: RubricAssignment[] | null | undefined
): string | null {
  if (assignments == null) return null;
  if (!Array.isArray(assignments)) return "Interview scoring must be a list of assignments.";
  if (assignments.length === 0) return null;
  if (assignments.length > MAX_RUBRIC_ASSIGNMENTS) {
    return `A job can have at most ${MAX_RUBRIC_ASSIGNMENTS} rubric assignments.`;
  }

  const seen = new Set<string>();
  for (const row of assignments) {
    if (!row || typeof row !== "object") return "Each rubric assignment must be an object.";

    const roundType = row.roundType ?? null;
    const key = roundType === null ? "__default__" : roundType;
    if (seen.has(key)) {
      return roundType
        ? `The ${roundType} round is set more than once.`
        : "The job default is set more than once.";
    }
    seen.add(key);

    const label = roundType ? `the ${roundType} round` : "rounds with no specific rubric";
    const hasTemplate = Boolean(row.templateId);
    const hasCriteria = Array.isArray(row.criteria) && row.criteria.length > 0;
    if (hasTemplate && hasCriteria) {
      return `${label}: use either a saved rubric or custom criteria for this round, not both.`;
    }
    if (!hasTemplate && !hasCriteria) {
      return `${label}: choose a saved rubric or define criteria for this round.`;
    }
    if (hasCriteria) {
      const reason = criteriaWeightError(row.criteria as RubricCriterion[]);
      if (reason) return `${label}: ${reason}`;
    }
  }
  return null;
}

/* ----------------------------------------------------------------------- *
 * Per-job interview ROUND PLAN.
 *
 * Backend: Job.interviewRounds, validated by roundPlanError in
 * src/constants/interviewRoundPlan.js. This is the write target that replaces
 * rubricAssignments (above), which the backend still READS as its fallback rung.
 *
 * Sending this key needs interview management access — a job-only user gets 403
 * rubric_requires_interview_access, the same code as the old field.
 * ----------------------------------------------------------------------- */

/** A job can plan at most this many rounds. Mirrors MAX_PLANNED_ROUNDS. */
export const MAX_PLANNED_ROUNDS = 12;

export interface InterviewRoundPlanRow {
  /**
   * Stable and FROZEN once the row exists. Meeting.round.planKey stores it and the
   * application's plan snapshot repeats it, so changing a key orphans every round already
   * held against this row. Never re-derive it from the label.
   */
  key: string;
  /** What the recruiter calls this round, e.g. "Technical 2". Shown everywhere. */
  label: string;
  /** Optional. May repeat across rows — that is the point of the ordered list. */
  roundType: InterviewRoundType | null;
  /** Set => reuse this saved rubric. Mutually exclusive with `criteria`. */
  templateId?: string | null;
  /** Set => this round's own criteria. Mutually exclusive with `templateId`. */
  criteria?: RubricCriterion[] | null;
}

/** A plan key that cannot collide with a sibling's. Mirrors nextPlanKey. */
export function nextPlanKey(taken: Set<string>): string {
  for (let n = 1; n <= MAX_PLANNED_ROUNDS * 4; n += 1) {
    const candidate = `round_${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `round_${Date.now()}`.slice(0, 40);
}

/**
 * Mirrors backend roundPlanError.
 *
 * Duplicated on purpose so the job form can block its own Save before a round trip; the
 * backend stays the authority. If the rule changes, change both. The messages are kept
 * word-for-word identical, so a user who somehow reaches the server-side error reads the
 * same sentence rather than a second, differently-worded one.
 *
 * Deliberately DIFFERENT from rubricAssignmentsError in one respect: a round type may
 * repeat. Two Technical rounds at different bars is why this field exists.
 */
export function roundPlanError(
  rounds: InterviewRoundPlanRow[] | null | undefined
): string | null {
  if (rounds == null) return null;
  if (!Array.isArray(rounds)) return "Interview rounds must be a list.";
  if (rounds.length === 0) return null;
  if (rounds.length > MAX_PLANNED_ROUNDS) {
    return `A job can plan at most ${MAX_PLANNED_ROUNDS} interview rounds.`;
  }

  const seenKeys = new Set<string>();

  for (let i = 0; i < rounds.length; i += 1) {
    const row = rounds[i];
    if (!row || typeof row !== "object") return `Round ${i + 1} must be an object.`;

    const name = (row.label || "").trim() || `Round ${i + 1}`;

    const key = (row.key || "").trim();
    if (!key) return `${name} needs an internal key.`;
    if (!/^[a-z0-9_-]{1,40}$/.test(key)) {
      return `${name} has an invalid internal key. Use lower-case letters, numbers, hyphens or underscores.`;
    }
    if (seenKeys.has(key)) return `Two rounds share the internal key "${key}".`;
    seenKeys.add(key);

    const label = (row.label || "").trim();
    if (!label) return `Round ${i + 1} needs a name.`;
    if (label.length > 80) return `${name}: the name is too long (80 characters maximum).`;

    const hasTemplate = Boolean(row.templateId);
    const hasCriteria = Array.isArray(row.criteria) && row.criteria.length > 0;
    if (hasTemplate && hasCriteria) {
      return `${name}: use either a saved rubric or custom criteria for this round, not both.`;
    }
    if (!hasTemplate && !hasCriteria) {
      return `${name}: choose a saved rubric or define criteria for this round.`;
    }

    if (hasCriteria) {
      const reason = criteriaWeightError(row.criteria as RubricCriterion[]);
      if (reason) return `${name}: ${reason}`;
    }
  }

  return null;
}

