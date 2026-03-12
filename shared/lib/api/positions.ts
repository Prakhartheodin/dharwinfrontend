"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface Position {
  id: string;
  _id?: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
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

export async function listPositions(params?: ListPositionsParams): Promise<PositionsListResponse> {
  const { data } = await apiClient.get<PositionsListResponse>("/positions", { params });
  return data;
}

export async function getPosition(positionId: string): Promise<Position> {
  const { data } = await apiClient.get<Position>(`/positions/${positionId}`);
  return data;
}

export async function createPosition(payload: { name: string }): Promise<Position> {
  const { data } = await apiClient.post<Position>("/positions", payload);
  return data;
}

export async function updatePosition(positionId: string, payload: { name: string }): Promise<Position> {
  const { data } = await apiClient.patch<Position>(`/positions/${positionId}`, payload);
  return data;
}

export async function deletePosition(positionId: string): Promise<void> {
  await apiClient.delete(`/positions/${positionId}`);
}
