import { apiClient } from "./client";

export interface Department {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
}

export const listDepartments = async (): Promise<Department[]> =>
  (await apiClient.get("/departments", { params: { all: "true" } })).data;
export const createDepartment = async (body: { name: string; code?: string }): Promise<Department> =>
  (await apiClient.post("/departments", body)).data;
export const updateDepartment = async (
  id: string,
  body: Partial<{ name: string; code: string }>
): Promise<Department> => (await apiClient.patch(`/departments/${id}`, body)).data;
export const deactivateDepartment = async (id: string): Promise<Department> =>
  (await apiClient.delete(`/departments/${id}`)).data;
