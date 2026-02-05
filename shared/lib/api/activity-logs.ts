"use client";

import { apiClient } from "@/shared/lib/api/client";
import type { ActivityLogsListResponse } from "@/shared/lib/types";

export interface ListActivityLogsParams {
  actor?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

/**
 * List activity logs (GET /v1/activity-logs).
 * Backend enforces that only Administrators (by roleIds) can access this endpoint.
 */
export async function listActivityLogs(
  params?: ListActivityLogsParams
): Promise<ActivityLogsListResponse> {
  const { data } = await apiClient.get<ActivityLogsListResponse>("/activity-logs", {
    params,
  });
  return data;
}

