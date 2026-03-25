"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface SopTemplateStep {
  checkerKey: string;
  label: string;
  description?: string;
  sortOrder: number;
  enabled: boolean;
  linkTemplate?: string;
}

export interface CandidateSopTemplate {
  id?: string;
  _id?: string;
  name: string;
  version: number;
  isActive: boolean;
  steps: SopTemplateStep[];
}

export interface SopStatusStepRow {
  checkerKey: string;
  label: string;
  description: string;
  done: boolean;
  sortOrder: number;
  link: string;
}

export interface CandidateSopStatus {
  templateVersion: number;
  templateId: string;
  steps: SopStatusStepRow[];
  nextStep: SopStatusStepRow | null;
  completedCount: number;
  totalCount: number;
  skipped: boolean;
}

export interface SopOpenOverviewStep {
  checkerKey: string;
  label: string;
  description: string;
  link: string;
}

export interface SopOpenOverviewRow {
  candidateId: string;
  fullName: string;
  employeeId: string | null;
  email: string | null;
  templateVersion: number;
  nextStep: { label: string; link: string; checkerKey: string } | null;
  openSteps: SopOpenOverviewStep[];
  completedCount: number;
  totalCount: number;
}

export interface SopOpenOverview {
  activeSopVersion: number | null;
  activeTemplateId: string | null;
  scannedCount: number;
  totalCurrentCandidates: number;
  withOpenStepsCount: number;
  results: SopOpenOverviewRow[];
}

export async function getCandidateSopStatus(candidateId: string): Promise<CandidateSopStatus> {
  const { data } = await apiClient.get<CandidateSopStatus>(`/candidates/${candidateId}/sop-status`);
  return data;
}

/** candidates.manage — current candidates with at least one incomplete active-SOP step */
export async function getSopOpenOverview(params?: { limit?: number }): Promise<SopOpenOverview> {
  const { data } = await apiClient.get<SopOpenOverview>("/candidates/sop-open-overview", {
    params: params?.limit != null ? { limit: params.limit } : undefined,
  });
  return data;
}

export type SopRemindersDispatchResult = {
  queued: number;
  scanned?: number;
  withOpen?: number;
  skipped?: boolean;
  reason?: string;
};

/** Queue in-app SOP notifications for candidates with open steps (candidates.manage). */
export async function postSopRemindersDispatch(body?: { limit?: number }): Promise<SopRemindersDispatchResult> {
  const { data } = await apiClient.post<SopRemindersDispatchResult>("/candidates/sop-reminders/dispatch", body ?? {});
  return data;
}

export async function listCandidateSopTemplates(): Promise<CandidateSopTemplate[]> {
  const { data } = await apiClient.get<CandidateSopTemplate[]>("/candidate-sop-templates");
  return data;
}

export async function getActiveCandidateSopTemplate(): Promise<CandidateSopTemplate> {
  const { data } = await apiClient.get<CandidateSopTemplate>("/candidate-sop-templates/active");
  return data;
}

export async function createCandidateSopTemplate(body: {
  name?: string;
  steps?: SopTemplateStep[];
  activate?: boolean;
}): Promise<CandidateSopTemplate> {
  const { data } = await apiClient.post<CandidateSopTemplate>("/candidate-sop-templates", body);
  return data;
}

export async function updateCandidateSopTemplate(
  templateId: string,
  body: { name?: string; steps?: SopTemplateStep[] }
): Promise<CandidateSopTemplate> {
  const { data } = await apiClient.patch<CandidateSopTemplate>(`/candidate-sop-templates/${templateId}`, body);
  return data;
}

export async function setActiveCandidateSopTemplate(templateId: string): Promise<CandidateSopTemplate> {
  const { data } = await apiClient.post<CandidateSopTemplate>(
    `/candidate-sop-templates/${templateId}/set-active`,
    {}
  );
  return data;
}

export async function deleteCandidateSopTemplate(templateId: string): Promise<void> {
  await apiClient.delete(`/candidate-sop-templates/${templateId}`);
}
