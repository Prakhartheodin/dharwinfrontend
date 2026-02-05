"use client";

import { apiClient } from "@/shared/lib/api/client";
import { AUTH_ENDPOINTS } from "@/shared/lib/constants";
import type { AuthResponse, ImpersonateResponse, ImpersonationInfo, User } from "@/shared/lib/types";

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

/** Me response: user and optional impersonation when in impersonation session. */
export interface MeResponse {
  user?: User;
  impersonation?: ImpersonationInfo;
}

/**
 * Get current authenticated user (GET /v1/auth/me).
 * Use to restore user state on app load when cookies are still valid.
 * When impersonating, response includes impersonation so UI can show "Viewing as [user]" and Exit.
 * On 401, user is not logged in or session expired.
 */
export async function getMe(): Promise<MeResponse | null> {
  try {
    const { data } = await apiClient.get<{ user?: User; impersonation?: ImpersonationInfo } & Partial<User>>(AUTH_ENDPOINTS.me);
    const user = data.user ?? (data.id != null ? (data as User) : null);
    if (!user) return null;
    return { user, impersonation: data.impersonation };
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
