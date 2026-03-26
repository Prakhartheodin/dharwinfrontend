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
  /** When true, include noisy attendance.* actions (default on API excludes them). */
  includeAttendance?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}

/**
 * List activity logs (GET /v1/activity-logs).
 * Backend requires activityLogs.read or activity.read (or platform super user).
 */
export async function listActivityLogs(
  params?: ListActivityLogsParams
): Promise<ActivityLogsListResponse> {
  const { data } = await apiClient.get<ActivityLogsListResponse>("/activity-logs", {
    params,
  });
  return data;
}

