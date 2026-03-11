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

/** Dharwrin-style: register from invite link – POST /v1/auth/register. Creates User (active) + Candidate, returns tokens. */
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

/** Notification email preferences (matches backend user.notificationPreferences). */
export interface NotificationPreferences {
  leaveUpdates?: boolean;
  taskAssignments?: boolean;
  applicationUpdates?: boolean;
  offerUpdates?: boolean;
  meetingInvitations?: boolean;
  meetingReminders?: boolean;
  certificates?: boolean;
  courseUpdates?: boolean;
  recruiterUpdates?: boolean;
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
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${userId}`, payload);
  return data;
}

export async function deleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}`);
}
