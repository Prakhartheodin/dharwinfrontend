"use client";

import { apiClient } from "@/shared/lib/api/client";
import { AUTH_ENDPOINTS } from "@/shared/lib/constants";
import { consumeCaptchaToken, getOptionalCaptchaToken } from "@/shared/lib/publicApplyResume";
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
  sortBy?: string;
  limit?: number;
  page?: number;
  names?: string[];
  domains?: string[];
  education?: string[];
  locations?: string[];
  email?: string;
}

export type ListRecruitersParams = Omit<ListUsersParams, 'role'>;

export interface RecruiterFilterOptions {
  names: string[];
  domains: string[];
  education: string[];
  locations: string[];
  emails: string[];
}

function serializeUserListParams(
  params?: ListUsersParams
): Record<string, string | number> | undefined {
  if (!params) return undefined;
  const query: Record<string, string | number> = {};
  if (params.search) query.search = params.search;
  if (params.role) query.role = params.role;
  if (params.status) query.status = params.status;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.limit != null) query.limit = params.limit;
  if (params.page != null) query.page = params.page;
  if (params.email) query.email = params.email;
  if (params.names?.length) query.names = params.names.join(',');
  if (params.domains?.length) query.domains = params.domains.join(',');
  if (params.education?.length) query.education = params.education.join(',');
  if (params.locations?.length) query.locations = params.locations.join(',');
  return query;
}

/** List recruiters – GET /users?role=recruiter */
export async function listRecruiters(params?: ListRecruitersParams): Promise<UsersListResponse> {
  return listUsers({ ...params, role: 'recruiter' });
}

/** Distinct sidebar filter values for recruiters. */
export async function getRecruiterFilterOptions(
  params?: Pick<ListRecruitersParams, 'search'>
): Promise<RecruiterFilterOptions> {
  const { data } = await apiClient.get<RecruiterFilterOptions>('/users/filter-options', {
    params: {
      role: 'recruiter',
      ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
    },
  });
  return data;
}

/** Export recruiters to Excel – GET /recruiters/export/excel */
export async function exportRecruitersToExcel(
  params: ListRecruitersParams = {}
): Promise<{ blob: Blob; capped: boolean; totalResults?: number; exportMax?: number }> {
  const res = await apiClient.get<Blob>('/recruiters/export/excel', {
    params: serializeUserListParams(params),
    responseType: 'blob',
  });
  const capped = res.headers['x-export-capped'] === 'true';
  const totalResults = res.headers['x-export-total-results']
    ? Number(res.headers['x-export-total-results'])
    : undefined;
  const exportMax = res.headers['x-export-max-rows']
    ? Number(res.headers['x-export-max-rows'])
    : undefined;
  return { blob: res.data, capped, totalResults, exportMax };
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

/**
 * True when this user has switched OFF meeting-invitation email in their own notification
 * preferences (Settings → Personal Information → Meetings & learning).
 *
 * The backend drops such a recipient before the send, so an address appearing on a meeting's
 * invite list says nothing about whether they were actually told. Callers use this to mark the
 * invitee in the UI instead of letting the list imply a delivery that never happens. Unset
 * preferences mean opted in, matching the backend schema default.
 */
export function hasMeetingEmailMuted(u: User): boolean {
  const r = u as Record<string, unknown>;
  const prefs = r.notificationPreferences as NotificationPreferences | undefined;
  return prefs?.meetingInvitations === false;
}

/** The company-assigned work email only (empty string if none assigned). No personal fallback. */
export function getCompanyAssignedEmail(u: User): string {
  const r = u as Record<string, unknown>;
  return (typeof r.companyAssignedEmail === "string" && r.companyAssignedEmail.trim()) || "";
}

export const USERS_LIST_MAX_PAGE_SIZE = 100;

export async function listUsers(params?: ListUsersParams): Promise<UsersListResponse> {
  const { data } = await apiClient.get<UsersListResponse>('/users', {
    params: serializeUserListParams(params),
  });
  return data;
}

/** Fetch all users matching filters, paginating at the backend max page size. */
export async function listAllUsers(
  params?: Omit<ListUsersParams, 'limit' | 'page'>
): Promise<User[]> {
  let pageNum = 1;
  let totalPages = 1;
  const allUsers: User[] = [];
  do {
    const res = await listUsers({
      ...params,
      limit: USERS_LIST_MAX_PAGE_SIZE,
      page: pageNum,
    });
    allUsers.push(...(res.results ?? []));
    totalPages = res.totalPages ?? 1;
    pageNum += 1;
  } while (pageNum <= totalPages);
  return allUsers;
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
  const headers = publicCandidateRegistrationHeaders();
  try {
    const { data } = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.register, payload, { headers });
    releaseCaptchaTokenIfSent(headers);
    return data;
  } catch (err) {
    releaseCaptchaTokenIfSent(headers);
    throw err;
  }
}

function publicCandidateRegistrationHeaders(): Record<string, string> {
  const captcha = getOptionalCaptchaToken();
  return captcha ? { "x-captcha-token": captcha } : {};
}

function releaseCaptchaTokenIfSent(headers: Record<string, string>): void {
  if (headers["x-captcha-token"]) {
    consumeCaptchaToken();
  }
}

/** Public registration – POST /v1/public/register. No auth required; user created with status pending. */
export async function publicRegisterUser(payload: PublicRegisterPayload): Promise<PublicRegisterResponse> {
  const headers = publicCandidateRegistrationHeaders();
  try {
    const { data } = await apiClient.post<PublicRegisterResponse>(AUTH_ENDPOINTS.publicRegister, payload, { headers });
    return data;
  } finally {
    releaseCaptchaTokenIfSent(headers);
  }
}

export type PublicCandidateRegistrationExtras = {
  entryMode?: "manual" | "ai";
  resume?: File | null;
  skills?: Array<{ name: string; level?: string; category?: string }>;
  experiences?: unknown[];
  qualifications?: unknown[];
  socialLinks?: unknown[];
};

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

function appendCandidateRegistrationProfileFields(
  formData: FormData,
  extras?: PublicCandidateRegistrationExtras
) {
  const mode = extras?.entryMode === "ai" ? "ai" : "manual";
  formData.append("entryMode", mode);
  if (extras?.skills && extras.skills.length > 0) {
    formData.append("skills", JSON.stringify(extras.skills));
  }
  if (extras?.experiences && extras.experiences.length > 0) {
    formData.append("experiences", JSON.stringify(extras.experiences));
  }
  if (extras?.qualifications && extras.qualifications.length > 0) {
    formData.append("qualifications", JSON.stringify(extras.qualifications));
  }
  if (extras?.socialLinks && extras.socialLinks.length > 0) {
    formData.append("socialLinks", JSON.stringify(extras.socialLinks));
  }
  if (extras?.resume) {
    formData.append("resume", extras.resume);
  }
}

export interface PublicRegisterCandidateResponse {
  user: User;
  candidate: { _id: string; fullName: string; email: string; [key: string]: unknown };
  message: string;
}

/** Public candidate onboarding – POST /v1/public/register-candidate. Creates User (pending) + Candidate so they appear in ATS list. */
export async function publicRegisterCandidate(
  payload: PublicRegisterCandidatePayload,
  extras?: PublicCandidateRegistrationExtras
): Promise<PublicRegisterCandidateResponse> {
  if (!extras?.resume) {
    const headers = publicCandidateRegistrationHeaders();
    try {
      const { data } = await apiClient.post<PublicRegisterCandidateResponse>(
        AUTH_ENDPOINTS.publicRegisterCandidate,
        payload,
        { headers }
      );
      releaseCaptchaTokenIfSent(headers);
      return data;
    } catch (err) {
      releaseCaptchaTokenIfSent(headers);
      throw err;
    }
  }

  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  if (payload.phoneNumber) formData.append("phoneNumber", payload.phoneNumber);
  if (payload.countryCode) formData.append("countryCode", payload.countryCode);
  if (payload.ref?.trim()) formData.append("ref", payload.ref.trim());
  appendCandidateRegistrationProfileFields(formData, extras);

  const headers = publicCandidateRegistrationHeaders();
  try {
    const { data } = await apiClient.post<PublicRegisterCandidateResponse>(
      AUTH_ENDPOINTS.publicRegisterCandidate,
      formData,
      {
        timeout: 120_000,
        headers,
        transformRequest: [
          (body: unknown, requestHeaders: Record<string, string>) => {
            delete requestHeaders["Content-Type"];
            return body;
          },
        ],
      }
    );
    releaseCaptchaTokenIfSent(headers);
    return data;
  } catch (err) {
    releaseCaptchaTokenIfSent(headers);
    throw err;
  }
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
  /** True when an unfinished (pending, unverified) signup was resumed and the verification email re-sent. */
  resent?: boolean;
  message?: string;
  tokens?: { access: { token: string; expires: string }; refresh: { token: string; expires: string } };
}

export async function registerCandidateFromInvite(
  payload: RegisterCandidateFromInvitePayload,
  extras?: PublicCandidateRegistrationExtras
): Promise<RegisterCandidateFromInviteResponse> {
  if (!extras?.resume) {
    const headers = publicCandidateRegistrationHeaders();
    try {
      const { data } = await apiClient.post<RegisterCandidateFromInviteResponse>(AUTH_ENDPOINTS.register, payload, {
        headers,
      });
      releaseCaptchaTokenIfSent(headers);
      return data;
    } catch (err) {
      releaseCaptchaTokenIfSent(headers);
      throw err;
    }
  }

  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  formData.append("role", payload.role);
  formData.append("phoneNumber", payload.phoneNumber);
  formData.append("countryCode", payload.countryCode);
  formData.append("adminId", payload.adminId);
  appendCandidateRegistrationProfileFields(formData, extras);

  const headers = publicCandidateRegistrationHeaders();
  try {
    const { data } = await apiClient.post<RegisterCandidateFromInviteResponse>(AUTH_ENDPOINTS.register, formData, {
      timeout: 120_000,
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
  smartNudges?: boolean;
  smartNudgesInApp?: boolean;
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
