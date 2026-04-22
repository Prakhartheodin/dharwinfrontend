"use client";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AUTH_ENDPOINTS } from "@/shared/lib/constants";
import {
  getActivityLogClientGeoHeaderValue,
  getStoredRealIp,
  X_CLIENT_IP_HEADER,
} from "@/shared/lib/activity-log-client-geo";

/** Strip trailing slashes so paths join cleanly with axios `baseURL`. */
export function normalizeApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (raw) return raw;
  if (typeof window !== "undefined") return "/api/v1";
  return "http://127.0.0.1:3000/v1";
}

/**
 * Backend sometimes returns absolute URLs pointing at a dev API host (e.g. http://localhost:3002/v1/...).
 * End users' browsers cannot reach that host — they get ERR_CONNECTION_REFUSED.
 * Rewrite those to the same-origin Next proxy (`/api` + `/v1/...`) so cookies and rewrites work.
 * Presigned S3 URLs (amazonaws.com, etc.) are left unchanged.
 */
export function resolveDownloadUrlForBrowser(url: string): string {
  if (typeof window === "undefined" || !url || typeof url !== "string") return url;
  try {
    const u = new URL(url);
    const isLoopback =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "[::1]";
    if (!isLoopback) return url;
    const path = u.pathname.replace(/\/$/, "") || "/";
    const isCandidateDocDownload = /^\/v1\/(?:candidates|employees)\/documents\/[^/]+\/\d+\/download$/i.test(
      path
    );
    const isSalarySlip = /^\/v1\/(?:candidates|employees)\/salary-slips\/[^/]+\/\d+$/i.test(path);
    if (isCandidateDocDownload || isSalarySlip) {
      return `${window.location.origin}/api${path}${u.search}`;
    }
  } catch {
    return url;
  }
  return url;
}

export const apiClient = axios.create({
  baseURL: normalizeApiBase(),
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const geo = getActivityLogClientGeoHeaderValue();
  if (geo) {
    cfg.headers = cfg.headers ?? {};
    (cfg.headers as Record<string, string>)["X-Activity-Client-Geo"] = geo;
  }

  const clientIp = getStoredRealIp();
  if (clientIp) {
    cfg.headers = cfg.headers ?? {};
    (cfg.headers as Record<string, string>)[X_CLIENT_IP_HEADER] = clientIp;
  }

  return cfg;
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
