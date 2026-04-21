"use client";

import { apiClient } from "@/shared/lib/api/client";

/** Communication internal meetings (not ATS interviews). Backend: /internal-meetings */
export interface InternalMeetingHost {
  nameOrRole?: string;
  email: string;
}

export interface CreateInternalMeetingPayload {
  title: string;
  description?: string;
  scheduledAt: string;
  timezone?: string;
  durationMinutes: number;
  maxParticipants?: number;
  allowGuestJoin?: boolean;
  requireApproval?: boolean;
  meetingType?: "Video" | "In-Person" | "Phone";
  hosts: InternalMeetingHost[];
  emailInvites?: string[];
  notes?: string;
}

export interface InternalMeeting {
  _id: string;
  meetingId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  timezone?: string;
  durationMinutes: number;
  maxParticipants: number;
  allowGuestJoin: boolean;
  requireApproval: boolean;
  meetingType: string;
  hosts: InternalMeetingHost[];
  emailInvites: string[];
  notes?: string;
  status: string;
  createdBy?: { _id: string; name?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
  publicMeetingUrl?: string;
}

export interface InternalMeetingsListResponse {
  results: InternalMeeting[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function createInternalMeeting(
  payload: CreateInternalMeetingPayload
): Promise<InternalMeeting & { publicMeetingUrl: string }> {
  const { data } = await apiClient.post<InternalMeeting & { publicMeetingUrl: string }>(
    "/internal-meetings",
    payload
  );
  return data;
}

export async function listInternalMeetings(params?: {
  title?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}): Promise<InternalMeetingsListResponse> {
  const { data } = await apiClient.get<InternalMeetingsListResponse>("/internal-meetings", { params });
  return data;
}

export async function getInternalMeeting(id: string): Promise<InternalMeeting> {
  const { data } = await apiClient.get<InternalMeeting>(`/internal-meetings/${id}`);
  return data;
}

export type UpdateInternalMeetingPayload = Partial<CreateInternalMeetingPayload> & {
  status?: string;
};

export async function updateInternalMeeting(
  id: string,
  payload: UpdateInternalMeetingPayload
): Promise<InternalMeeting> {
  const { data } = await apiClient.patch<InternalMeeting>(`/internal-meetings/${id}`, payload);
  return data;
}

export async function deleteInternalMeeting(id: string): Promise<void> {
  await apiClient.delete(`/internal-meetings/${id}`);
}

export async function resendInternalMeetingInvitations(id: string): Promise<{ sent: number }> {
  const { data } = await apiClient.post<{ sent: number }>(`/internal-meetings/${id}/resend-invitations`);
  return data;
}

export interface InternalMeetingRecording {
  id: string;
  meetingId: string;
  egressId: string;
  filePath: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  playbackUrl?: string | null;
  playbackError?: string;
}

export async function getInternalMeetingRecordings(meetingId: string): Promise<InternalMeetingRecording[]> {
  const { data } = await apiClient.get<InternalMeetingRecording[]>(`/internal-meetings/${meetingId}/recordings`);
  return data;
}
