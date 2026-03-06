"use client";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AUTH_ENDPOINTS } from "@/shared/lib/constants";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

function isAuthEndpoint(url: string): boolean {
  const path = url.split("?")[0];
  return (
    path.endsWith("/auth/login") ||
    path.endsWith("/auth/refresh-tokens") ||
    path.endsWith("/auth/logout")
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
    } catch {
      onSessionExpired?.();
      return Promise.reject(error);
    }
  }
);
