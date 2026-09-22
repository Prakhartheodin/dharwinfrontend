"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface Position {
  id: string;
  _id?: string;
  name: string;
  department?: string;
  skillsSuggested?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PositionAssignedEmployee {
  id: string;
  name: string;
}

export interface PositionAssignedModule {
  id: string;
  name: string;
}

export interface PositionRosterItem extends Position {
  employeeCount: number;
  /** Employees with a training Student profile who can be enrolled. */
  studentCount?: number;
  /** When true, new hires whose Student.position resolves here are auto-enrolled. */
  autoEnrollNewHires?: boolean;
  assignedEmployees?: PositionAssignedEmployee[];
  assignedModules?: PositionAssignedModule[];
  /** Title-only grouping when no Position catalog row exists (read-only roster). */
  unlinked?: boolean;
}

export interface SetPositionModulesResponse {
  positionId: string;
  assignedModules: PositionAssignedModule[];
}

export interface PositionEmployeesResponse {
  results: PositionAssignedEmployee[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface PositionsListResponse {
  results: Position[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ListPositionsParams {
  name?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

/** Get all positions (no pagination) – for dropdowns */
export async function getAllPositions(): Promise<Position[]> {
  const { data } = await apiClient.get<Position[]>("/positions/all");
  return data;
}

export interface PositionRosterListResponse {
  results: PositionRosterItem[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ListPositionRosterParams {
  search?: string;
  /** Comma-separated category (folder) ids. */
  folderIds?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

/**
 * Positions with active employee counts.
 * Pass page/limit/search/folderIds/sortBy for Curriculum Setup table paging.
 * Omit limit to receive every matching row (FolderPositionsPopover / bulk assign).
 */
export async function getPositionRoster(
  params?: ListPositionRosterParams
): Promise<PositionRosterListResponse> {
  const { data } = await apiClient.get<PositionRosterListResponse>("/positions/roster", {
    params,
  });
  return data;
}

export interface ListPositionEmployeesParams {
  search?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

/** Active HR employees whose position or designation matches this position. */
export async function listPositionEmployees(
  positionId: string,
  params?: ListPositionEmployeesParams
): Promise<PositionEmployeesResponse> {
  const { data } = await apiClient.get<PositionEmployeesResponse>(`/positions/${positionId}/employees`, { params });
  return data;
}

export async function listPositions(params?: ListPositionsParams): Promise<PositionsListResponse> {
  const { data } = await apiClient.get<PositionsListResponse>("/positions", { params });
  return data;
}

export async function getPosition(positionId: string): Promise<Position> {
  const { data } = await apiClient.get<Position>(`/positions/${positionId}`);
  return data;
}

export async function createPosition(payload: { name: string; department?: string; skillsSuggested?: string[] }): Promise<Position> {
  const { data } = await apiClient.post<Position>("/positions", payload);
  return data;
}

/** Patch position fields (name, department, auto-enrol flag, …). */
export async function updatePosition(
  positionId: string,
  payload: { name?: string; department?: string; skillsSuggested?: string[]; autoEnrollNewHires?: boolean }
): Promise<Position> {
  const { data } = await apiClient.patch<Position>(`/positions/${positionId}`, payload);
  return data;
}

/** Replace which training modules include this position (PUT /positions/:id/modules). */
export async function setPositionModules(
  positionId: string,
  moduleIds: string[]
): Promise<SetPositionModulesResponse> {
  const { data } = await apiClient.put<SetPositionModulesResponse>(`/positions/${positionId}/modules`, {
    moduleIds,
  });
  return data;
}

export interface BulkEnrollPayload {
  moduleIds: string[];
  action: "assign" | "remove";
  studentIds?: string[];
}

export interface BulkEnrollResult {
  enrolled: number;
  skipped: number;
  modules: string[];
}

/** Enrol or unenrol a position's students across modules in one server-side call. */
export async function bulkEnroll(
  positionId: string,
  payload: BulkEnrollPayload
): Promise<BulkEnrollResult> {
  const { data } = await apiClient.post<BulkEnrollResult>(
    `/positions/${positionId}/enrollments`,
    payload
  );
  return data;
}

