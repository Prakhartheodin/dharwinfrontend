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

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  roleIds?: string[];
  status?: string;
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${userId}`, payload);
  return data;
}

export async function deleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}`);
}
