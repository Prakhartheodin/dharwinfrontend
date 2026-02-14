"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface EvaluationRow {
  studentId: string | null;
  studentName: string;
  courseId: string | null;
  courseName: string;
  completionRate: number;
  completedAt: string | null;
  quizScore: number | null;
  quizTries: number;
  status: string;
}

export interface EvaluationSummary {
  totalCourses: number;
  totalStudentsEnrolled: number;
}

export interface EvaluationResponse {
  summary: EvaluationSummary;
  evaluations: EvaluationRow[];
}

/**
 * GET /v1/training/evaluation – summary + all student-course evaluations
 */
export async function getEvaluation(): Promise<EvaluationResponse> {
  const { data } = await apiClient.get<EvaluationResponse>("/training/evaluation");
  return data;
}
