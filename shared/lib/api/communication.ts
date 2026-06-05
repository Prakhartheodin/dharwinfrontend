"use client";

import { apiClient } from "@/shared/lib/api/client";
import type { CallRecord } from "@/shared/lib/api/bolna";
import type { ChatCall } from "@/shared/lib/api/chat";

const BASE = "/communication";

export type UnifiedCallSource = "all" | "telephony" | "in_app";

export interface UnifiedCallResult {
  source: "telephony" | "in_app";
  id: string;
  createdAt: string;
  telephony?: CallRecord;
  chatCall?: ChatCall;
}

export interface UnifiedCallsListResponse {
  results: UnifiedCallResult[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListUnifiedCallsParams {
  page?: number;
  limit?: number;
  source?: UnifiedCallSource;
  search?: string;
  status?: string;
  purpose?: string;
  language?: string;
  sortBy?: "date" | "createdAt";
  order?: "asc" | "desc";
}

/**
 * Fetch merged telephony + in-app call history with server-side pagination.
 */
export async function listUnifiedCalls(
  params: ListUnifiedCallsParams = {}
): Promise<UnifiedCallsListResponse> {
  const { data } = await apiClient.get<UnifiedCallsListResponse>(`${BASE}/calls`, {
    params,
  });
  return data;
}
