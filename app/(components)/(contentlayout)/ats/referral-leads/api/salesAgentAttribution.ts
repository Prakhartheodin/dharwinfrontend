"use client";

import { apiClient } from "@/shared/lib/api/client";
import type { ReferralLeadRow } from "@/shared/lib/api/referralLeads";

export interface AttributionRow {
  id: string;
  jobId: string | null;
  jobTitle: string | null;
  jobSnapshot: { title: string; requisitionCode: string | null } | null;
  salesAgent: { id: string; name: string; email: string } | null;
  salesAgentSnapshot: { name: string; email: string; employeeCode: string | null };
  lifecycleStageAtAssignment: string;
  attributionEventId: string;
  assignedBy: { id: string; name: string; email: string } | null;
  assignedAt: string;
  notes: string | null;
  source: "manual_assign" | "manual_change" | "manual_revoke" | "auto_referral_sales_agent";
  isCurrent: boolean;
  isRevoked: boolean;
  revokeReason: string | null;
  previousAttributionId: string | null;
}

export interface SalesAgentHistoryResponse {
  results: AttributionRow[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SalesAgentMutationResponse {
  attribution?: unknown;
  previousAttribution?: unknown;
  revokedAttribution?: unknown;
  lead: ReferralLeadRow;
}

export function coalesceField<T>(row: unknown, key: string, fallback: T): T {
  const v = (row as Record<string, unknown> | null | undefined)?.[key];
  return v === undefined || v === null ? fallback : (v as T);
}

export async function assignSalesAgent(
  candidateId: string,
  body: { salesAgentUserId: string; jobId?: string | null; notes?: string; assignedAt?: string }
): Promise<SalesAgentMutationResponse> {
  const { data } = await apiClient.post<SalesAgentMutationResponse>(
    `/employees/referral-leads/${encodeURIComponent(candidateId)}/sales-agent`,
    body
  );
  return data;
}

export async function changeSalesAgent(
  candidateId: string,
  body: {
    salesAgentUserId: string;
    jobId?: string | null;
    expectedCurrentAttributionId: string;
    notes?: string;
    assignedAt?: string;
  }
): Promise<SalesAgentMutationResponse> {
  const { data } = await apiClient.patch<SalesAgentMutationResponse>(
    `/employees/referral-leads/${encodeURIComponent(candidateId)}/sales-agent`,
    body
  );
  return data;
}

export async function revokeSalesAgent(
  candidateId: string,
  body: { jobId?: string | null; expectedCurrentAttributionId: string; revokeReason: string }
): Promise<SalesAgentMutationResponse> {
  const { data } = await apiClient.delete<SalesAgentMutationResponse>(
    `/employees/referral-leads/${encodeURIComponent(candidateId)}/sales-agent`,
    { data: body }
  );
  return data;
}

export async function getSalesAgentHistory(
  candidateId: string,
  params?: { limit?: number; cursor?: string | null }
): Promise<SalesAgentHistoryResponse> {
  const { data } = await apiClient.get<SalesAgentHistoryResponse>(
    `/employees/referral-leads/${encodeURIComponent(candidateId)}/sales-agent-history`,
    { params }
  );
  return data;
}

export async function pinAttributionJob(
  candidateId: string,
  body: { jobId: string | null; reason?: string }
): Promise<SalesAgentMutationResponse> {
  const { data } = await apiClient.patch<SalesAgentMutationResponse>(
    `/employees/referral-leads/${encodeURIComponent(candidateId)}/attribution-job`,
    body
  );
  return data;
}

export interface BackfillReferralBody {
  employeeId: string;
  referredByUserId: string;
  salesAgentUserId: string;
  referralJobId?: string | null;
  referredAt: string;
  notes?: string;
}

export async function backfillReferralLead(
  body: BackfillReferralBody
): Promise<SalesAgentMutationResponse> {
  const { data } = await apiClient.post<SalesAgentMutationResponse>(
    `/employees/referral-leads/backfill`,
    body
  );
  return data;
}
