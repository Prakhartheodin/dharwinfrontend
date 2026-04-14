"use client";

import { apiClient } from "@/shared/lib/api/client";

export type ProjectStatus = "Inprogress" | "On hold" | "completed";
export type ProjectPriority = "High" | "Medium" | "Low";

export interface ProjectUser {
  _id: string;
  name?: string;
  email?: string;
}

export interface ProjectTeam {
  _id: string;
  /** Backend toJSON may return id instead of _id */
  id?: string;
  name?: string;
}

export interface Project {
  _id: string;
  name: string;
  projectManager?: string;
  clientStakeholder?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  assignedTo?: ProjectUser[];
  assignedTeams?: ProjectTeam[];
  tags?: string[];
  attachments?: string[];
  completedTasks: number;
  totalTasks: number;
  createdBy?: ProjectUser;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectsListParams {
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  /** When true, list only projects created by the current user (including for admins). */
  mine?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface ProjectsListResponse {
  results: Project[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function listProjects(params?: ProjectsListParams): Promise<ProjectsListResponse> {
  const { data } = await apiClient.get<ProjectsListResponse>("/projects", { params });
  return data;
}

export async function getProjectById(id: string): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/projects/${id}`);
  return data;
}

export interface CreateProjectPayload {
  name: string;
  projectManager?: string;
  clientStakeholder?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  assignedTo?: string[];
  assignedTeams?: string[];
  tags?: string[];
  attachments?: string[];
  completedTasks?: number;
  totalTasks?: number;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const { data } = await apiClient.post<Project>("/projects", payload);
  return data;
}

export interface UpdateProjectPayload {
  name?: string;
  projectManager?: string;
  clientStakeholder?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  assignedTo?: string[];
  assignedTeams?: string[];
  tags?: string[];
  attachments?: string[];
  completedTasks?: number;
  totalTasks?: number;
}

export async function updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
  const { data } = await apiClient.patch<Project>(`/projects/${id}`, payload);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

/** Computed progress percentage for list cards */
export function getProjectProgress(project: Project): number {
  const total = project.totalTasks ?? 0;
  if (total <= 0) return 0;
  const completed = project.completedTasks ?? 0;
  return Math.round((completed / total) * 100);
}
