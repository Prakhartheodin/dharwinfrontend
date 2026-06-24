"use client";

import { apiClient } from "@/shared/lib/api/client";
import { AUTH_ENDPOINTS } from "@/shared/lib/constants";
import type { User, UsersListResponse } from "@/shared/lib/types";
import type { AuthResponse } from "@/shared/lib/types";

export interface PublicRegisterPayload {
  name: string;
  email: string;
  password: string;
  isEmailVerified?: boolean;
  roleIds?: string[];
}

export interface PublicRegisterResponse {
  user: User;
  message: string;
}

export interface ListUsersParams {
  search?: string;
  role?: string;
  status?: string;
  limit?: number;
  page?: number;
}

/** List recruiters – GET /users?role=recruiter */
export async function listRecruiters(params?: Omit<ListUsersParams, "role">): Promise<UsersListResponse> {
  return listUsers({ ...params, role: "recruiter" });
}

/** Export recruiters to Excel – GET /recruiters/export/excel */
export async function exportRecruitersToExcel(): Promise<Blob> {
  const { data } = await apiClient.get<Blob>("/recruiters/export/excel", { responseType: "blob" });
  return data;
}

/** Download recruiter Excel template – GET /recruiters/template/excel */
export async function downloadRecruitersTemplate(): Promise<Blob> {
  const { data } = await apiClient.get<Blob>("/recruiters/template/excel", { responseType: "blob" });
  return data;
}

/** Import recruiters from Excel – POST /recruiters/import/excel */
export async function importRecruitersFromExcel(file: File): Promise<{
  message: string;
  results?: { successful: unknown[]; failed: unknown[] };
  summary?: { total: number; successful: number; failed: number };
}> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post("/recruiters/import/excel", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * Official/work email for business invites, falling back to the account (personal) email.
 * Backend may expose officialEmail/workEmail/companyEmail; until then this returns the account email.
 */
export function pickOfficialEmail(u: User): string {
  const r = u as Record<string, unknown>;
  const official =
    // companyAssignedEmail is the field assigned in Settings → Company work email.
    (typeof r.companyAssignedEmail === "string" && r.companyAssignedEmail.trim()) ||
    (typeof r.officialEmail === "string" && r.officialEmail.trim()) ||
    (typeof r.workEmail === "string" && r.workEmail.trim()) ||
    (typeof r.companyEmail === "string" && r.companyEmail.trim()) ||
    "";
  return official || u.email;
}

/** The company-assigned work email only (empty string if none assigned). No personal fallback. */
export function getCompanyAssignedEmail(u: User): string {
  const r = u as Record<string, unknown>;
  return (typeof r.companyAssignedEmail === "string" && r.companyAssignedEmail.trim()) || "";
}

export async function listUsers(params?: ListUsersParams): Promise<UsersListResponse> {
  const { data } = await apiClient.get<UsersListResponse>("/users", { params });
  return data;
}

export async function getUser(userId: string): Promise<User> {
  const { data } = await apiClient.get<User>(`/users/${userId}`);
  return data;
}

export interface RegisterUserPayload {
  name: string;
  email: string;
  password: string;
  roleIds?: string[];
  isEmailVerified?: boolean;
  /** Saved on User; also used when creating linked Candidate/Student profiles. */
  phoneNumber?: string;
  countryCode?: string;
  /** Optional — applied to linked Candidate (ATS) record when Employee user role is assigned. */
  employeeId?: string;
  shortBio?: string;
  /** ISO date string (YYYY-MM-DD) or full ISO datetime */
  joiningDate?: string | null;
  department?: string;
  designation?: string;
  degree?: string;
  salaryRange?: string;
  /** Administrators only — `pending` blocks sign-in until activated. */
  status?: "active" | "pending";
}

/** Public registration – POST /v1/auth/register. No auth required; sets HttpOnly cookies on success. */
export async function registerUser(payload: RegisterUserPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.register, payload);
  return data;
}

/** Public registration – POST /v1/public/register. No auth required; user created with status pending. */
export async function publicRegisterUser(payload: PublicRegisterPayload): Promise<PublicRegisterResponse> {
  const { data } = await apiClient.post<PublicRegisterResponse>(AUTH_ENDPOINTS.publicRegister, payload);
  return data;
}

export interface PublicRegisterCandidatePayload {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  /** ISO 3166-1 alpha-2 (e.g. US) — persisted on user + candidate for correct dial code in profile */
  countryCode?: string;
  /** HMAC referral token from public share/apply link (?ref=). */
  ref?: string;
}

export interface PublicRegisterCandidateResponse {
  user: User;
  candidate: { _id: string; fullName: string; email: string; [key: string]: unknown };
  message: string;
}

/** Public candidate onboarding – POST /v1/public/register-candidate. Creates User (pending) + Candidate so they appear in ATS list. */
export async function publicRegisterCandidate(
  payload: PublicRegisterCandidatePayload
): Promise<PublicRegisterCandidateResponse> {
  const { data } = await apiClient.post<PublicRegisterCandidateResponse>(
    AUTH_ENDPOINTS.publicRegisterCandidate,
    payload
  );
  return data;
}

/** Share-candidate invite – POST /v1/auth/register (with adminId). Creates pending User + Candidate role; verify email to activate. */
export interface RegisterCandidateFromInvitePayload {
  name: string;
  email: string;
  password: string;
  role: "user";
  phoneNumber: string;
  countryCode: string;
  adminId: string;
}

export interface RegisterCandidateFromInviteResponse {
  user: User;
  tokens: { access: { token: string; expires: string }; refresh: { token: string; expires: string } };
}

export async function registerCandidateFromInvite(
  payload: RegisterCandidateFromInvitePayload
): Promise<RegisterCandidateFromInviteResponse> {
  const { data } = await apiClient.post<RegisterCandidateFromInviteResponse>(AUTH_ENDPOINTS.register, payload);
  return data;
}

/** Notification preferences per channel (matches backend user.notificationPreferences). */
export interface NotificationPreferences {
  leaveUpdates?: boolean;
  leaveUpdatesInApp?: boolean;
  taskAssignments?: boolean;
  taskAssignmentsInApp?: boolean;
  applicationUpdates?: boolean;
  applicationUpdatesInApp?: boolean;
  offerUpdates?: boolean;
  offerUpdatesInApp?: boolean;
  meetingInvitations?: boolean;
  meetingInvitationsInApp?: boolean;
  meetingReminders?: boolean;
  meetingRemindersInApp?: boolean;
  certificates?: boolean;
  certificatesInApp?: boolean;
  courseUpdates?: boolean;
  courseUpdatesInApp?: boolean;
  recruiterUpdates?: boolean;
  recruiterUpdatesInApp?: boolean;
  supportTicketUpdates?: boolean;
  supportTicketUpdatesInApp?: boolean;
  placementUpdates?: boolean;
  placementUpdatesInApp?: boolean;
  chatMessagesInApp?: boolean;
  assignmentUpdatesInApp?: boolean;
  projectUpdatesInApp?: boolean;
  sopAssignmentsInApp?: boolean;
}

export interface ProfilePicturePayload {
  url: string;
  key?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
}

export interface UpdateUserPayload {
  name?: string;
  username?: string;
  email?: string;
  roleIds?: string[];
  status?: string;
  phoneNumber?: string;
  countryCode?: string;
  education?: string;
  domain?: string[];
  location?: string;
  profileSummary?: string;
  profilePicture?: ProfilePicturePayload | null;
  notificationPreferences?: NotificationPreferences;
  /** HRM monitoring: must match Agent:DeviceId / machine name. Administrators only. */
  hrmDeviceId?: string | null;
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${userId}`, payload);
  return data;
}

export async function deleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}`);
}
