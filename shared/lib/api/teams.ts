"use client";

import { apiClient, normalizeApiBase } from "@/shared/lib/api/client";

export interface Team {
  _id: string;
  id?: string;
  name: string;
  department?: string;
  description?: string;
  relatedPositions: string[];
  createdAt?: string;
}

export interface TeamMemberTeamRef {
  _id: string;
  name?: string;
}

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
  id?: string;
  teamId?: string | TeamMemberTeamRef;
  employeeId?: string | TeamMemberEmployeePopulated | null;
  displayName: string;
  displayEmail: string;
  avatarUrl: string | null;
  isOrphan: boolean;
  seniority?: string;
  assignmentMode?: TeamMemberAssignmentMode;
  isActive: boolean;
  orphanReason?: string | null;
  isStarred?: boolean;
  createdAt?: string;
  updatedAt?: string;
  name?: string;
  email?: string;
  memberSinceLabel?: string;
  projectsCount?: number;
  position?: string;
  coverImageUrl?: string;
  avatarImageUrl?: string;
  candidateProfilePictureUrl?: string;
  onlineStatus?: "online" | "offline";
  lastSeenLabel?: string;
}

export interface TeamMembersListParams {
  teamId?: string;
  includeInactive?: boolean;
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

export const TEAM_MEMBERS_API_MAX_LIMIT = 200 as const;

export async function listTeamMembers(
  params?: TeamMembersListParams
): Promise<TeamMembersListResponse> {
  const safe =
    params != null &&
    params.limit != null &&
    params.limit > TEAM_MEMBERS_API_MAX_LIMIT
      ? { ...params, limit: TEAM_MEMBERS_API_MAX_LIMIT }
      : params;
  const { data } = await apiClient.get<TeamMembersListResponse>("/teams", { params: safe });
  return data;
}

export async function getTeamMemberById(id: string): Promise<TeamMember> {
  const { data } = await apiClient.get<TeamMember>(`/teams/${id}`);
  return data;
}

export interface CreateTeamMemberPayload {
  teamId: string;
  employeeId?: string;
  legacyName?: string;
  legacyEmail?: string;
  seniority?: string;
  assignmentMode?: TeamMemberAssignmentMode;
}

export async function createTeamMember(payload: CreateTeamMemberPayload): Promise<TeamMember> {
  const { data } = await apiClient.post<TeamMember>("/teams", payload);
  return data;
}

export interface UpdateTeamMemberPayload {
  seniority?: string;
  isStarred?: boolean;
  onlineStatus?: "online" | "offline";
  lastSeenLabel?: string;
  memberSinceLabel?: string;
  projectsCount?: number;
  avatarImageUrl?: string;
  coverImageUrl?: string;
}

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

export async function linkOrphanTeamMember(
  teamMemberId: string,
  employeeId: string
): Promise<TeamMember> {
  const { data } = await apiClient.post<TeamMember>(`/teams/${teamMemberId}/link`, { employeeId });
  return data;
}


export async function moveTeamMember(teamMemberId: string, teamId: string): Promise<TeamMember> {
  const { data } = await apiClient.post<TeamMember>(`/teams/${teamMemberId}/move`, { teamId });
  return data;
}
export async function softRemoveTeamMember(
  teamMemberId: string,
  reason?: string
): Promise<TeamMember> {
  const { data } = await apiClient.post<TeamMember>(`/teams/${teamMemberId}/remove`, {
    removedReason: reason ?? "manual",
  });
  return data;
}

export async function retryOrphanMatch(): Promise<{ matched: number; stillOrphan: number }> {
  const { data } = await apiClient.post<{ matched: number; stillOrphan: number }>(
    "/teams/orphans/retry-match"
  );
  return data;
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

export interface TeamImportDetails {
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
}

export interface TeamImportResult {
  summary: TeamImportSummary;
  /** Lifted from API: backend nests the same payload under `summary.details`; always normalized here. */
  details: TeamImportDetails;
  summaryFileUrl?: string;
  importLogId: string;
  summaryUploadFailed?: boolean;
}

function emptyTeamImportDetails(): TeamImportDetails {
  return {
    skipped: [],
    duplicates: [],
    metadataConflicts: [],
    teamLeadSkipped: [],
    warnings: [],
  };
}

function emptyTeamImportSummary(): TeamImportSummary {
  return {
    teamsCreated: 0,
    teamsUpdated: 0,
    employeesAdded: 0,
    employeesIgnored: 0,
    duplicatesSkipped: 0,
    ambiguousNames: 0,
    teamLeadSkipped: 0,
    metadataConflicts: 0,
    rowsProcessed: 0,
  };
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Backend returns `details` inside `summary`; UI expects top-level `details`. */
export function normalizeTeamImportResponse(body: unknown): TeamImportResult {
  if (body == null || typeof body !== "object") {
    return {
      summary: emptyTeamImportSummary(),
      details: emptyTeamImportDetails(),
      importLogId: "",
    };
  }
  const b = body as Record<string, unknown>;
  const rawSummary = (b.summary ?? {}) as TeamImportSummary & { details?: TeamImportDetails };
  const nested = rawSummary.details;
  const top = b.details as TeamImportDetails | undefined;
  const raw = top ?? nested ?? emptyTeamImportDetails();
  const details: TeamImportDetails = {
    skipped: asArray(raw.skipped),
    duplicates: asArray(raw.duplicates),
    metadataConflicts: asArray(raw.metadataConflicts),
    teamLeadSkipped: asArray(raw.teamLeadSkipped),
    warnings: asArray(raw.warnings),
  };
  const { details: _nested, ...summaryRest } = rawSummary;
  void _nested;
  const summary: TeamImportSummary = {
    ...emptyTeamImportSummary(),
    ...summaryRest,
  };
  return {
    summary,
    details,
    summaryFileUrl: b.summaryFileUrl as string | undefined,
    importLogId: String(b.importLogId ?? ""),
    summaryUploadFailed: b.summaryUploadFailed as boolean | undefined,
  };
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
        if (xhr.status >= 200 && xhr.status < 300)
          resolve(normalizeTeamImportResponse(body));
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
