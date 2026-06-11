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
