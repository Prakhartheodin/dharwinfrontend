"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface OffboardingStep {
  checkerKey: string;
  label: string;
  description?: string;
  sortOrder: number;
  enabled: boolean;
  linkTemplate?: string;
}

export interface OffboardingConfig {
  id?: string;
  steps: OffboardingStep[];
}

export interface OffboardingStatusStep extends OffboardingStep {
  done: boolean;
}

export interface OffboardingStatus {
  steps: OffboardingStatusStep[];
  completedCount: number;
  totalCount: number;
  skipped: boolean;
  nextStep: OffboardingStatusStep | null;
}

export type OffboardingActionKey = "email_deactivated" | "tasks_reassigned" | "org_team_disabled";

export interface OffboardingOverviewRow {
  employeeId: string;
  fullName: string;
  empCode: string | null;
  email: string | null;
  resignDate: string | null;
  completedCount: number;
  totalCount: number;
  nextStep: OffboardingStatusStep | null;
  steps: OffboardingStatusStep[];
}

export interface OffboardingOverview {
  scannedCount: number;
  withOpenCount: number;
  results: OffboardingOverviewRow[];
}

export async function getOffboardingOverview(limit?: number): Promise<OffboardingOverview> {
  const { data } = await apiClient.get<OffboardingOverview>("/offboarding-sop/overview", {
    params: limit != null ? { limit } : undefined,
  });
  return data;
}

export async function getOffboardingConfig(): Promise<OffboardingConfig> {
  const { data } = await apiClient.get<OffboardingConfig>("/offboarding-sop/config");
  return data;
}

export async function saveOffboardingConfig(steps: OffboardingStep[]): Promise<OffboardingConfig> {
  const { data } = await apiClient.put<OffboardingConfig>("/offboarding-sop/config", { steps });
  return data;
}

export interface OffboardingOpenTask {
  id: string;
  title: string;
  taskCode: string | null;
  status: string;
  priority: string;
  assignees: { id: string; name: string | null; email: string | null }[];
}

export async function getOffboardingOpenTasks(employeeId: string): Promise<OffboardingOpenTask[]> {
  const { data } = await apiClient.get<{ tasks: OffboardingOpenTask[] }>(
    `/offboarding-sop/${employeeId}/open-tasks`
  );
  return data.tasks;
}

export interface AssignableUser {
  id: string;
  name: string | null;
  email: string | null;
}

/** Reassignment targets, guarded by employees.manage (no separate users.read needed). */
export async function getAssignableUsers(): Promise<AssignableUser[]> {
  const { data } = await apiClient.get<{ users: AssignableUser[] }>("/offboarding-sop/assignable-users");
  return data.users;
}

export async function getOffboardingStatus(employeeId: string): Promise<OffboardingStatus> {
  const { data } = await apiClient.get<OffboardingStatus>(`/offboarding-sop/${employeeId}/status`);
  return data;
}

export async function runOffboardingStep(
  employeeId: string,
  stepKey: OffboardingActionKey,
  body?: { toUserIds?: string[] }
): Promise<OffboardingStatus> {
  const { data } = await apiClient.post<OffboardingStatus>(
    `/offboarding-sop/${employeeId}/run/${stepKey}`,
    body ?? {}
  );
  return data;
}
