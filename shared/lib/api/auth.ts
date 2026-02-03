"use client";

import { apiClient } from "@/shared/lib/api/client";
import { AUTH_ENDPOINTS } from "@/shared/lib/constants";
import type { AuthResponse, User } from "@/shared/lib/types";

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

/**
 * Get current authenticated user (GET /v1/auth/me).
 * Use to restore user state on app load when cookies are still valid.
 * On 401, user is not logged in or session expired.
 */
export async function getMe(): Promise<User | null> {
  try {
    const { data } = await apiClient.get<{ user?: User } & Partial<User>>(AUTH_ENDPOINTS.me);
    const user = data.user ?? (data.id != null ? (data as User) : null);
    return user ?? null;
  } catch {
    return null;
  }
}
