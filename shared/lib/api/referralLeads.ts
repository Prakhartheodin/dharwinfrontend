"use client";

import { apiClient, resolveDownloadUrlForBrowser } from "@/shared/lib/api/client";

export interface ReferralLeadReferredBy {
  id: string;
  name?: string;
  email?: string;
}

export interface ReferralLeadJob {
  id?: string;
  title?: string;
}

export interface ReferralLastOverride {
  reason?: string;
  /** ISO 8601 */
  overriddenAt?: string | null;
  /** User who applied the override */
  overriddenByUser?: ReferralLeadReferredBy | null;
  previousReferredBy?: ReferralLeadReferredBy | null;
  newReferredBy?: ReferralLeadReferredBy | null;
}

export interface ReferralLeadSalesAgent {
  id: string;
  name?: string;
  email?: string;
}

export type LifecycleStageKey =
  | "applied"
  | "interview"
  | "offered"
  | "preboarding"
  | "joined_pending_start"
  | "employee"
  | "resigned"
  | "pending";

export type ReferralEmployeeStatus = "active" | "resigned";

export interface ReferralLeadRow {
  /** Candidate document id (`candidates` collection / GET candidate by id), not a Settings org User id. */
  id: string;
  fullName: string;
  email: string;
  profilePicture?: { url?: string; key?: string };
  referredBy: ReferralLeadReferredBy | null;
  referralContext: "SHARE_CANDIDATE_ONBOARD" | "JOB_APPLY" | null;
  referredAt: string | null;
  attributionLockedAt: string | null;
  referralAttributionAnonymised?: boolean;
  referralPipelineStatus: string | null;
  referralBatchId: string | null;
  job: ReferralLeadJob | null;
  referralLastOverride?: ReferralLastOverride | null;
  createdAt?: string;
  salesAgent?: ReferralLeadSalesAgent | null;
  salesAgentAssignedAt?: string | null;
  salesAgentJobScope?: "candidate" | "job" | null;
  salesAgentCurrentAttributionId?: string | null;
  lifecycleStage?: LifecycleStageKey | null;
  employeeConverted?: boolean;
  /** Only set once converted (joining date passed): active | resigned. */
  employeeStatus?: ReferralEmployeeStatus | null;
  joiningDate?: string | null;
  resignDate?: string | null;
}

export interface ReferralLeadsListResponse {
  results: ReferralLeadRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  staleDataWarning?: boolean;
}

export interface ReferralLeadsTopReferrer {
  userId: string;
  name: string;
  count: number;
  period: "all_time" | "filtered";
}

export interface ReferralLeadsTopSalesAgent {
  userId: string;
  name: string;
  count: number;
  rank?: number;
  leaderboardSize?: number;
}

export interface ReferralHireLite {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
}

export interface ReferralLeadsStatsResponse {
  totalReferrals: number;
  converted: number;
  conversionRate: number;
  pending: number;
  hired: number;
  /** Raw referralPipelineStatus → count (funnel source; matches the cards). */
  pipelineCounts?: Record<string, number>;
  /** Hired into a Full-time job. */
  paidHires?: number;
  /** Hired into an Internship. */
  unpaidHires?: number;
  /** Hired into another job type or no linked job. */
  otherHires?: number;
  paidHiresList?: ReferralHireLite[];
  unpaidHiresList?: ReferralHireLite[];
  otherHiresList?: ReferralHireLite[];
  topReferrer: ReferralLeadsTopReferrer | null;
  leaderboard: { userId: string; name: string; count: number }[];
  unassignedCount?: number;
  totalReferredHires?: number;
  hiresPerSalesAgent?: { userId: string; name: string; count: number; rank?: number }[];
  topSalesAgent?: ReferralLeadsTopSalesAgent | null;
}

export interface ReferralLeadsQueryParams {
  limit?: number;
  page?: number;
  search?: string;
  referredByUserId?: string;
  referralContext?: "SHARE_CANDIDATE_ONBOARD" | "JOB_APPLY" | "";
  referralPipelineStatus?: string;
  from?: string;
  to?: string;
  salesAgentUserId?: string;
  unassigned?: boolean;
  hiredOnly?: boolean;
  convertedEmployees?: boolean;
  appliedOnly?: boolean;
  employeeStatus?: ReferralEmployeeStatus;
  /** When true, only referral leads whose portal user still has the Candidate role (interview scheduling). */
  candidateRoleOwnersOnly?: boolean;
}

export function coalesceField<T>(lead: unknown, key: string, fallback: T): T {
  const v = (lead as Record<string, unknown> | null | undefined)?.[key];
  return v === undefined || v === null ? fallback : (v as T);
}

export async function listReferralLeads(
  params?: ReferralLeadsQueryParams
): Promise<ReferralLeadsListResponse> {
  const { data } = await apiClient.get<ReferralLeadsListResponse>("/employees/referral-leads", { params });
  return data;
}

export async function getReferralLeadsStats(
  params?: ReferralLeadsQueryParams
): Promise<ReferralLeadsStatsResponse> {
  const { data } = await apiClient.get<ReferralLeadsStatsResponse>("/employees/referral-leads/stats", {
    params,
  });
  return data;
}

export type PostReferralLinkBody = {
  source: "onboard" | "job";
  /** Required for source `onboard`. For `job`, omit to create an open link (any applicant; sharer+job are encoded). */
  candidateEmail?: string;
  jobId?: string | null;
  batchId?: string | null;
};

export async function postReferralLinkToken(
  body: PostReferralLinkBody
): Promise<{ ref: string; orgId: string; expiresInSeconds: number }> {
  const { data } = await apiClient.post("/employees/referral-link", body);
  return data;
}

/** HMAC `ref` for sharing a public job link — unique to the current user and job (30d TTL). */
export async function createJobShareReferralLink(
  jobId: string
): Promise<{ ref: string; orgId: string; expiresInSeconds: number }> {
  return postReferralLinkToken({ source: "job", jobId });
}

export async function postReferralAttributionOverride(
  candidateId: string,
  body: { newReferredByUserId: string; reason?: string }
): Promise<{ success: boolean; lead: ReferralLeadRow }> {
  const { data } = await apiClient.post(`/employees/referral-leads/${candidateId}/override`, body);
  return data;
}

export interface ReferralAttributionOverrideHistoryRow {
  id: string;
  createdAt: string | null;
  actor: { id: string; name?: string; email?: string };
  previousReferredBy: { id: string; name?: string; email?: string } | null;
  newReferredBy: { id: string; name?: string; email?: string } | null;
  reason: string;
}

export async function getReferralAttributionOverrideHistory(
  candidateId: string
): Promise<{ results: ReferralAttributionOverrideHistoryRow[] }> {
  const { data } = await apiClient.get<{ results: ReferralAttributionOverrideHistoryRow[] }>(
    `/employees/referral-leads/${encodeURIComponent(candidateId)}/attribution-override-history`
  );
  return data;
}

/** Download CSV using cookie auth (opens in same origin). */
export async function downloadReferralLeadsExport(params: ReferralLeadsQueryParams = {}): Promise<void> {
  const { data } = await apiClient.get<Blob>("/employees/referral-leads/export", {
    params,
    responseType: "blob",
  });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "referral-leads.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function getProfilePicUrl(lead: ReferralLeadRow): string | null {
  const u = lead.profilePicture?.url;
  if (u) return resolveDownloadUrlForBrowser(u);
  return null;
}
