"use client";

import { apiClient } from "@/shared/lib/api/client";

export type TeamGroup = "team_ui" | "team_react" | "team_testing";

export interface TeamMemberTeamRef {
  _id: string;
  name?: string;
}

export interface TeamMember {
  _id: string;
  /** Backend toJSON may return id instead of _id */
  id?: string;
  name: string;
  email: string;
  memberSinceLabel?: string;
  projectsCount: number;
  position?: string;
  coverImageUrl?: string;
  avatarImageUrl?: string;
  /** Presigned URL from GET /teams when a Candidate with this email has profilePicture (server-enriched). */
  candidateProfilePictureUrl?: string;
  teamGroup: TeamGroup;
  teamId?: string | TeamMemberTeamRef;
  onlineStatus: "online" | "offline";
  lastSeenLabel?: string;
  isStarred?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamMembersListParams {
  teamGroup?: TeamGroup;
  /** Filter by TeamGroup _id (project-teams) */
  teamId?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface TeamMembersListResponse {
  results: TeamMember[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export const TEAM_GROUP_LABELS: Record<TeamGroup, string> = {
  team_ui: "TEAM UI",
  team_react: "TEAM REACT",
  team_testing: "TEAM TESTING",
};

export async function listTeamMembers(
  params?: TeamMembersListParams
): Promise<TeamMembersListResponse> {
  const { data } = await apiClient.get<TeamMembersListResponse>("/teams", { params });
  return data;
}

export async function getTeamMemberById(id: string): Promise<TeamMember> {
  const { data } = await apiClient.get<TeamMember>(`/teams/${id}`);
  return data;
}

export interface CreateTeamMemberPayload {
  name: string;
  email: string;
  memberSinceLabel?: string;
  projectsCount?: number;
  position?: string;
  coverImageUrl?: string;
  avatarImageUrl?: string;
  teamGroup?: TeamGroup;
  teamId?: string;
  onlineStatus?: "online" | "offline";
  lastSeenLabel?: string;
  isStarred?: boolean;
}

export async function createTeamMember(payload: CreateTeamMemberPayload): Promise<TeamMember> {
  const { data } = await apiClient.post<TeamMember>("/teams", payload);
  return data;
}

export interface UpdateTeamMemberPayload extends Partial<CreateTeamMemberPayload> {}

export async function updateTeamMember(
  id: string,
  payload: UpdateTeamMemberPayload
): Promise<TeamMember> {
  const { data } = await apiClient.patch<TeamMember>(`/teams/${id}`, payload);
  return data;
}

export async function deleteTeamMember(id: string): Promise<void> {
  await apiClient.delete(`/teams/${id}`);
}

