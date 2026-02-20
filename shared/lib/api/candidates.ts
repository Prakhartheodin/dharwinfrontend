"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface CandidateListItem {
  id?: string;
  _id?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profilePicture?: { url?: string; key?: string };
  skills?: { name: string; level?: string }[];
  qualifications?: { degree: string; institute: string }[];
  experiences?: { company: string; role: string; startDate?: string; endDate?: string; currentlyWorking?: boolean }[];
  shortBio?: string;
  employeeId?: string;
  department?: string | null;
  designation?: string | null;
  reportingManager?: string | { _id: string; name?: string; email?: string } | null;
  isActive?: boolean;
  isEmailVerified?: boolean;
  isProfileCompleted?: number;
  isCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  owner?: { name?: string; email?: string };
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
}

export async function listCandidates(params?: ListCandidatesParams): Promise<CandidatesListResponse> {
  const { data } = await apiClient.get<CandidatesListResponse>("/candidates", { params });
  return data;
}

export async function getCandidate(candidateId: string): Promise<CandidateListItem> {
  const { data } = await apiClient.get<CandidateListItem>(`/candidates/${candidateId}`);
  return data;
}

/** Get current user's own candidate (auth only, no candidates.read). For role 'user' from share-candidate-form. */
export async function getMyCandidate(): Promise<CandidateListItem> {
  const { data } = await apiClient.get<CandidateListItem>("/candidates/me");
  return data;
}

/** Update current user's own candidate (auth only). For role 'user' from share-candidate-form. */
export async function updateMyCandidate(payload: Partial<CandidateListItem>): Promise<CandidateListItem> {
  const { data } = await apiClient.patch<CandidateListItem>("/candidates/me", payload);
  return data;
}

export async function createCandidate(payload: Partial<CandidateListItem>): Promise<CandidateListItem> {
  const { data } = await apiClient.post<CandidateListItem>("/candidates", payload);
  return data;
}

export async function updateCandidate(candidateId: string, payload: Partial<CandidateListItem>): Promise<CandidateListItem> {
  const { data } = await apiClient.patch<CandidateListItem>(`/candidates/${candidateId}`, payload);
  return data;
}

export async function deleteCandidate(candidateId: string): Promise<void> {
  await apiClient.delete(`/candidates/${candidateId}`);
}

export async function getCandidateDocuments(candidateId: string): Promise<CandidateDocument[]> {
  const res = await apiClient.get<{ success?: boolean; data?: CandidateDocument[] | { documents?: CandidateDocument[] } }>(
    `/candidates/documents/${candidateId}`
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
  }>(`/candidates/documents/${candidateId}/${documentIndex}/download`, {
    headers: { Accept: "application/json" },
  });
  if (!data?.success || !data?.data) throw new Error("Failed to get download URL");
  return data.data;
}

export async function addSalarySlipToCandidate(
  candidateId: string,
  payload: { month: string; year: number; documentUrl: string; key: string; originalName: string; size: number; mimeType: string }
): Promise<CandidateListItem> {
  const { data } = await apiClient.post<CandidateListItem>(`/candidates/salary-slips/${candidateId}`, payload);
  return data;
}

export async function shareCandidateProfile(
  candidateId: string,
  body: { email: string; withDoc?: boolean }
): Promise<{ publicUrl?: string }> {
  const { data } = await apiClient.post<{ success: boolean; data?: { publicUrl?: string } }>(
    `/candidates/share/${candidateId}`,
    { withDoc: body.withDoc ?? false, email: body.email }
  );
  return data?.data ?? {};
}

export async function exportCandidateProfile(candidateId: string, email: string): Promise<void> {
  await apiClient.post(`/candidates/${candidateId}/export`, { email });
}

export async function resendVerificationEmail(candidateId: string): Promise<void> {
  await apiClient.post(`/candidates/${candidateId}/resend-verification-email`);
}

export async function addNoteToCandidate(candidateId: string, note: string): Promise<void> {
  await apiClient.post(`/candidates/${candidateId}/notes`, { note });
}

export async function addFeedbackToCandidate(
  candidateId: string,
  feedback: string,
  rating?: number
): Promise<void> {
  await apiClient.post(`/candidates/${candidateId}/feedback`, { feedback, rating });
}

/** Export all candidates (CSV); optional body.email to send by email. When no email, returns CSV blob for download. Requires candidates.manage. */
export async function exportAllCandidates(params?: { owner?: string; fullName?: string; email?: string }, body?: { email?: string }): Promise<Blob | void> {
  const sendBlob = !body?.email
  const res = await apiClient.post("/candidates/export", body ?? {}, {
    params,
    ...(sendBlob ? { responseType: "blob" as const } : {}),
  });
  return res.data as Blob | void;
}

export async function assignRecruiterToCandidate(candidateId: string, recruiterId: string): Promise<void> {
  await apiClient.post(`/candidates/${candidateId}/assign-recruiter`, { recruiterId });
}

export async function updateJoiningDate(candidateId: string, joiningDate: string): Promise<void> {
  await apiClient.patch(`/candidates/${candidateId}/joining-date`, { joiningDate });
}

export async function updateResignDate(candidateId: string, resignDate: string | null): Promise<void> {
  await apiClient.patch(`/candidates/${candidateId}/resign-date`, { resignDate });
}

export async function updateWeekOff(candidateIds: string[], weekOff: string[]): Promise<void> {
  await apiClient.post("/candidates/week-off", { candidateIds, weekOff });
}

export async function getCandidateWeekOff(candidateId: string): Promise<{ weekOff?: string[] }> {
  const { data } = await apiClient.get<{ success?: boolean; data?: { weekOff?: string[] } }>(`/candidates/${candidateId}/week-off`);
  return (data as any)?.data ?? (data as any) ?? {};
}

export async function assignShiftToCandidates(candidateIds: string[], shiftId: string): Promise<void> {
  await apiClient.post("/candidates/assign-shift", { candidateIds, shiftId });
}

export interface DocumentStatusItem {
  index: number;
  status: number;
  adminNotes?: string;
}
export async function getDocumentStatus(candidateId: string): Promise<{ documents?: DocumentStatusItem[] }> {
  const { data } = await apiClient.get<{ success?: boolean; data?: { documents?: DocumentStatusItem[] } }>(
    `/candidates/documents/status/${candidateId}`
  );
  return (data as any)?.data ?? (data as any) ?? {};
}

export async function verifyDocument(
  candidateId: string,
  documentIndex: number,
  status: number,
  adminNotes?: string
): Promise<void> {
  await apiClient.patch(`/candidates/documents/verify/${candidateId}/${documentIndex}`, { status, adminNotes });
}

export async function updateSalarySlip(
  candidateId: string,
  salarySlipIndex: number,
  payload: { month?: string; year?: number; documentUrl?: string; key?: string; originalName?: string; size?: number; mimeType?: string }
): Promise<CandidateListItem> {
  const { data } = await apiClient.patch<CandidateListItem>(
    `/candidates/salary-slips/${candidateId}/${salarySlipIndex}`,
    payload
  );
  return data;
}

export async function deleteSalarySlip(candidateId: string, salarySlipIndex: number): Promise<void> {
  await apiClient.delete(`/candidates/salary-slips/${candidateId}/${salarySlipIndex}`);
}

/** Single file upload; returns URL and metadata for use in candidate documents/salarySlips/profilePicture */
export async function uploadDocument(
  file: File,
  label?: string
): Promise<{ url: string; key: string; originalName: string; size: number; mimeType: string }> {
  const formData = new FormData();
  formData.append("file", file);
  if (label) formData.append("label", label);
  const { data } = await apiClient.post<{
    success: boolean;
    data: { url: string; key: string; originalName: string; size: number; mimeType: string };
  }>("/upload/single", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
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
 * Map API candidate to the shape expected by the ATS candidates page UI (id, name, displayPicture, phone, email, skills[], education, experience, bio).
 */
export function mapCandidateToDisplay(c: CandidateListItem) {
  const skillsList = c.skills?.map((s) => (typeof s === "string" ? s : s.name)) ?? [];
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
    education,
    experience: experienceYears,
    bio: c.shortBio ?? "",
    isEmailVerified: (c as any).isEmailVerified ?? true,
    isProfileCompleted: (c as any).isProfileCompleted ?? 0,
    isCompleted: (c as any).isCompleted ?? false,
    _raw: c,
  };
}
