"use client";

import { apiClient } from "@/shared/lib/api/client";

export type TaskStatus = "new" | "todo" | "on_going" | "in_review" | "completed";

export interface TaskUser {
  _id: string;
  /** Backend toJSON may return id instead of _id */
  id?: string;
  name?: string;
  email?: string;
}

export interface TaskComment {
  _id: string;
  id?: string;
  content: string;
  commentedBy?: TaskUser;
  createdAt: string;
  updatedAt?: string;
}

export interface Task {
  _id: string;
  /** Backend toJSON may return id instead of _id */
  id?: string;
  title: string;
  description?: string;
  taskCode?: string;
  status: TaskStatus;
  dueDate?: string;
  tags?: string[];
  /** Staffing hints from PM / AI (may include specialist slugs such as feature-engineer). */
  requiredSkills?: string[];
  assignedTo?: TaskUser[];
  /** Populated project, raw ObjectId string, or null if unlinked / missing ref */
  projectId?: { _id?: string; id?: string; name?: string } | string | null;
  likesCount: number;
  commentsCount: number;
  comments?: TaskComment[];
  imageUrl?: string;
  order?: number;
  createdBy?: TaskUser;
  createdAt?: string;
  updatedAt?: string;
}

/** Get task id from API response (handles id vs _id) */
export function getTaskId(task: Task): string {
  return (task as Task & { id?: string }).id ?? task._id ?? "";
}

export type TaskProjectMeta = { projectId?: string; embeddedName?: string };

/** Normalize task.projectId from API (populated object, string id, or null). */
export function getTaskProjectMeta(task: Task): TaskProjectMeta {
  const p = task.projectId;
  if (p == null) return {};
  if (typeof p === "string") {
    const s = p.trim();
    return s ? { projectId: s } : {};
  }
  if (typeof p === "object") {
    const id = (p.id ?? p._id) != null ? String(p.id ?? p._id) : undefined;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    return {
      projectId: id,
      embeddedName: name || undefined,
    };
  }
  return {};
}

export interface TasksListParams {
  status?: TaskStatus;
  projectId?: string;
  search?: string;
  assignedToMe?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface TasksListResponse {
  results: Task[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: "NEW",
  todo: "TODO",
  on_going: "ON GOING",
  in_review: "IN REVIEW",
  completed: "COMPLETED",
};

export async function listTasks(params?: TasksListParams): Promise<TasksListResponse> {
  const { data } = await apiClient.get<TasksListResponse>("/tasks", {
    params: params ? { ...params, assignedToMe: params.assignedToMe === true ? "true" : undefined } : undefined,
  });
  return data;
}

/** List tasks assigned to the current user (candidate view) */
export async function listMyAssignedTasks(params?: Omit<TasksListParams, "assignedToMe">): Promise<TasksListResponse> {
  return listTasks({ ...params, assignedToMe: true });
}

export async function getTaskById(id: string): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/tasks/${id}`);
  return data;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  taskCode?: string;
  status?: TaskStatus;
  dueDate?: string;
  tags?: string[];
  assignedTo?: string[];
  projectId?: string;
  likesCount?: number;
  commentsCount?: number;
  imageUrl?: string;
  order?: number;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await apiClient.post<Task>("/tasks", payload);
  return data;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  taskCode?: string;
  status?: TaskStatus;
  dueDate?: string;
  tags?: string[];
  assignedTo?: string[];
  projectId?: string;
  likesCount?: number;
  commentsCount?: number;
  imageUrl?: string;
  order?: number;
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${id}`, payload);
  return data;
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  order?: number
): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${id}/status`, { status, order });
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`/tasks/${id}`);
}

/** Get comments for a task (createdBy and assignedTo can view) */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data } = await apiClient.get<TaskComment[]>(`/tasks/${taskId}/comments`);
  return data ?? [];
}

/** Add a comment to a task (createdBy and assignedTo can add) */
export async function addTaskComment(taskId: string, content: string): Promise<TaskComment> {
  const { data } = await apiClient.post<TaskComment>(`/tasks/${taskId}/comments`, { content });
  return data!;
}

/** Format due date for display; returns "X days left" or "Done" for past/completed */
export function formatDueDate(dueDate: string | undefined, status: TaskStatus): string {
  if (!dueDate) return "";
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "";
  if (status === "completed") return "Done";
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day left";
  return `${diffDays} days left`;
}

export function formatCreatedDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
