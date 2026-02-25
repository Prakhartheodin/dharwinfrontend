"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface TeamGroup {
  _id: string;
  /** Backend toJSON may return id instead of _id */
  id?: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamGroupsListParams {
  search?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface TeamGroupsListResponse {
  results: TeamGroup[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function listTeamGroups(
  params?: TeamGroupsListParams
): Promise<TeamGroupsListResponse> {
  const { data } = await apiClient.get<TeamGroupsListResponse>("/project-teams", { params });
  return data;
}

export async function getTeamGroupById(id: string): Promise<TeamGroup> {
  const { data } = await apiClient.get<TeamGroup>(`/project-teams/${id}`);
  return data;
}

export interface CreateTeamGroupPayload {
  name: string;
}

export async function createTeamGroup(payload: CreateTeamGroupPayload): Promise<TeamGroup> {
  const { data } = await apiClient.post<TeamGroup>("/project-teams", payload);
  return data;
}

export interface UpdateTeamGroupPayload {
  name?: string;
}

export async function updateTeamGroup(
  id: string,
  payload: UpdateTeamGroupPayload
): Promise<TeamGroup> {
  const { data } = await apiClient.patch<TeamGroup>(`/project-teams/${id}`, payload);
  return data;
}

export async function deleteTeamGroup(id: string): Promise<void> {
  await apiClient.delete(`/project-teams/${id}`);
}
