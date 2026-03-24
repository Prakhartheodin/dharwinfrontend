"use client";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AUTH_ENDPOINTS } from "@/shared/lib/constants";

/** Strip trailing slashes so paths join cleanly with axios `baseURL`. */
export function normalizeApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (raw) return raw;
  if (typeof window !== "undefined") return "/api/v1";
  return "http://127.0.0.1:3000/v1";
}

export const apiClient = axios.create({
  baseURL: normalizeApiBase(),
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

const RESIGN_SESSION_FLAG = "dharwin_candidate_resigned_redirect";

/** Call when token refresh fails because the candidate has resigned (admin must clear/change resign date). */
export function flagCandidateResignedRedirect() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(RESIGN_SESSION_FLAG, "1");
  } catch {
    /* ignore */
  }
}

/** Sign-in page: show resign popup once after redirect from failed refresh. */
export function consumeCandidateResignedRedirect(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(RESIGN_SESSION_FLAG) !== "1") return false;
    sessionStorage.removeItem(RESIGN_SESSION_FLAG);
    return true;
  } catch {
    return false;
  }
}

function isAuthEndpoint(url: string): boolean {
  const path = url.split("?")[0];
  return (
    path.endsWith("/auth/login") ||
    path.endsWith("auth/login") ||
    path.endsWith("/auth/refresh-tokens") ||
    path.endsWith("auth/refresh-tokens") ||
    path.endsWith("/auth/logout") ||
    path.endsWith("auth/logout")
  );
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status !== 401 || config._retry || isAuthEndpoint(config?.url ?? "")) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      await apiClient.post(AUTH_ENDPOINTS.refreshTokens, {});
      return apiClient(config);
    } catch (refreshErr) {
      const data = (refreshErr as AxiosError)?.response?.data as { errorCode?: string } | undefined;
      if (data?.errorCode === "CANDIDATE_RESIGNED") {
        flagCandidateResignedRedirect();
      }
      onSessionExpired?.();
      return Promise.reject(error);
    }
  }
);
