"use client";

import { apiClient } from "@/shared/lib/api/client";
import type { Role, RolesListResponse } from "@/shared/lib/types";

export interface ListRolesParams {
  name?: string;
  status?: "active" | "inactive";
  sortBy?: string;
  limit?: number;
  page?: number;
}

export async function listRoles(params?: ListRolesParams): Promise<RolesListResponse> {
  const { data } = await apiClient.get<RolesListResponse>("/roles", { params });
  return data;
}

export async function getRole(roleId: string): Promise<Role> {
  const { data } = await apiClient.get<Role>(`/roles/${roleId}`);
  return data;
}

export interface CreateRolePayload {
  name: string;
  permissions?: string[];
  status?: "active" | "inactive";
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
  const { data } = await apiClient.post<Role>("/roles", payload);
  return data;
}

export interface UpdateRolePayload {
  name?: string;
  permissions?: string[];
  status?: "active" | "inactive";
}

export async function updateRole(roleId: string, payload: UpdateRolePayload): Promise<Role> {
  const { data } = await apiClient.patch<Role>(`/roles/${roleId}`, payload);
  return data;
}

export async function deleteRole(roleId: string): Promise<void> {
  await apiClient.delete(`/roles/${roleId}`);
}
