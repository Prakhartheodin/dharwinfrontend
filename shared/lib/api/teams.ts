"use client";

import { apiClient, normalizeApiBase } from "@/shared/lib/api/client";

export type TeamGroup = "team_ui" | "team_react" | "team_testing";

export interface TeamMemberTeamRef {
  _id: string;
  name?: string;
}

/** Populated `employeeId` from GET /teams (Excel / additive merge paths). */
export type TeamMemberEmployeePopulated = {
  _id?: string;
  id?: string;
  employeeId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  isActive?: boolean;
};

export type TeamMemberAssignmentMode =
  | "manual"
  | "excel-import"
  | "position-auto"
  | "ai-suggested";

export interface TeamMember {
  _id: string;
  /** Backend toJSON may return id instead of _id */
  id?: string;
  /** Legacy denormalized roster fields; optional when row is keyed by employeeId (import). */
  name?: string;
  email?: string;
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
  /** Additive: ATS Employee ref (string id or populated object). */
  employeeId?: string | TeamMemberEmployeePopulated;
  seniority?: string;
  assignmentMode?: TeamMemberAssignmentMode;
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

// ---------------------------------------------------------------------------
// Excel import / export / template / logs
// ---------------------------------------------------------------------------

export type TeamImportSkipReason =
  | "employee_not_found"
  | "inactive_or_resigned"
  | "dummy_name_pattern"
  | "dummy_email_pattern"
  | "ambiguous_employee_name"
  | "already_in_team"
  | "missing_identifiers"
  | "team_lead_unmatched"
  | "metadata_conflict";

export interface TeamImportSummary {
  teamsCreated: number;
  teamsUpdated: number;
  employeesAdded: number;
  employeesIgnored: number;
  duplicatesSkipped: number;
  ambiguousNames: number;
  teamLeadSkipped: number;
  metadataConflicts: number;
  rowsProcessed: number;
}

export interface TeamImportResult {
  summary: TeamImportSummary;
  details: {
    skipped: Array<{
      row?: number;
      team: string;
      identifier?: string;
      reason: TeamImportSkipReason;
      matchCount?: number;
    }>;
    duplicates: Array<{ team: string; employeeId: string; reason: "already_in_team" }>;
    metadataConflicts: Array<{ team: string; field: string; kept: string; ignored: string[] }>;
    teamLeadSkipped: Array<{ team: string; providedLeadEmail: string; reason: string }>;
    warnings: Array<{ type: string; [k: string]: unknown }>;
  };
  summaryFileUrl?: string;
  importLogId: string;
}

export interface TeamImportLogEntry {
  id: string;
  uploadedBy: { id: string; name: string; email: string };
  fileName?: string;
  fileSize?: number;
  fileHash: string;
  rowsProcessed: number;
  teamsCreated: number;
  teamsUpdated: number;
  employeesAdded: number;
  employeesIgnored: number;
  duplicatesSkipped: number;
  ambiguousNames: number;
  teamLeadSkipped: number;
  metadataConflicts: number;
  summaryFileUrl?: string;
  createdAt: string;
}

/**
 * Upload an Excel file to import teams. Uses XHR (not fetch) so we can report
 * upload progress; fetch does not expose request upload progress.
 */
export async function importTeamsExcel(
  file: File,
  onProgress?: (pct: number) => void
): Promise<TeamImportResult> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${normalizeApiBase()}/teams/import`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        if (xhr.status >= 200 && xhr.status < 300) resolve(body as TeamImportResult);
        else reject(body);
      } catch (e) {
        reject(e);
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}

export async function exportTeamsExcel(
  params: { teamId?: string; department?: string; includeInactive?: boolean } = {}
): Promise<Blob> {
  const query: Record<string, string> = {};
  if (params.teamId) query.teamId = params.teamId;
  if (params.department) query.department = params.department;
  if (params.includeInactive) query.includeInactive = "true";
  const res = await apiClient.get<Blob>("/teams/export", {
    params: query,
    responseType: "blob",
  });
  return res.data;
}

export async function downloadImportTemplate(): Promise<Blob> {
  const res = await apiClient.get<Blob>("/teams/import-template", {
    responseType: "blob",
  });
  return res.data;
}

export async function listTeamImportLogs(
  query: { page?: number; limit?: number } = {}
): Promise<{
  results: TeamImportLogEntry[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}> {
  const params: Record<string, string> = {};
  if (query.page) params.page = String(query.page);
  if (query.limit) params.limit = String(query.limit);
  const { data } = await apiClient.get<{
    results: TeamImportLogEntry[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  }>("/teams/import-logs", { params });
  return data;
}

