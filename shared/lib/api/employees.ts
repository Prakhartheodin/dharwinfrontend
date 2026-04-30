"use client";

import { apiClient, resolveDownloadUrlForBrowser } from "@/shared/lib/api/client";

export interface CandidateListItem {
  id?: string;
  _id?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profilePicture?: { url?: string; key?: string };
  skills?: { name: string; level?: string; category?: string }[];
  qualifications?: { degree: string; institute: string }[];
  experiences?: { company: string; role: string; startDate?: string; endDate?: string; currentlyWorking?: boolean }[];
  shortBio?: string;
  employeeId?: string;
  department?: string | null;
  designation?: string | null;
  /** Position ID (ref to Position – Java Developer, Data Analyst, etc.) */
  position?: string | { id?: string; _id?: string; name?: string } | null;
  reportingManager?: string | { _id: string; name?: string; email?: string } | null;
  isActive?: boolean;
  isEmailVerified?: boolean;
  isProfileCompleted?: number;
  isCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  joiningDate?: string | null;
  resignDate?: string | null;
  owner?: { id?: string; _id?: string; name?: string; email?: string } | string;
  /** Linked training Student id (attendance); set when owner has a Student profile. */
  studentId?: string | null;
  /** Candidate owner User id (for user-based attendance when no Student). */
  ownerId?: string | null;
  /** Present when list is requested with includeOpenSopCount. */
  openSopCount?: number;
  /** Present on GET /candidates/:id and related detail responses. */
  assignedAgent?: { id: string; name: string; email?: string } | null;
  /** Training modules this candidate’s owner is enrolled in (via Student). GET /candidates/:id only. */
  assignedTrainingPrograms?: { id: string; name: string }[];
  /** Projects where the candidate owner user is in assignedTo. GET /candidates/:id only. */
  assignedProjects?: { id: string; name: string; status?: string }[];
  documents?: CandidateDocument[];
  socialLinks?: Array<{ platform?: string; url?: string }>;
  /** Company-provided work mailbox (admin); distinct from login email. */
  companyAssignedEmail?: string;
  companyEmailProvider?: "gmail" | "outlook" | "unknown" | "" | string;
  /** Denormalized title from job-application / referral flow; used when aligning HRMS position to applied role. */
  referralJobTitle?: string | null;
}

export type DocumentType = 'Aadhar' | 'PAN' | 'Bank' | 'Passport' | 'Other';

export interface CandidateDocument {
  type?: DocumentType;
  label?: string;
  url?: string;
  key?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
  status?: number;
}

export interface CandidatesListResponse {
  results: CandidateListItem[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ListCandidatesParams {
  owner?: string;
  fullName?: string;
  email?: string;
  employeeId?: string;
  /** Substring match against Agent users' name or email; lists candidates with matching assignedAgent */
  agent?: string;
  /** Comma-separated Agent user ids (from agent checklist); OR match on assignedAgent */
  agentIds?: string;
  employmentStatus?: "current" | "resigned" | "all" | "";
  page?: number;
  limit?: number;
  sortBy?: string;
  skills?: string | string[];
  skillLevel?: string;
  skillMatchMode?: "all" | "any";
  experienceLevel?: string;
  minYearsOfExperience?: number;
  maxYearsOfExperience?: number;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  degree?: string;
  visaType?: string;
  /** When "true" or "1", each row may include openSopCount (extra server work). */
  includeOpenSopCount?: "true" | "false" | "1" | "0" | boolean;
}

export async function listCandidates(params?: ListCandidatesParams): Promise<CandidatesListResponse> {
  const { data } = await apiClient.get<CandidatesListResponse>("/employees", { params });
  return data;
}

export interface JobMatchSkill {
  name: string;
  required: boolean;
  employeeLevel?: string;
  requiredLevel?: string | null;
  meetsLevel?: boolean;
}

export interface JobMatch {
  jobId: string;
  title: string;
  company: string;
  location: string;
  jobType: string;
  experienceLevel?: string | null;
  fitScore: number;
  fitLabel: string;
  matchedSkills: JobMatchSkill[];
  missingSkills: JobMatchSkill[];
}

export interface MatchingJobsResponse {
  matches: JobMatch[];
  candidateSkillCount: number;
  totalJobsScored: number;
}

export async function getMyMatchingJobs(params?: { limit?: number; minScore?: number }): Promise<MatchingJobsResponse> {
  const { data } = await apiClient.get<MatchingJobsResponse>("/employees/me/matching-jobs", { params });
  return data;
}

/**
 * Settings → Agents roster: candidate profiles with Student/Candidate (Employee) owners, plus any profile
 * that already has an assigned agent (so onboarded hires still appear under the correct agent).
 * Requires `candidates.manage`.
 */
export interface StudentAgentAssignmentRow {
  id: string;
  fullName: string;
  email: string;
  /** HR id (e.g. DBS…) — null until portal `owner` has the Employee user role (`Candidate`-only hides it). */
  employeeId: string | null;
  ownerId: string;
  /** e.g. `Student`, `Candidate`, or `Student · Candidate` */
  ownerRoleLabel: string;
  studentId: string | null;
  assignedAgent: { id: string; name: string; email: string } | null;
}

export interface AgentOption {
  id: string;
  name: string;
  email: string;
}

export async function getStudentAgentAssignments(): Promise<{
  students: StudentAgentAssignmentRow[];
  agents: AgentOption[];
}> {
  const { data } = await apiClient.get<{ students: StudentAgentAssignmentRow[]; agents: AgentOption[] }>(
    "/employees/student-agent-assignments"
  );
  return data;
}

/** All Agent-role users for ATS filter checklist — requires `candidates.read`. */
export async function getCandidateFilterAgents(): Promise<{ agents: AgentOption[] }> {
  const { data } = await apiClient.get<{ agents: AgentOption[] }>("/employees/agents");
  return data;
}

export async function assignAgentToStudent(candidateId: string, agentId: string | null): Promise<unknown> {
  const { data } = await apiClient.post(`/employees/${candidateId}/assign-agent`, { agentId });
  return data;
}

/** Settings → Company work email roster — requires `candidates.manage`. */
export interface CompanyEmailAssignmentRow {
  id: string;
  fullName: string;
  email: string;
  employeeId: string | null;
  ownerId: string;
  ownerRoleLabel: string;
  studentId: string | null;
  companyAssignedEmail: string;
  companyEmailProvider: string;
  assignedAgent: { id: string; name: string; email: string } | null;
}

export async function getCompanyEmailAssignments(): Promise<{ students: CompanyEmailAssignmentRow[] }> {
  const { data } = await apiClient.get<{ students: CompanyEmailAssignmentRow[] }>("/employees/company-email-assignments");
  return data;
}

export async function getCompanyEmailSettings(): Promise<{ companyEmailAssignmentEnabled: boolean }> {
  const { data } = await apiClient.get<{ companyEmailAssignmentEnabled: boolean }>("/employees/company-email-settings");
  return data;
}

export async function patchCompanyEmailSettings(
  companyEmailAssignmentEnabled: boolean
): Promise<{ companyEmailAssignmentEnabled: boolean }> {
  const { data } = await apiClient.patch<{ companyEmailAssignmentEnabled: boolean }>(
    "/employees/company-email-settings",
    { companyEmailAssignmentEnabled }
  );
  return data;
}

export async function assignCompanyAssignedEmail(
  candidateId: string,
  body: { companyAssignedEmail: string | null; companyEmailProvider?: string | null }
): Promise<CandidateListItem> {
  const { data } = await apiClient.post<CandidateListItem>(`/employees/${candidateId}/company-assigned-email`, body);
  return data;
}

export async function getCandidate(candidateId: string): Promise<CandidateListItem> {
  const { data } = await apiClient.get<CandidateListItem>(`/employees/${candidateId}`);
  return data;
}

/** Get current user's own candidate (auth only, no candidates.read). For role 'user' from share-candidate-form. */
export async function getMyCandidate(): Promise<CandidateListItem> {
  const { data } = await apiClient.get<CandidateListItem>("/employees/me");
  return data;
}

/** Update current user's own candidate (auth only). For role 'user' from share-candidate-form. */
export async function updateMyCandidate(payload: Partial<CandidateListItem>): Promise<CandidateListItem> {
  const { data } = await apiClient.patch<CandidateListItem>("/employees/me", payload);
  return data;
}

export async function createCandidate(payload: Partial<CandidateListItem>): Promise<CandidateListItem> {
  const { data } = await apiClient.post<CandidateListItem>("/employees", payload);
  return data;
}

export async function updateCandidate(candidateId: string, payload: Partial<CandidateListItem>): Promise<CandidateListItem> {
  const { data } = await apiClient.patch<CandidateListItem>(`/employees/${candidateId}`, payload);
  return data;
}

export async function deleteCandidate(candidateId: string): Promise<void> {
  await apiClient.delete(`/employees/${candidateId}`);
}

export async function getCandidateDocuments(candidateId: string): Promise<CandidateDocument[]> {
  const res = await apiClient.get<{ success?: boolean; data?: CandidateDocument[] | { documents?: CandidateDocument[] } }>(
    `/employees/documents/${candidateId}`
  );
  const raw = res.data?.data;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { documents?: CandidateDocument[] }).documents)) {
    return (raw as { documents: CandidateDocument[] }).documents;
  }
  return [];
}

export async function getDocumentDownloadUrl(
  candidateId: string,
  documentIndex: number
): Promise<{ url: string; fileName: string; mimeType: string; size: number }> {
  const { data } = await apiClient.get<{
    success: boolean;
    data: { url: string; fileName: string; mimeType: string; size: number };
  }>(`/employees/documents/${candidateId}/${documentIndex}/download`, {
    headers: { Accept: "application/json" },
  });
  if (!data?.success || !data?.data) throw new Error("Failed to get download URL");
  return { ...data.data, url: resolveDownloadUrlForBrowser(data.data.url) };
}

/** Get fresh download URL for a salary slip (presigned URLs expire after 7 days). */
export async function getSalarySlipDownloadUrl(
  candidateId: string,
  salarySlipIndex: number
): Promise<{ url: string; fileName: string; mimeType: string; size: number }> {
  const { data } = await apiClient.get<{
    success: boolean;
    data: { url: string; fileName: string; mimeType: string; size: number };
  }>(`/employees/salary-slips/${candidateId}/${salarySlipIndex}`, {
    headers: { Accept: "application/json" },
  });
  if (!data?.success || !data?.data) throw new Error("Failed to get salary slip URL");
  return { ...data.data, url: resolveDownloadUrlForBrowser(data.data.url) };
}

export async function addSalarySlipToCandidate(
  candidateId: string,
  payload: { month: string; year: number; documentUrl: string; key: string; originalName: string; size: number; mimeType: string }
): Promise<CandidateListItem> {
  const { data } = await apiClient.post<CandidateListItem>(`/employees/salary-slips/${candidateId}`, payload);
  return data;
}

export async function shareCandidateProfile(
  candidateId: string,
  body: { email: string; withDoc?: boolean }
): Promise<{ publicUrl?: string }> {
  const { data } = await apiClient.post<{ success: boolean; data?: { publicUrl?: string } }>(
    `/employees/share/${candidateId}`,
    { withDoc: body.withDoc ?? false, email: body.email }
  );
  return data?.data ?? {};
}

export async function exportCandidateProfile(candidateId: string, email: string): Promise<void> {
  await apiClient.post(`/employees/${candidateId}/export`, { email });
}

export interface ResendCandidateVerificationResponse {
  success?: boolean;
  message?: string;
  sentToEmail?: string;
  candidateEmail?: string;
  candidateId?: string;
  candidateName?: string;
}

/** Recruiter resend — mail goes to the candidate User’s login email (see `sentToEmail` in response). */
export async function resendVerificationEmail(
  candidateId: string
): Promise<ResendCandidateVerificationResponse> {
  const { data } = await apiClient.post<ResendCandidateVerificationResponse>(
    `/employees/${candidateId}/resend-verification-email`
  );
  return data ?? {};
}

export async function addNoteToCandidate(candidateId: string, note: string): Promise<void> {
  await apiClient.post(`/employees/${candidateId}/notes`, { note });
}

export async function addFeedbackToCandidate(
  candidateId: string,
  feedback: string,
  rating?: number
): Promise<void> {
  await apiClient.post(`/employees/${candidateId}/feedback`, { feedback, rating });
}

/** Same filter shape as list; page/limit/includeOpenSopCount are ignored by export. */
export type ExportAllCandidatesParams = Omit<
  ListCandidatesParams,
  "page" | "limit" | "includeOpenSopCount"
> & {
  /** Omit or `xlsx` = multi-sheet Excel (default). `csv` = legacy single-sheet CSV. */
  format?: "csv" | "xlsx";
};

/** Export all candidates: default multi-sheet `.xlsx` blob; `format=csv` for one CSV. Email path sends CSV in body. Requires candidates.manage. */
export async function exportAllCandidates(
  params?: ExportAllCandidatesParams,
  body?: { email?: string }
): Promise<Blob | void> {
  const sendBlob = !body?.email;
  const res = await apiClient.post("/employees/export", body ?? {}, {
    params,
    ...(sendBlob ? { responseType: "blob" as const } : {}),
  });
  return res.data as Blob | void;
}

export interface AgentAssignmentSummaryRow {
  agentId: string;
  name: string;
  email: string;
  assignedCount: number;
}

export interface AgentAssignmentSummaryResponse {
  employmentStatus: string;
  unassignedCount: number;
  agents: AgentAssignmentSummaryRow[];
}

/** Org-wide agent workload (candidates.manage). */
export async function getAgentAssignmentSummary(params?: {
  employmentStatus?: "current" | "resigned" | "all" | "";
}): Promise<AgentAssignmentSummaryResponse> {
  const { data } = await apiClient.get<AgentAssignmentSummaryResponse>(
    "/employees/agent-assignment-summary",
    { params }
  );
  return data;
}

export async function assignRecruiterToCandidate(candidateId: string, recruiterId: string): Promise<void> {
  await apiClient.post(`/employees/${candidateId}/assign-recruiter`, { recruiterId });
}

export async function updateJoiningDate(candidateId: string, joiningDate: string): Promise<void> {
  await apiClient.patch(`/employees/${candidateId}/joining-date`, { joiningDate });
}

export async function updateResignDate(candidateId: string, resignDate: string | null): Promise<void> {
  await apiClient.patch(`/employees/${candidateId}/resign-date`, { resignDate });
}

export async function updateWeekOff(candidateIds: string[], weekOff: string[]): Promise<void> {
  await apiClient.post("/employees/week-off", { candidateIds, weekOff });
}

export async function getCandidateWeekOff(candidateId: string): Promise<{ weekOff?: string[] }> {
  const { data } = await apiClient.get<{ success?: boolean; data?: { weekOff?: string[] } }>(`/employees/${candidateId}/week-off`);
  return (data as any)?.data ?? (data as any) ?? {};
}

export async function assignShiftToCandidates(candidateIds: string[], shiftId: string): Promise<void> {
  await apiClient.post("/employees/assign-shift", { candidateIds, shiftId });
}

export interface DocumentStatusItem {
  index: number;
  status: number;
  adminNotes?: string;
}
export async function getDocumentStatus(candidateId: string): Promise<{ documents?: DocumentStatusItem[] }> {
  const { data } = await apiClient.get<{ success?: boolean; data?: { documents?: DocumentStatusItem[] } }>(
    `/employees/documents/status/${candidateId}`
  );
  return (data as any)?.data ?? (data as any) ?? {};
}

export async function verifyDocument(
  candidateId: string,
  documentIndex: number,
  status: number,
  adminNotes?: string
): Promise<void> {
  await apiClient.patch(`/employees/documents/verify/${candidateId}/${documentIndex}`, { status, adminNotes });
}

export async function updateSalarySlip(
  candidateId: string,
  salarySlipIndex: number,
  payload: { month?: string; year?: number; documentUrl?: string; key?: string; originalName?: string; size?: number; mimeType?: string }
): Promise<CandidateListItem> {
  const { data } = await apiClient.patch<CandidateListItem>(
    `/employees/salary-slips/${candidateId}/${salarySlipIndex}`,
    payload
  );
  return data;
}

export async function deleteSalarySlip(candidateId: string, salarySlipIndex: number): Promise<void> {
  await apiClient.delete(`/employees/salary-slips/${candidateId}/${salarySlipIndex}`);
}

/** Single file upload; returns URL and metadata for use in candidate documents/salarySlips/profilePicture */
export async function uploadDocument(
  file: File,
  label?: string
): Promise<{ url: string; key: string; originalName: string; size: number; mimeType: string }> {
  const formData = new FormData();
  formData.append("file", file);
  if (label) formData.append("label", label);
  // Do not set Content-Type — apiClient defaults to JSON; FormData needs boundary from the browser.
  const { data } = await apiClient.post<{
    success: boolean;
    data: { url: string; key: string; originalName: string; size: number; mimeType: string };
  }>("/upload/single", formData, {
    transformRequest: [
      (data: unknown, headers: Record<string, string>) => {
        delete headers["Content-Type"];
        return data;
      },
    ],
  } as any);
  if (!data?.success || !data?.data) throw new Error("Upload failed");
  return data.data;
}

/** Upload multiple files; returns array in same order as files (for documents/salary slips). */
export async function uploadDocuments(
  files: File[],
  labels: string[]
): Promise<{ success: boolean; data: Array<{ url: string; key: string; originalName: string; size: number; mimeType: string }> }> {
  const data = await Promise.all(
    files.map((file, i) => uploadDocument(file, labels[i]))
  );
  return { success: true, data };
}

/**
 * Import candidates from Excel file
 */
export interface ImportExcelResult {
  message: string;
  successful: Array<{
    row: number;
    candidateId: string;
    fullName: string;
    email: string;
  }>;
  failed: Array<{
    row: number;
    fullName: string;
    email: string;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export async function importCandidatesFromExcel(file: File): Promise<ImportExcelResult> {
  const formData = new FormData();
  formData.append("file", file);
  
  const { data } = await apiClient.post<ImportExcelResult>("/employees/import/excel", formData, {
    transformRequest: [
      (data: unknown, headers: Record<string, string>) => {
        delete headers["Content-Type"];
        return data;
      },
    ],
  } as any);
  
  return data;
}

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;

/** Normalized skill row aligned with Employee schema (`name`, `level`, optional `category`). */
export type CandidateSkillStructured = {
  name: string;
  level: string;
  category?: string;
};

/** Normalize API `skills` (strings or objects) for Settings / ATS preview tables. */
export function normalizeCandidateSkillsStructured(skills: unknown): CandidateSkillStructured[] {
  if (!Array.isArray(skills) || skills.length === 0) return [];
  const out: CandidateSkillStructured[] = [];
  for (const s of skills) {
    if (typeof s === "string") {
      const name = s.trim();
      if (name) out.push({ name, level: "Intermediate" });
      continue;
    }
    if (s && typeof s === "object") {
      const o = s as { name?: unknown; level?: unknown; category?: unknown };
      const name = String(o.name ?? "").trim();
      if (!name) continue;
      const lv = String(o.level ?? "Intermediate");
      const level = (SKILL_LEVELS as readonly string[]).includes(lv) ? lv : "Intermediate";
      const catRaw = o.category;
      const category =
        typeof catRaw === "string" && catRaw.trim() !== "" ? catRaw.trim() : undefined;
      out.push({ name, level, category });
    }
  }
  return out;
}

/**
 * Map API candidate to the shape expected by the ATS candidates page UI (id, name, displayPicture, phone, email, skills[], education, experience, bio).
 */
export function mapCandidateToDisplay(c: CandidateListItem) {
  const skillsStructured = normalizeCandidateSkillsStructured(c.skills);
  const skillsList = skillsStructured.map((x) => x.name);
  let education = "";
  if (c.qualifications?.length) {
    education = c.qualifications.map((q) => `${q.degree} - ${q.institute}`).join("; ");
  }
  let experienceYears = 0;
  if (c.experiences?.length) {
    const now = new Date();
    for (const e of c.experiences) {
      const start = e.startDate ? new Date(e.startDate) : null;
      const end = e.currentlyWorking ? now : e.endDate ? new Date(e.endDate) : null;
      if (start && end) {
        experienceYears += (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      }
    }
    experienceYears = Math.round(experienceYears * 10) / 10;
  }
  return {
    id: c.id ?? c._id ?? "",
    name: c.fullName,
    displayPicture: c.profilePicture?.url ?? undefined,
    phone: c.phoneNumber,
    email: c.email,
    skills: skillsList,
    skillsStructured,
    education,
    experience: experienceYears,
    bio: c.shortBio ?? "",
    isEmailVerified: (c as any).isEmailVerified === true,
    isProfileCompleted: (c as any).isProfileCompleted ?? 0,
    isCompleted: (c as any).isCompleted ?? false,
    studentId: (c as CandidateListItem).studentId ?? null,
    ownerUserId: (() => {
      const row = c as CandidateListItem;
      if (row.ownerId) return row.ownerId;
      const o = row.owner;
      if (!o) return null;
      if (typeof o === "string") return o;
      return o.id ?? o._id?.toString?.() ?? null;
    })(),
    openSopCount: typeof (c as CandidateListItem).openSopCount === "number" ? (c as CandidateListItem).openSopCount : undefined,
    _raw: c,
  };
}
