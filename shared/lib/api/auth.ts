"use client";

import { apiClient } from "@/shared/lib/api/client";
import { AUTH_ENDPOINTS } from "@/shared/lib/constants";
import type { AuthResponse, ImpersonateResponse, ImpersonationInfo, Session, User } from "@/shared/lib/types";

export interface LoginPayload {
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.login, payload);
  return data;
}

/** Refresh tokens – no body; backend reads refreshToken from HttpOnly cookie. */
export async function refreshTokens(): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.refreshTokens, {});
  return data;
}

/** Logout – no body; backend reads refreshToken from HttpOnly cookie, then clears cookies. */
export async function logout(): Promise<void> {
  await apiClient.post(AUTH_ENDPOINTS.logout, {});
}

/** Me response: user, optional impersonation, and optional sessions list. */
export interface MeResponse {
  user?: User;
  impersonation?: ImpersonationInfo;
  sessions?: Session[];
}

/** Response from GET /v1/auth/my-permissions. */
export interface MyPermissionsResponse {
  permissions: string[];
  roleNames: string[];
  isAdministrator: boolean;
  isPlatformSuperUser?: boolean;
  /** Email allowlist on server (DESIGNATED_SUPERADMIN_EMAILS); Activity Logs + support camera. */
  isDesignatedSuperadmin?: boolean;
}

/**
 * Get current user's resolved permissions (GET /v1/auth/my-permissions).
 * Auth required; no specific permission needed.
 */
export async function getMyPermissions(): Promise<MyPermissionsResponse | null> {
  try {
    const { data } = await apiClient.get<MyPermissionsResponse>(AUTH_ENDPOINTS.myPermissions);
    return data;
  } catch {
    return null;
  }
}

/** Payload for PATCH /auth/me – update own profile. Email cannot be changed. */
export interface UpdateMyProfilePayload {
  name?: string;
  notificationPreferences?: {
    leaveUpdates?: boolean;
    taskAssignments?: boolean;
    applicationUpdates?: boolean;
    offerUpdates?: boolean;
    meetingInvitations?: boolean;
    meetingReminders?: boolean;
    certificates?: boolean;
    courseUpdates?: boolean;
    recruiterUpdates?: boolean;
  };
  profilePicture?: {
    url?: string;
    key?: string;
    originalName?: string;
    size?: number;
    mimeType?: string;
  } | null;
  /** Digits-only phone (6–15), stored on User */
  phoneNumber?: string;
  countryCode?: string;
  education?: string;
  domain?: string[];
  location?: string;
  profileSummary?: string;
}

/**
 * Update own profile (PATCH /v1/auth/me). Auth only; no users.manage required.
 * Allowed fields: name, notificationPreferences, profilePicture, phone, location, education, etc. Email cannot be changed.
 */
export async function updateMyProfile(payload: UpdateMyProfilePayload): Promise<User> {
  const { data } = await apiClient.patch<User>(AUTH_ENDPOINTS.me, payload);
  return data;
}

/** Candidate shape from GET /auth/me/with-candidate (matches candidates API). */
export interface CandidateWithProfile {
  id?: string;
  _id?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  countryCode?: string;
  shortBio?: string;
  address?: { streetAddress?: string; streetAddress2?: string; city?: string; state?: string; zipCode?: string; country?: string };
  sevisId?: string;
  ead?: string;
  visaType?: string;
  customVisaType?: string;
  degree?: string;
  supervisorName?: string;
  supervisorContact?: string;
  supervisorCountryCode?: string;
  salaryRange?: string;
  employeeId?: string;
  profilePicture?: { url?: string; key?: string; originalName?: string; size?: number; mimeType?: string };
  qualifications?: Array<{ degree: string; institute: string; location?: string; startYear?: number; endYear?: number; description?: string }>;
  experiences?: Array<{ company: string; role: string; startDate?: string; endDate?: string; currentlyWorking?: boolean; description?: string }>;
  documents?: Array<{ type?: string; label?: string; url?: string; key?: string; originalName?: string }>;
  salarySlips?: Array<{ month?: string; year?: number; documentUrl?: string; key?: string; originalName?: string }>;
  /** Same shape as candidate wizard / PATCH candidates — kept in sync via me/with-candidate and candidate edit. */
  socialLinks?: Array<{ platform?: string; url?: string }>;
  [key: string]: unknown;
}

export interface MeWithCandidateResponse {
  user: User;
  candidate: CandidateWithProfile | null;
  sessions?: Session[];
  impersonation?: ImpersonationInfo;
}

/**
 * Get current user + candidate (GET /v1/auth/me/with-candidate).
 * Returns merged User + Candidate when user has Candidate role. Single source for Personal Information and My Profile.
 */
export async function getMeWithCandidate(): Promise<MeWithCandidateResponse | null> {
  try {
    const { data } = await apiClient.get<MeWithCandidateResponse>(AUTH_ENDPOINTS.meWithCandidate);
    return data;
  } catch {
    return null;
  }
}

/** Combined User + Candidate update payload for PATCH /auth/me/with-candidate. */
export type UpdateMeWithCandidatePayload = UpdateMyProfilePayload & Partial<{
  fullName: string;
  email: string;
  phoneNumber: string;
  shortBio: string | null;
  sevisId: string | null;
  ead: string | null;
  visaType: string;
  customVisaType: string | null;
  countryCode: string | null;
  degree: string | null;
  supervisorName: string | null;
  supervisorContact: string | null;
  supervisorCountryCode: string | null;
  salaryRange: string;
  address: { streetAddress?: string; streetAddress2?: string; city?: string; state?: string; zipCode?: string; country?: string };
  qualifications: Array<{ degree: string; institute: string; location?: string; startYear?: number; endYear?: number; description?: string }>;
  experiences: Array<{ company: string; role: string; startDate?: string; endDate?: string; currentlyWorking?: boolean; description?: string }>;
  documents: Array<{ type?: string; label?: string; url?: string; key?: string; originalName?: string; size?: number; mimeType?: string }>;
  skills: Array<{ name: string; level?: string; category?: string }>;
  socialLinks: Array<{ platform: string; url: string }>;
  salarySlips: Array<{ month?: string; year?: number; documentUrl?: string; key?: string; originalName?: string; size?: number; mimeType?: string }>;
}>;

/**
 * Update User and Candidate atomically (PATCH /v1/auth/me/with-candidate).
 * For users with Candidate role. Updates both in one transaction.
 */
export async function updateMeWithCandidate(payload: UpdateMeWithCandidatePayload): Promise<{ user: User; candidate: CandidateWithProfile }> {
  const { data } = await apiClient.patch<{ user: User; candidate: CandidateWithProfile }>(AUTH_ENDPOINTS.meWithCandidate, payload);
  return data;
}

/**
 * Get current authenticated user (GET /v1/auth/me).
 * Use to restore user state on app load when cookies are still valid.
 * When impersonating, response includes impersonation so UI can show "Viewing as [user]" and Exit.
 * On 401, user is not logged in or session expired.
 */
export async function getMe(): Promise<MeResponse | null> {
  try {
    const { data } = await apiClient.get<{ user?: User; impersonation?: ImpersonationInfo; sessions?: Session[] } & Partial<User>>(AUTH_ENDPOINTS.me);
    const user = data.user ?? (data.id != null ? (data as User) : null);
    if (!user) return null;
    return { user, impersonation: data.impersonation, sessions: data.sessions ?? [] };
  } catch {
    return null;
  }
}

/**
 * Start impersonation (POST /v1/auth/impersonate). Caller must have Administrator role.
 * Backend sets cookies to impersonated user; replace local user state with returned user.
 */
export async function impersonate(userId: string): Promise<ImpersonateResponse> {
  const { data } = await apiClient.post<ImpersonateResponse>(AUTH_ENDPOINTS.impersonate, { userId });
  return data;
}

/**
 * Stop impersonation (POST /v1/auth/stop-impersonation). Current session must be impersonation.
 * Backend restores admin session; replace local user state with returned admin user.
 */
export async function stopImpersonation(): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.stopImpersonation, {});
  return data;
}

/**
 * Change password (POST /v1/auth/change-password). Auth required.
 * Caller must send current password and new password; new password: min 8 chars, at least 1 letter and 1 number.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post(AUTH_ENDPOINTS.changePassword, { currentPassword, newPassword });
}

/** Request a verification email for the current user (POST /v1/auth/me/send-verification-email). Auth only; no permission required. */
export async function sendMyVerificationEmail(): Promise<void> {
  await apiClient.post(AUTH_ENDPOINTS.sendMyVerificationEmail);
}

/** Forgot password payload: email address to send reset link to. */
export interface ForgotPasswordPayload {
  email: string;
}

/** Request password reset email (POST /v1/auth/forgot-password). No auth required. */
export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  await apiClient.post(AUTH_ENDPOINTS.forgotPassword, payload);
}

/** Reset password payload – token from email link and new password. */
export interface ResetPasswordPayload {
  token: string;
  password: string;
}

/**
 * Complete password reset (POST /v1/auth/reset-password?token=...). No auth required.
 * Token is sent as query parameter; body only contains the new password.
 */
export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  const { token, password } = payload;
  await apiClient.post(
    `${AUTH_ENDPOINTS.resetPassword}?token=${encodeURIComponent(token)}`,
    { password }
  );
}

/**
 * Confirm email (POST /v1/auth/verify-email?token=...). No auth required.
 * Used by the verification link from registration / ATS resend.
 */
export async function verifyEmail(token: string): Promise<void> {
  await apiClient.post(`${AUTH_ENDPOINTS.verifyEmail}?token=${encodeURIComponent(token)}`);
}

/** Single candidate invitation: email + full onboarding URL (frontend builds URL with token/expiry). */
export interface SendCandidateInvitationPayload {
  email: string;
  onboardUrl: string;
}

/** Bulk: array of { email, onboardUrl }. Max 50. */
export interface SendCandidateInvitationBulkPayload {
  invitations: SendCandidateInvitationPayload[];
}

/**
 * Send preboarding/onboarding invitation email(s) (POST /v1/auth/send-candidate-invitation). Auth required.
 * Single: body { email, onboardUrl }. Bulk: body { invitations: [{ email, onboardUrl }, ...] }.
 */
export async function sendCandidateInvitation(
  payload: SendCandidateInvitationPayload | SendCandidateInvitationBulkPayload
): Promise<{ message: string; email?: string; results?: { successful: unknown[]; failed: unknown[]; total: number } }> {
  const { data } = await apiClient.post(AUTH_ENDPOINTS.sendCandidateInvitation, payload);
  return data;
}

/** Student registration payload - creates User + Student profile automatically */
export interface RegisterStudentPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  education?: Array<{
    degree?: string;
    institution?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string | null;
    isCurrent?: boolean;
    description?: string;
  }>;
  experience?: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string | null;
    isCurrent?: boolean;
    description?: string;
  }>;
  skills?: string[];
  documents?: Array<{
    name: string;
    type: string;
    fileUrl?: string;
    fileKey?: string;
  }>;
  bio?: string;
  profileImageUrl?: string;
}

/** Student registration response - includes user, student, and optionally tokens */
export interface RegisterStudentResponse {
  user: User;
  student: {
    id: string;
    user: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    } | null;
    education?: Array<{
      degree?: string;
      institution?: string;
      fieldOfStudy?: string;
      startDate?: string;
      endDate?: string | null;
      isCurrent?: boolean;
      description?: string;
    }>;
    experience?: Array<{
      title?: string;
      company?: string;
      location?: string;
      startDate?: string;
      endDate?: string | null;
      isCurrent?: boolean;
      description?: string;
    }>;
    skills?: string[];
    documents?: Array<{
      name: string;
      type: string;
      fileUrl?: string;
      fileKey?: string;
    }>;
    bio?: string | null;
    profileImageUrl?: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  tokens?: {
    access: { token: string; expires: string };
    refresh: { token: string; expires: string };
  };
}

/**
 * Register student (POST /v1/auth/register-student).
 * Creates User + Student profile automatically.
 * Admin registration (with auth): isEmailVerified=true, no tokens
 * Self-registration (no auth): isEmailVerified=false, tokens issued
 */
export async function registerStudent(payload: RegisterStudentPayload): Promise<RegisterStudentResponse> {
  const { data } = await apiClient.post<RegisterStudentResponse>(AUTH_ENDPOINTS.registerStudent, payload);
  return data;
}

/** Mentor registration payload - creates User + Mentor profile automatically */
export interface RegisterMentorPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  expertise?: Array<{
    area?: string;
    level?: string;
    yearsOfExperience?: number;
    description?: string;
  }>;
  experience?: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string | null;
    isCurrent?: boolean;
    description?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    issueDate?: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
  }>;
  skills?: string[];
  bio?: string;
  profileImageUrl?: string;
}

/** Mentor registration response - includes user, mentor, and optionally tokens */
export interface RegisterMentorResponse {
  user: User;
  mentor: {
    id: string;
    user: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    } | null;
    expertise?: Array<{
      area?: string;
      level?: string;
      yearsOfExperience?: number;
      description?: string;
    }>;
    experience?: Array<{
      title?: string;
      company?: string;
      location?: string;
      startDate?: string;
      endDate?: string | null;
      isCurrent?: boolean;
      description?: string;
    }>;
    certifications?: Array<{
      name: string;
      issuer: string;
      issueDate?: string;
      expiryDate?: string;
      credentialId?: string;
      credentialUrl?: string;
    }>;
    skills?: string[];
    bio?: string | null;
    profileImageUrl?: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  tokens?: {
    access: { token: string; expires: string };
    refresh: { token: string; expires: string };
  };
}

/** Recruiter registration payload (Admin only) */
export interface RegisterRecruiterPayload {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  countryCode?: string;
  education?: string;
  domain?: string | string[];
  location?: string;
  profileSummary?: string;
}

/** Recruiter registration response */
export interface RegisterRecruiterResponse {
  user: User;
}

/**
 * Register recruiter (POST /v1/auth/register-recruiter). Admin only.
 * Creates User with Recruiter role.
 */
export async function registerRecruiter(payload: RegisterRecruiterPayload): Promise<RegisterRecruiterResponse> {
  const { data } = await apiClient.post<RegisterRecruiterResponse>(AUTH_ENDPOINTS.registerRecruiter, payload);
  return data;
}

/**
 * Register mentor (POST /v1/auth/register-mentor).
 * Creates User + Mentor profile automatically.
 * Admin registration (with auth): isEmailVerified=true, no tokens
 * Self-registration (no auth): isEmailVerified=false, tokens issued
 */
export async function registerMentor(payload: RegisterMentorPayload): Promise<RegisterMentorResponse> {
  const { data } = await apiClient.post<RegisterMentorResponse>(AUTH_ENDPOINTS.registerMentor, payload);
  return data;
}
