import { apiClient } from "./client";
import type { Paginated } from "./org-structure";

export interface Department {
  id: string;
  name: string;
  code?: string;
  /** Org-chart node colour (hex #RRGGBB). Empty = chart auto-assigns a distinct colour. */
  color?: string;
  isActive: boolean;
}

export const listDepartments = async (): Promise<Department[]> =>
  (await apiClient.get("/departments", { params: { all: "true" } })).data;

/** Paginated + searchable list. Omit isActive to include inactive departments. */
export const queryDepartments = async (params: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  isActive?: boolean;
}): Promise<Paginated<Department>> =>
  (await apiClient.get("/departments", { params })).data;

/** Every department incl. inactive — for dropdowns that must resolve a stale link. */
export const listAllDepartments = async (): Promise<Department[]> =>
  (await apiClient.get("/departments", { params: { limit: 1000, sortBy: "name:asc" } })).data.results;

export const reactivateDepartment = async (id: string): Promise<Department> =>
  (await apiClient.patch(`/departments/${id}/reactivate`)).data;
export const deleteDepartment = async (id: string) =>
  (await apiClient.delete(`/departments/${id}/permanent`)).data;
export const createDepartment = async (body: { name: string; code?: string; color?: string }): Promise<Department> =>
  (await apiClient.post("/departments", body)).data;
export const updateDepartment = async (
  id: string,
  body: Partial<{ name: string; code: string; color: string }>
): Promise<Department> => (await apiClient.patch(`/departments/${id}`, body)).data;
export const deactivateDepartment = async (id: string): Promise<Department> =>
  (await apiClient.delete(`/departments/${id}`)).data;
