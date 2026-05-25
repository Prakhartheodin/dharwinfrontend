"use client";

import { useState } from "react";
import * as api from "../api/salesAgentAttribution";

export interface StaleConflict {
  code: "STALE_PRECONDITION" | "CONCURRENT_ASSIGNMENT_RACE";
  originalForm: unknown;
  retryToken: number;
}

function extractErrorCode(e: unknown): string | undefined {
  if (e && typeof e === "object" && "response" in e) {
    const data = (e as { response?: { data?: { code?: string } } }).response?.data;
    return data?.code;
  }
  return undefined;
}

function extractErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "response" in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export function useSalesAgentAttribution() {
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleConflict, setStaleConflict] = useState<StaleConflict | null>(null);

  const clearStaleConflict = () => setStaleConflict(null);

  async function run<T>(fn: () => Promise<T>, originalForm: unknown): Promise<T> {
    setIsMutating(true);
    setError(null);
    try {
      return await fn();
    } catch (e: unknown) {
      const code = extractErrorCode(e);
      let msg = extractErrorMessage(e, "Request failed");
      if (code === "CANDIDATE_LEVEL_FROZEN") {
        msg = "Job-specific attributions exist; revoke them first to assign at candidate level.";
      }
      if (code === "STALE_PRECONDITION" || code === "CONCURRENT_ASSIGNMENT_RACE") {
        msg = "Reassigned by another admin. Showing latest assignment.";
        setStaleConflict({ code, originalForm, retryToken: Date.now() });
      }
      setError(msg);
      throw e;
    } finally {
      setIsMutating(false);
    }
  }

  return {
    assign: (id: string, body: Parameters<typeof api.assignSalesAgent>[1]) =>
      run(() => api.assignSalesAgent(id, body), body),
    change: (id: string, body: Parameters<typeof api.changeSalesAgent>[1]) =>
      run(() => api.changeSalesAgent(id, body), body),
    revoke: (id: string, body: Parameters<typeof api.revokeSalesAgent>[1]) =>
      run(() => api.revokeSalesAgent(id, body), body),
    pinJob: (id: string, body: Parameters<typeof api.pinAttributionJob>[1]) =>
      run(() => api.pinAttributionJob(id, body), body),
    backfill: (body: api.BackfillReferralBody) =>
      run(() => api.backfillReferralLead(body), body),
    isMutating,
    error,
    staleConflict,
    clearStaleConflict,
  };
}
