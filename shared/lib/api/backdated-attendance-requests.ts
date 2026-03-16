"use client";

import { apiClient } from "@/shared/lib/api/client";

const BACKDATED_API = "/backdated-attendance-requests";

export interface AttendanceEntry {
  date: string;
  punchIn: string;
  punchOut?: string | null;
  timezone?: string;
}

export interface BackdatedAttendanceRequestStudent {
  _id: string;
  user?: { name?: string; email?: string };
  fullName?: string;
}

export interface BackdatedAttendanceRequest {
  _id: string;
  student: BackdatedAttendanceRequestStudent;
  studentEmail?: string;
  attendanceEntries?: AttendanceEntry[];
  notes?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  adminComment?: string | null;
  requestedBy: { _id: string; name?: string; email?: string };
  reviewedBy?: { _id: string; name?: string; email?: string } | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackdatedListParams {
  student?: string;
  status?: "pending" | "approved" | "rejected" | "cancelled";
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface BackdatedListResponse {
  success: boolean;
  data: {
    results: BackdatedAttendanceRequest[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
}

export async function createBackdatedAttendanceRequest(
  studentId: string,
  body: {
    attendanceEntries: Array<{
      date: string;
      punchIn: string;
      punchOut?: string | null;
      timezone?: string;
    }>;
    notes?: string;
  }
): Promise<{ success: boolean; data: BackdatedAttendanceRequest }> {
  const { data } = await apiClient.post<{ success: boolean; data: BackdatedAttendanceRequest }>(
    `${BACKDATED_API}/student/${studentId}`,
    body
  );
  return data;
}

export async function getAllBackdatedAttendanceRequests(
  params?: BackdatedListParams
): Promise<BackdatedListResponse["data"]> {
  const { data } = await apiClient.get<BackdatedListResponse>(BACKDATED_API, { params });
  return data.data;
}

export async function getBackdatedAttendanceRequestById(
  requestId: string
): Promise<BackdatedAttendanceRequest> {
  const { data } = await apiClient.get<{ success: boolean; data: BackdatedAttendanceRequest }>(
    `${BACKDATED_API}/${requestId}`
  );
  return data.data;
}

export async function updateBackdatedAttendanceRequest(
  requestId: string,
  updates: {
    attendanceEntries?: Array<{ date: string; punchIn: string; punchOut?: string | null; timezone?: string }>;
    notes?: string;
  }
): Promise<{ success: boolean; data: BackdatedAttendanceRequest }> {
  const { data } = await apiClient.patch<{ success: boolean; data: BackdatedAttendanceRequest }>(
    `${BACKDATED_API}/${requestId}`,
    updates
  );
  return data;
}

export async function approveBackdatedAttendanceRequest(
  requestId: string,
  adminComment?: string
): Promise<{ success: boolean; message: string; data: unknown }> {
  const { data } = await apiClient.patch<{ success: boolean; message: string; data: unknown }>(
    `${BACKDATED_API}/${requestId}/approve`,
    { adminComment }
  );
  return data;
}

export async function rejectBackdatedAttendanceRequest(
  requestId: string,
  adminComment?: string
): Promise<{ success: boolean; message: string; data: BackdatedAttendanceRequest }> {
  const { data } = await apiClient.patch<{ success: boolean; message: string; data: BackdatedAttendanceRequest }>(
    `${BACKDATED_API}/${requestId}/reject`,
    { adminComment }
  );
  return data;
}

export async function cancelBackdatedAttendanceRequest(
  requestId: string
): Promise<{ success: boolean; data: BackdatedAttendanceRequest }> {
  const { data } = await apiClient.post<{ success: boolean; data: BackdatedAttendanceRequest }>(
    `${BACKDATED_API}/${requestId}/cancel`
  );
  return data;
}

export async function getBackdatedAttendanceRequestsByStudentId(
  studentId: string,
  params?: { status?: string; sortBy?: string; limit?: number; page?: number }
): Promise<BackdatedListResponse["data"]> {
  const { data } = await apiClient.get<BackdatedListResponse>(
    `${BACKDATED_API}/student/${studentId}`,
    { params }
  );
  return data.data;
}

/** Create backdated attendance request for current user (Agent; no Student). */
export async function createBackdatedAttendanceRequestMe(body: {
  attendanceEntries: Array<{
    date: string;
    punchIn: string;
    punchOut?: string | null;
    timezone?: string;
  }>;
  notes?: string;
}): Promise<{ success: boolean; data: BackdatedAttendanceRequest }> {
  const { data } = await apiClient.post<{ success: boolean; data: BackdatedAttendanceRequest }>(
    `${BACKDATED_API}/me`,
    body
  );
  return data;
}

/** Get backdated attendance requests for current user (Agent; no Student). */
export async function getBackdatedAttendanceRequestsMe(
  params?: { status?: string; sortBy?: string; limit?: number; page?: number }
): Promise<BackdatedListResponse["data"]> {
  const { data } = await apiClient.get<BackdatedListResponse>(`${BACKDATED_API}/me`, { params });
  return data.data;
}
