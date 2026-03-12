"use client";

import { apiClient } from "@/shared/lib/api/client";

export type AtsAnalyticsRange = "7d" | "30d" | "3m" | "12m";

export interface StatusCount {
  status: string;
  count: number;
}

export interface JobTypeCount {
  jobType: string;
  count: number;
}

export interface TimeBucket {
  period: string;
  count: number;
}

export interface TopJobItem {
  jobId: string;
  title: string;
  org: string;
  count: number;
}

export interface RecruiterActivityStats {
  jobPostingsCreated: number;
  candidatesScreened: number;
  interviewsScheduled: number;
  notesAdded: number;
  feedbackAdded: number;
  total: number;
}

export interface RecruiterSummaryActivity {
  activityType: string;
  count: number;
}

export interface RecruiterSummaryItem {
  recruiter: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  activities: RecruiterSummaryActivity[];
  totalActivities: number;
}

export interface AtsPreviousPeriod {
  applications: number;
  hired: number;
  periodLabel: string;
}

export interface AtsTotals {
  totalCandidates: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  hiredCount: number;
  totalRecruiters: number;
  conversionRate: number;
  avgProfileCompletion: number;
}

export interface AtsAnalyticsResponse {
  totals: AtsTotals;
  previousPeriod: AtsPreviousPeriod | null;
  applicationFunnel: StatusCount[];
  applicationsOverTime: TimeBucket[];
  jobsOverTime: TimeBucket[];
  jobStatusBreakdown: StatusCount[];
  jobTypeDistribution: JobTypeCount[];
  applicationStatusBreakdown: StatusCount[];
  topJobsByApplications: TopJobItem[];
  recruiterActivityStats: RecruiterActivityStats;
  recruiterActivitySummary: RecruiterSummaryItem[];
  range: string | null;
}

export interface DrillDownRecord {
  id: string;
  candidateName?: string;
  candidateEmail?: string;
  jobTitle?: string;
  organisation?: string;
  title?: string;
  status?: string;
  jobType?: string;
  appliedAt?: string;
  createdAt?: string;
}

export interface DrillDownResponse {
  results: DrillDownRecord[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
}

export interface GetAtsAnalyticsParams {
  range?: AtsAnalyticsRange;
}

export interface GetDrillDownParams {
  type: "applicationStatus" | "jobStatus" | "jobType" | "applicationFunnel";
  value: string;
  page?: number;
  limit?: number;
}

/**
 * GET /v1/ats/analytics
 */
export async function getAtsAnalytics(
  params?: GetAtsAnalyticsParams
): Promise<AtsAnalyticsResponse> {
  const { data } = await apiClient.get<AtsAnalyticsResponse>("/ats/analytics", {
    params: params?.range ? { range: params.range } : undefined,
  });
  return data;
}

/**
 * GET /v1/ats/analytics/applications-over-time-by-candidates
 * Returns applications count per candidate for last 5 weeks (for sparkline charts)
 */
export async function getApplicationsOverTimeByCandidates(
  candidateIds: string[]
): Promise<Record<string, number[]>> {
  const ids = candidateIds.filter(Boolean);
  if (ids.length === 0) return {};
  const { data } = await apiClient.get<Record<string, number[]>>(
    "/ats/analytics/applications-over-time-by-candidates",
    { params: { candidateIds: ids.join(",") } }
  );
  return data ?? {};
}

/**
 * GET /v1/ats/analytics/drill
 */
export async function getAtsDrillDown(
  params: GetDrillDownParams
): Promise<DrillDownResponse> {
  const { data } = await apiClient.get<DrillDownResponse>("/ats/analytics/drill", {
    params,
  });
  return data;
}
