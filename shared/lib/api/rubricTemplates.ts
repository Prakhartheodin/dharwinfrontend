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
  appliesTo?: { jobId?: string | null; roundType?: InterviewRoundType | null };
  isDefault?: boolean;
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
    return "A rubric needs at least one criterion.";
  }
  const keys = new Set<string>();
  let total = 0;
  for (const criterion of criteria) {
    const key = String(criterion?.key || "").trim();
    if (!key) return "Every criterion needs a key.";
    if (keys.has(key)) return `Duplicate criterion key: ${key}`;
    keys.add(key);

    const weight = Number(criterion?.weight);
    if (!Number.isInteger(weight) || weight < 0 || weight > RUBRIC_WEIGHT_TOTAL) {
      return `Weight for "${key}" must be a whole number between 0 and ${RUBRIC_WEIGHT_TOTAL}.`;
    }
    total += weight;

    const scaleMin = Number(criterion?.scaleMin ?? 1);
    const scaleMax = Number(criterion?.scaleMax ?? 5);
    if (!Number.isInteger(scaleMin) || !Number.isInteger(scaleMax) || scaleMax <= scaleMin) {
      return `Scale for "${key}" must be two whole numbers with the maximum above the minimum.`;
    }
  }
  if (total !== RUBRIC_WEIGHT_TOTAL) {
    return `Weights must add up to ${RUBRIC_WEIGHT_TOTAL}%. This rubric adds up to ${total}%.`;
  }
  return null;
}

export async function listRubricTemplates(
  includeArchived = false
): Promise<{ results: RubricTemplate[]; totalResults: number }> {
  const res = await apiClient.get<{ results: RubricTemplate[]; totalResults: number }>(
    "/rubric-templates",
    { params: includeArchived ? { includeArchived: true } : {} }
  );
  return res.data;
}

export async function getRubricTemplate(id: string): Promise<RubricTemplate> {
  const res = await apiClient.get<RubricTemplate>(`/rubric-templates/${id}`);
  return res.data;
}

export async function createRubricTemplate(payload: RubricTemplatePayload): Promise<RubricTemplate> {
  const res = await apiClient.post<RubricTemplate>("/rubric-templates", payload);
  return res.data;
}

export async function updateRubricTemplate(
  id: string,
  payload: Partial<RubricTemplatePayload>
): Promise<RubricTemplate> {
  const res = await apiClient.patch<RubricTemplate>(`/rubric-templates/${id}`, payload);
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
}): Promise<ResolvedRubric> {
  const query: Record<string, string> = {};
  if (params.jobId) query.jobId = params.jobId;
  if (params.roundType) query.roundType = params.roundType;
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
