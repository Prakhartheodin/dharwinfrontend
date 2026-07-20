"use client";

import { apiClient } from "@/shared/lib/api/client";

export type EvaluationDisplayStatus = "Completed" | "In Progress" | "Not Started";

export interface EvaluationRow {
  studentId: string | null;
  studentName: string;
  courseId: string | null;
  courseName: string;
  completionRate: number;
  completedAt: string | null;
  enrolledAt: string | null;
  startedAt: string | null;
  lastAccessedAt: string | null;
  quizScore: number | null;
  quizScoreBest: number | null;
  quizTries: number;
  essayScore: number | null;
  essayTries: number;
  certificateIssued: boolean;
  positionId: string | null;
  positionName: string | null;
  categoryIds: string[];
  categoryNames: string[];
  status: string;
  displayStatus: EvaluationDisplayStatus;
  atRisk: boolean;
  atRiskReason: string | null;
}

export interface EvaluationSummary {
  totalCourses: number;
  totalStudentsEnrolled: number;
  atRiskCount: number;
  completedPairs: number;
  inProgressPairs: number;
  notStartedPairs: number;
}

export interface EvaluationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EvaluationResponse {
  summary: EvaluationSummary;
  evaluations: EvaluationRow[];
  meta?: EvaluationMeta;
}

export interface GetEvaluationParams {
  courseId?: string;
  status?: EvaluationDisplayStatus | "";
  q?: string;
  atRisk?: boolean;
  page?: number;
  limit?: number;
}

/**
 * GET /v1/training/evaluation – summary + student-course evaluations (filterable).
 */
export async function getEvaluation(params?: GetEvaluationParams): Promise<EvaluationResponse> {
  const query: Record<string, string | number> = {};
  if (params?.courseId) query.courseId = params.courseId;
  if (params?.status) query.status = params.status;
  if (params?.q?.trim()) query.q = params.q.trim();
  if (params?.atRisk) query.atRisk = "true";
  if (params?.page) query.page = params.page;
  if (params?.limit) query.limit = params.limit;

  const { data } = await apiClient.get<EvaluationResponse>("/training/evaluation", { params: query });
  return data;
}

export type EvaluationExportParams = Omit<GetEvaluationParams, "page" | "limit">;

/** GET /training/evaluation/export — same filters as list (omit page/limit). */
export async function downloadEvaluationExport(params: EvaluationExportParams = {}): Promise<void> {
  const { page: _page, limit: _limit, ...filters } = params;
  const query: Record<string, string> = {};
  if (filters.courseId) query.courseId = filters.courseId;
  if (filters.status) query.status = filters.status;
  if (filters.q?.trim()) query.q = filters.q.trim();
  if (filters.atRisk) query.atRisk = "true";

  const { data } = await apiClient.get<Blob>("/training/evaluation/export", {
    params: query,
    responseType: "blob",
  });
  const dateStamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `training-evaluation-export-${dateStamp}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
