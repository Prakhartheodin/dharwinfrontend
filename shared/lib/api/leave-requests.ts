"use client";

import { apiClient } from "@/shared/lib/api/client";

const LEAVE_REQUESTS_API = "/leave-requests";

export interface LeaveRequestStudent {
  _id: string;
  user?: { name?: string; email?: string };
  fullName?: string;
}

export interface LeaveRequest {
  _id: string;
  student: LeaveRequestStudent;
  studentEmail: string;
  dates: string[];
  leaveType: "casual" | "sick" | "unpaid";
  notes?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  adminComment?: string | null;
  requestedBy: { _id: string; name?: string; email?: string };
  reviewedBy?: { _id: string; name?: string; email?: string } | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestsListParams {
  student?: string;
  status?: "pending" | "approved" | "rejected" | "cancelled";
  leaveType?: "casual" | "sick" | "unpaid";
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface LeaveRequestsListResponse {
  success: boolean;
  data: {
    results: LeaveRequest[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
}

export async function createLeaveRequest(
  studentId: string,
  body: { dates: string[]; leaveType: "casual" | "sick" | "unpaid"; notes?: string }
): Promise<{ success: boolean; data: LeaveRequest }> {
  const { data } = await apiClient.post<{ success: boolean; data: LeaveRequest }>(
    `${LEAVE_REQUESTS_API}/student/${studentId}`,
    body
  );
  return data;
}

export async function getAllLeaveRequests(params?: LeaveRequestsListParams): Promise<LeaveRequestsListResponse["data"]> {
  const { data } = await apiClient.get<LeaveRequestsListResponse>(LEAVE_REQUESTS_API, { params });
  return data.data;
}

export async function getLeaveRequestById(requestId: string): Promise<LeaveRequest> {
  const { data } = await apiClient.get<{ success: boolean; data: LeaveRequest }>(
    `${LEAVE_REQUESTS_API}/${requestId}`
  );
  return data.data;
}

export async function approveLeaveRequest(
  requestId: string,
  adminComment?: string
): Promise<{ success: boolean; message: string; data: unknown }> {
  const { data } = await apiClient.patch<{ success: boolean; message: string; data: unknown }>(
    `${LEAVE_REQUESTS_API}/${requestId}/approve`,
    { adminComment }
  );
  return data;
}

export async function rejectLeaveRequest(
  requestId: string,
  adminComment?: string
): Promise<{ success: boolean; message: string; data: LeaveRequest }> {
  const { data } = await apiClient.patch<{ success: boolean; message: string; data: LeaveRequest }>(
    `${LEAVE_REQUESTS_API}/${requestId}/reject`,
    { adminComment }
  );
  return data;
}

export async function cancelLeaveRequest(requestId: string): Promise<{ success: boolean; data: LeaveRequest }> {
  const { data } = await apiClient.post<{ success: boolean; data: LeaveRequest }>(
    `${LEAVE_REQUESTS_API}/${requestId}/cancel`
  );
  return data;
}

export async function getLeaveRequestsByStudentId(
  studentId: string,
  params?: { status?: string; sortBy?: string; limit?: number; page?: number }
): Promise<LeaveRequestsListResponse["data"]> {
  const { data } = await apiClient.get<LeaveRequestsListResponse>(
    `${LEAVE_REQUESTS_API}/student/${studentId}`,
    { params }
  );
  return data.data;
}
