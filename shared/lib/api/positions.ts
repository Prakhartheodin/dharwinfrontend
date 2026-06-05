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

/** Positions with active employee counts (single request). */
export async function getPositionRoster(): Promise<PositionRosterItem[]> {
  const { data } = await apiClient.get<PositionRosterItem[]>("/positions/roster");
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

