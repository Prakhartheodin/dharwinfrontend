"use client";

/** Weighted interview rubrics. API: `/rubric-templates`. Backend: rubricTemplate.route.js */
import { apiClient } from "@/shared/lib/api/client";
import type { InterviewRoundType } from "@/shared/lib/api/meetings";

/** Weights are percentages and a template's must sum to exactly this. */
export const RUBRIC_WEIGHT_TOTAL = 100;

export interface RubricCriterion {
  /** Stable slug. Stored ratings reference it — rename the label, never the key. */
  key: string;
  label: string;
  weight: number;
  scaleMin: number;
  scaleMax: number;
}

export interface RubricTemplate {
  id: string;
  name: string;
  description: string;
  criteria: RubricCriterion[];
  appliesTo: { jobId: string | null; roundType: InterviewRoundType | null };
  isDefault: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** How many jobs reference this rubric. Present on the list response only. */
  jobCount?: number;
}

/** What a round is actually scored against — a snapshot, not a live template. */
export interface ResolvedRubric {
  templateId: string | null;
  templateName: string;
  criteria: RubricCriterion[];
}

export interface RubricTemplatePayload {
  name: string;
  description?: string;
  criteria: RubricCriterion[];
  /** Catalog filter only. jobId is unused and must not be sent. */
  appliesTo?: { roundType?: InterviewRoundType | null };
  isDefault?: boolean;
}

function payloadWithoutJobId(payload: RubricTemplatePayload | Partial<RubricTemplatePayload>) {
  if (!payload.appliesTo) return payload;
  return {
    ...payload,
    appliesTo: { roundType: payload.appliesTo.roundType ?? null },
  };
}

/**
 * Mirrors backend criteriaWeightError in src/constants/interviewRubric.js.
 *
 * Duplicated deliberately: the editor needs to disable Save before a round trip. The
 * backend check is the authority — this one only avoids a pointless 400. If the rule
 * changes, change both.
 */
export function criteriaWeightError(criteria: RubricCriterion[]): string | null {
  if (!Array.isArray(criteria) || criteria.length === 0) {
    return "Add at least one criterion.";
  }
  const keys = new Set<string>();
  let total = 0;
  for (const criterion of criteria) {
    const key = String(criterion?.key || "").trim();
    if (!key) return "Each criterion needs a label.";
    if (keys.has(key)) return `Two criteria share the same key (“${key}”). Change one of the labels.`;
    keys.add(key);

    const weight = Number(criterion?.weight);
    if (!Number.isInteger(weight) || weight < 0 || weight > RUBRIC_WEIGHT_TOTAL) {
      return `Weight for “${key}” must be a whole number from 0 to ${RUBRIC_WEIGHT_TOTAL}.`;
    }
    total += weight;

    const scaleMin = Number(criterion?.scaleMin ?? 1);
    const scaleMax = Number(criterion?.scaleMax ?? 5);
    if (!Number.isInteger(scaleMin) || !Number.isInteger(scaleMax) || scaleMax <= scaleMin) {
      return `Score range for “${key}” must use whole numbers, with the maximum above the minimum.`;
    }
  }
  if (total !== RUBRIC_WEIGHT_TOTAL) {
    return `Weights must total ${RUBRIC_WEIGHT_TOTAL}%. Yours add up to ${total}%.`;
  }
  return null;
}

export async function listRubricTemplates(
  includeArchived = false,
  options?: { limit?: number; page?: number }
): Promise<{ results: RubricTemplate[]; totalResults: number; totalPages?: number }> {
  const params: Record<string, string | number | boolean> = {};
  if (includeArchived) params.includeArchived = true;
  if (options?.limit) params.limit = options.limit;
  if (options?.page) params.page = options.page;
  const res = await apiClient.get<{ results: RubricTemplate[]; totalResults: number; totalPages?: number }>(
    "/rubric-templates",
    { params }
  );
  return res.data;
}

/** Every live page, so a job form never silently drops templates past page 1. */
export async function listAllRubricTemplates(
  includeArchived = false
): Promise<{ results: RubricTemplate[]; totalResults: number }> {
  const pageSize = 100;
  const collected: RubricTemplate[] = [];
  let page = 1;
  let totalResults = 0;
  const maxPages = 50;
  do {
    const res = await listRubricTemplates(includeArchived, { limit: pageSize, page });
    const rows = res.results || [];
    collected.push(...rows);
    totalResults = Number(res.totalResults) || collected.length;
    if (!rows.length || collected.length >= totalResults) break;
    page += 1;
  } while (page <= maxPages);
  return { results: collected, totalResults };
}

export async function getRubricTemplate(id: string): Promise<RubricTemplate> {
  const res = await apiClient.get<RubricTemplate>(`/rubric-templates/${id}`);
  return res.data;
}

export async function createRubricTemplate(payload: RubricTemplatePayload): Promise<RubricTemplate> {
  const res = await apiClient.post<RubricTemplate>("/rubric-templates", payloadWithoutJobId(payload));
  return res.data;
}

export async function updateRubricTemplate(
  id: string,
  payload: Partial<RubricTemplatePayload>
): Promise<RubricTemplate> {
  const res = await apiClient.patch<RubricTemplate>(`/rubric-templates/${id}`, payloadWithoutJobId(payload));
  return res.data;
}

export async function archiveRubricTemplate(id: string): Promise<RubricTemplate> {
  const res = await apiClient.post<RubricTemplate>(`/rubric-templates/${id}/archive`, {});
  return res.data;
}

export async function restoreRubricTemplate(id: string): Promise<RubricTemplate> {
  const res = await apiClient.post<RubricTemplate>(`/rubric-templates/${id}/restore`, {});
  return res.data;
}

/** Preview which rubric a round will use, before it is scheduled. */
export async function resolveRubric(params: {
  jobId?: string | null;
  roundType?: InterviewRoundType | null;
  planKey?: string | null;
  templateId?: string | null;
}): Promise<ResolvedRubric> {
  const query: Record<string, string> = {};
  if (params.jobId) query.jobId = params.jobId;
  if (params.roundType) query.roundType = params.roundType;
  if (params.planKey) query.planKey = params.planKey;
  if (params.templateId) query.templateId = params.templateId;
  const res = await apiClient.get<ResolvedRubric>("/rubric-templates/resolve", { params: query });
  return res.data;
}

export interface RubricTemplateUsage {
  templateId: string;
  jobCount: number;
  jobs: Array<{ id: string; title: string }>;
}

/** Which jobs reference this rubric. Drives the archive-blocked message and the editor note. */
export async function getRubricTemplateUsage(id: string): Promise<RubricTemplateUsage> {
  const res = await apiClient.get<RubricTemplateUsage>(`/rubric-templates/${id}/usage`);
  return res.data;
}
