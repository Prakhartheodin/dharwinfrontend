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
  previousReferredByUserId?: string;
  newReferredByUserId?: string;
  reason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
}

export interface ReferralLeadRow {
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
}

export interface ReferralLeadsListResponse {
  results: ReferralLeadRow[];
  nextCursor: string | null;
  hasMore: boolean;
  staleDataWarning?: boolean;
}

export interface ReferralLeadsTopReferrer {
  userId: string;
  name: string;
  count: number;
  period: "all_time" | "filtered";
}

export interface ReferralLeadsStatsResponse {
  totalReferrals: number;
  converted: number;
  conversionRate: number;
  pending: number;
  hired: number;
  topReferrer: ReferralLeadsTopReferrer | null;
  leaderboard: { userId: string; name: string; count: number }[];
}

export interface ReferralLeadsQueryParams {
  limit?: number;
  cursor?: string;
  search?: string;
  referredByUserId?: string;
  referralContext?: "SHARE_CANDIDATE_ONBOARD" | "JOB_APPLY" | "";
  referralPipelineStatus?: string;
  from?: string;
  to?: string;
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
  body: { newReferredByUserId: string; reason: string }
): Promise<{ success: boolean; lead: ReferralLeadRow }> {
  const { data } = await apiClient.post(`/employees/referral-leads/${candidateId}/override`, body);
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
