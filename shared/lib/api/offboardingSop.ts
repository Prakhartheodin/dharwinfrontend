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

export async function getOffboardingConfig(): Promise<OffboardingConfig> {
  const { data } = await apiClient.get<OffboardingConfig>("/offboarding-sop/config");
  return data;
}

export async function saveOffboardingConfig(steps: OffboardingStep[]): Promise<OffboardingConfig> {
  const { data } = await apiClient.put<OffboardingConfig>("/offboarding-sop/config", { steps });
  return data;
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
