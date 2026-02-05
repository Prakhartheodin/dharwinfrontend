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
