"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface EnrollmentsByModuleItem {
  moduleId: string;
  moduleName: string;
  enrolledCount: number;
}

export interface TimeBucket {
  period: string;
  count?: number;
  averageScore?: number;
}

export interface RecentCompletion {
  studentName: string;
  courseName: string;
  completedAt: string;
}

export interface StatusBreakdown {
  enrolled: number;
  inProgress: number;
  completed: number;
}

export interface CompletionByModuleItem {
  moduleId: string;
  moduleName: string;
  enrolled: number;
  completed: number;
  completionRate: number;
}

export interface QuizScoreByModuleItem {
  moduleId: string;
  moduleName: string;
  averageScore: number | null;
}

export interface EnrollmentsByCategoryItem {
  categoryId: string;
  categoryName: string;
  count: number;
}

export interface NotStartedItem {
  studentName: string;
  courseName: string;
  enrolledAt: string;
}

export interface MentorWorkloadItem {
  mentorId: string;
  mentorName: string;
  moduleCount: number;
  studentCount: number;
}

export interface PreviousPeriod {
  enrollments: number;
  completions: number;
  periodLabel: string;
}

export interface TrainingAnalyticsResponse {
  totalStudents: number;
  totalMentors: number;
  totalCourses: number;
  totalEnrollments: number;
  completionCount: number;
  enrollmentsByModule: EnrollmentsByModuleItem[];
  recentCompletions: RecentCompletion[];
  averageQuizScore: number | null;
  enrollmentsOverTime: TimeBucket[];
  completionsOverTime: TimeBucket[];
  quizScoreOverTime: (TimeBucket & { averageScore: number })[];
  statusBreakdown: StatusBreakdown;
  completionByModule: CompletionByModuleItem[];
  quizScoreByModule: QuizScoreByModuleItem[];
  enrollmentsByCategory: EnrollmentsByCategoryItem[];
  notStartedCount: number;
  notStartedList: NotStartedItem[];
  mentorWorkload: MentorWorkloadItem[];
  averageDaysToComplete: number | null;
  previousPeriod: PreviousPeriod | null;
  range: string | null;
}

export type AnalyticsRange = "7d" | "30d" | "3m" | "12m";

export interface GetTrainingAnalyticsParams {
  range?: AnalyticsRange;
}

/**
 * GET /v1/training/analytics – training analytics summary and charts data
 */
export async function getTrainingAnalytics(
  params?: GetTrainingAnalyticsParams
): Promise<TrainingAnalyticsResponse> {
  const { data } = await apiClient.get<TrainingAnalyticsResponse>("/training/analytics", {
    params: params?.range ? { range: params.range } : undefined,
  });
  return data;
}
