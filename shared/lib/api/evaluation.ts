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
  essayPending?: number;
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

export interface EvaluationStudentRow {
  studentId: string;
  studentName: string;
  positionName: string | null;
  coursesAssigned: number;
  avgCompletion: number;
  overallStatus: EvaluationDisplayStatus;
  completedCount: number;
  avgQuizScore: number | null;
  atRiskCount: number;
}

export interface EvaluationCourseRow {
  courseId: string;
  courseName: string;
  categoryNames: string[];
  studentsAssigned: number;
  avgCompletion: number;
  completedCount: number;
  atRiskCount: number;
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
  rows: EvaluationStudentRow[] | EvaluationCourseRow[];
  meta?: EvaluationMeta;
}

export type EvaluationViewMode = "student" | "course";

export interface GetEvaluationParams {
  view?: EvaluationViewMode;
  courseId?: string;
  studentId?: string;
  status?: EvaluationDisplayStatus | "";
  q?: string;
  atRisk?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * GET /v1/training/evaluation – summary + paginated student/course rows (filterable).
 */
export async function getEvaluation(params?: GetEvaluationParams): Promise<EvaluationResponse> {
  const query: Record<string, string | number> = {};
  if (params?.view) query.view = params.view;
  if (params?.courseId) query.courseId = params.courseId;
  if (params?.studentId) query.studentId = params.studentId;
  if (params?.status) query.status = params.status;
  if (params?.q?.trim()) query.q = params.q.trim();
  if (params?.atRisk) query.atRisk = "true";
  if (params?.page) query.page = params.page;
  if (params?.limit) query.limit = params.limit;
  if (params?.sortBy) query.sortBy = params.sortBy;
  if (params?.sortOrder) query.sortOrder = params.sortOrder;

  const { data } = await apiClient.get<EvaluationResponse>("/training/evaluation", { params: query });
  return data;
}

export type EvaluationExportParams = Omit<GetEvaluationParams, "page" | "limit" | "view" | "sortBy" | "sortOrder">;

/** GET /training/evaluation/export — same filters as list (omit page/limit). */
export async function downloadEvaluationExport(params: EvaluationExportParams = {}): Promise<void> {
  const query: Record<string, string> = {};
  if (params.courseId) query.courseId = params.courseId;
  if (params.studentId) query.studentId = params.studentId;
  if (params.status) query.status = params.status;
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.atRisk) query.atRisk = "true";

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

export interface TrainerEssayAttemptPayload {
  attemptId: string;
  essay: {
    playlistItemId: string;
    title: string;
    passPercentage?: number;
    questions: Array<{
      questionText: string;
      expectedAnswer?: string;
      studentAnswer: string;
      score?: number;
      maxMarks?: number;
      optional?: boolean;
      feedback?: string;
    }>;
  };
  attempt: {
    attemptId?: string;
    attemptNumber: number;
    score?: {
      percentage: number;
      obtainedMarks?: number;
      maxMarks?: number;
    };
    obtainedMarks?: number;
    maxMarks?: number;
    submittedAt: string;
    status: string;
    passed?: boolean | null;
    passPercentage?: number;
    feedback?: string;
  };
}

export interface TrainerEssayItem {
  playlistItemId: string;
  title: string;
  passPercentage?: number;
  questionCount: number;
  pending: boolean;
  attempts: TrainerEssayAttemptPayload[];
}

export interface TrainerEssayAttemptsResponse {
  moduleId: string;
  moduleName?: string;
  studentId: string;
  items: TrainerEssayItem[];
}

export interface GradeEssayAttemptBody {
  answers: Array<{ questionIndex: number; score: number; feedback?: string }>;
  feedback?: string;
}

/**
 * GET trainer Q&A attempts for a student on a course.
 */
export async function getStudentEssayAttempts(
  studentId: string,
  moduleId: string
): Promise<TrainerEssayAttemptsResponse> {
  const { data } = await apiClient.get<TrainerEssayAttemptsResponse>(
    `/training/evaluation/students/${studentId}/courses/${moduleId}/essay-attempts`
  );
  return data;
}

/**
 * PATCH trainer marks on a Q&A attempt.
 */
export async function gradeEssayAttempt(
  attemptId: string,
  body: GradeEssayAttemptBody
): Promise<TrainerEssayAttemptPayload> {
  const { data } = await apiClient.patch<TrainerEssayAttemptPayload>(
    `/training/evaluation/essay-attempts/${attemptId}`,
    body
  );
  return data;
}
