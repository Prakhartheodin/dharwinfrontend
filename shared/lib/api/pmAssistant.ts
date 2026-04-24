"use client";

import { apiClient } from "@/shared/lib/api/client";
import type { AssignmentFeedbackItem, BreakdownContext } from "@/shared/types/pmAssistant";

export type { BreakdownContext, AssignmentFeedbackItem } from "@/shared/types/pmAssistant";

export interface TaskBreakdownPreviewTask {
  /** Server-assigned preview task id (UUID); omit on apply. */
  id?: string;
  title: string;
  description?: string;
  status?: string;
  tags?: string[];
  /** Skill/role hints for staffing (from preview or manual edit). */
  requiredSkills?: string[];
  order?: number;
}

export interface TaskBreakdownPreviewUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface TaskBreakdownPreviewResponse {
  projectId: string;
  promptHash: string;
  modelId: string;
  usage?: TaskBreakdownPreviewUsage;
  tasks: TaskBreakdownPreviewTask[];
  previewId: string;
  confidenceScore: number;
}

export async function previewTaskBreakdown(
  projectId: string,
  body: {
    breakdownContext?: BreakdownContext;
    extraBrief?: string;
    feedback?: string;
    priorTasks?: (Pick<TaskBreakdownPreviewTask, "title" | "description" | "status"> & { id?: string })[];
  }
): Promise<TaskBreakdownPreviewResponse> {
  const { data } = await apiClient.post(`/pm-assistant/projects/${projectId}/task-breakdown/preview`, body);
  return data;
}

export async function refineTaskBreakdown(
  projectId: string,
  body: {
    previousPreviewId: string;
    feedback: string;
    lockedTaskIds?: string[];
    breakdownContextOverride?: Partial<BreakdownContext>;
  }
): Promise<TaskBreakdownPreviewResponse> {
  const { data } = await apiClient.post(
    `/pm-assistant/projects/${projectId}/task-breakdown/refine`,
    body
  );
  return data;
}

export async function applyTaskBreakdown(
  projectId: string,
  tasks: TaskBreakdownPreviewTask[],
  options?: { idempotencyKey?: string; previewId?: string }
): Promise<{ createdCount: number; tasks: unknown[] }> {
  const headers: Record<string, string> = {};
  if (options?.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }
  const { data } = await apiClient.post(
    `/pm-assistant/projects/${projectId}/task-breakdown/apply`,
    { tasks, previewId: options?.previewId },
    { headers }
  );
  return data;
}

export interface AssignmentGenerationMeta {
  rosterFetched?: number;
  excludedMissingOwner?: number;
  excludedAtCapacity?: number;
  eligibleForAi?: number;
  /** admin_capacity_filtered | project_assignees | admin_fallback (legacy) */
  rosterScope?: string;
  /** all = ATS-wide active pool; admin = project owner adminId only */
  rosterPoolMode?: string;
  projectAssigneeCount?: number;
  rosterQueryLimit?: number;
  adminFallbackLimit?: number;
  /** Pool uses same resignDate rule as ATS “current” employment */
  rosterAtsCurrentEmployment?: boolean;
  /** candidate_role = pool owners must have Employee (ATS) user role; unscoped_fallback = role missing in DB */
  rosterPoolOwnerScope?: string;
  /** Users with Employee / legacy Candidate user role (active/pending); compare to User Roles screen */
  candidateRoleOwnerCount?: number;
  /** Project tasks included in this run (after merge with AI output) */
  assignmentTotalTaskCount?: number;
  /** Distinct taskIds returned by the model before backfill */
  assignmentAiDistinctTaskCount?: number;
  /** Tasks added as gap rows because the model omitted them */
  assignmentBackfilledTaskCount?: number;
  /** Tasks per OpenAI call for assignment (legacy batched runs) */
  assignmentTaskBatchSize?: number;
  /** Number of AI matcher calls (1 = all tasks in one payload) */
  assignmentBatchCount?: number;
  /** True when every project task was included in a single matcher request */
  assignmentAllTasksSingleRequest?: boolean;
  skillPrefilter?: { overlapTaskCount?: number; fullRosterTaskCount?: number };
}

export interface AssignmentRunEnvelope {
  run: {
    _id?: string;
    id?: string;
    status?: string;
    supervisorValue?: string;
    generationMeta?: AssignmentGenerationMeta;
  };
  rows: unknown[];
}

export async function createAssignmentRun(projectId: string): Promise<AssignmentRunEnvelope> {
  const { data } = await apiClient.post<AssignmentRunEnvelope>(
    `/pm-assistant/projects/${projectId}/assignment-runs`
  );
  return data;
}

export async function getAssignmentRun(runId: string): Promise<{ run: unknown; rows: unknown[] }> {
  const { data } = await apiClient.get(`/pm-assistant/assignment-runs/${runId}`);
  return data;
}

/** Matcher / PM assistant job draft for staffing gap rows */
export interface RecommendedJobDraft {
  title: string;
  descriptionOutline: string;
  mustHaveSkills: string[];
  seniority: string;
}

export interface AssignmentRowJobDraftResponse {
  recommendedJobDraft: RecommendedJobDraft;
  modelId?: string | null;
  usage?: { promptTokens?: number; completionTokens?: number } | null;
  cached?: boolean;
}

export async function generateAssignmentRowJobDraft(
  runId: string,
  rowId: string,
  body?: { force?: boolean }
): Promise<AssignmentRowJobDraftResponse> {
  const { data } = await apiClient.post<AssignmentRowJobDraftResponse>(
    `/pm-assistant/assignment-runs/${runId}/rows/${rowId}/job-draft`,
    body ?? {}
  );
  return data;
}

export async function patchAssignmentRun(
  runId: string,
  rows: { id?: string; _id?: string; recommendedCandidateId?: string | null; gap?: boolean; notes?: string }[]
): Promise<{ run: unknown; rows: unknown[] }> {
  const { data } = await apiClient.patch<{ run: unknown; rows: unknown[] }>(
    `/pm-assistant/assignment-runs/${runId}`,
    { rows }
  );
  return data;
}

export async function approveAssignmentRun(runId: string): Promise<unknown> {
  const { data } = await apiClient.post(`/pm-assistant/assignment-runs/${runId}/approve`);
  return data;
}

export async function applyAssignmentRun(runId: string): Promise<unknown> {
  const { data } = await apiClient.post(`/pm-assistant/assignment-runs/${runId}/apply`);
  return data;
}

export async function submitAssignmentRunFeedback(
  projectId: string,
  runId: string,
  body: { items: AssignmentFeedbackItem[]; submittedAt?: string }
): Promise<{ accepted: number }> {
  const { data } = await apiClient.post(
    `/pm-assistant/projects/${projectId}/assignment-runs/${runId}/feedback`,
    body
  );
  return data;
}

export interface AssignmentApplyTeamSync {
  teamGroupId?: string | null;
  membersAdded?: number;
  usedExistingTeam?: boolean;
  syncError?: string | null;
}

export interface BootstrapSmartTeamResult {
  projectId: string;
  /** True when the matcher produced at least one staffed row (still requires user review + apply). */
  staffed?: boolean;
  /** Explicit mirror of staffed for new clients; prefer this when branching UX. */
  hasStaffableMatches?: boolean;
  /** False until the user approves and applies on the assignment review screen. */
  assignmentApplied?: boolean;
  assignmentRunId: string;
  teamGroup: { _id?: string; id?: string; name?: string } | null;
  tasksCreated: number;
  teamMembersAdded: number;
  /** True when candidates were added to the project’s first linked TeamGroup instead of creating a new one */
  usedExistingTeam?: boolean;
  message?: string;
}

/** Requires projects.manage + tasks.manage + teams.manage + candidates.read */
export async function bootstrapSmartTeam(
  projectId: string,
  body?: { extraBrief?: string; breakdownContext?: BreakdownContext }
): Promise<
  BootstrapSmartTeamResult & { confidenceScore?: number; lowConfidence?: boolean }
> {
  const { data } = await apiClient.post(
    `/pm-assistant/projects/${projectId}/bootstrap-smart-team`,
    body ?? {}
  );
  return data;
}

export type EnhanceBriefFeedbackRating = "up" | "down";

export interface EnhanceProjectBriefBody {
  html: string;
  projectName?: string;
  projectManager?: string;
  clientStakeholder?: string;
  /** Last AI HTML from the review modal — sent so the model can revise instead of starting cold. */
  previousEnhancedHtml?: string;
  /** User steering for the next draft (plain text; server treats as untrusted). */
  refinementInstructions?: string;
  /** Optional thumbs + short comment for the previous suggestion. */
  feedback?: {
    rating?: EnhanceBriefFeedbackRating;
    comment?: string;
  };
}

export interface EnhanceProjectBriefResponse {
  enhancedHtml: string;
  modelId?: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

/** Requires projects.manage and PM assistant enabled on server. */
export async function enhanceProjectBrief(
  body: EnhanceProjectBriefBody
): Promise<EnhanceProjectBriefResponse> {
  const { data } = await apiClient.post<EnhanceProjectBriefResponse>("/pm-assistant/enhance-project-brief", body);
  return data;
}
