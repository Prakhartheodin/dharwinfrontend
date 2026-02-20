"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface MeetingHost {
  nameOrRole?: string;
  email: string;
}

export interface MeetingCandidateRef {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface MeetingRecruiterRef {
  id?: string;
  name?: string;
  email?: string;
}

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  scheduledAt: string; // ISO date string
  timezone?: string;
  durationMinutes?: number;
  maxParticipants?: number;
  allowGuestJoin?: boolean;
  requireApproval?: boolean;
  hosts?: MeetingHost[];
  emailInvites?: string[];
  jobPosition?: string;
  interviewType?: "Video" | "In-Person" | "Phone";
  candidate?: MeetingCandidateRef | null;
  recruiter?: MeetingRecruiterRef | null;
  notes?: string;
}

export interface Meeting {
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
  hosts: MeetingHost[];
  emailInvites: string[];
  jobPosition?: string;
  interviewType: string;
  candidate?: MeetingCandidateRef;
  recruiter?: MeetingRecruiterRef;
  notes?: string;
  status: string;
  createdBy?: { _id: string; name?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
  publicMeetingUrl?: string;
}

export interface MeetingsListResponse {
  results: Meeting[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function createMeeting(payload: CreateMeetingPayload): Promise<Meeting & { publicMeetingUrl: string }> {
  const { data } = await apiClient.post<Meeting & { publicMeetingUrl: string }>("/meetings", payload);
  return data;
}

export async function listMeetings(params?: {
  title?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}): Promise<MeetingsListResponse> {
  const { data } = await apiClient.get<MeetingsListResponse>("/meetings", { params });
  return data;
}

export async function getMeeting(id: string): Promise<Meeting> {
  const { data } = await apiClient.get<Meeting>(`/meetings/${id}`);
  return data;
}

export async function updateMeeting(id: string, payload: Partial<CreateMeetingPayload>): Promise<Meeting> {
  const { data } = await apiClient.patch<Meeting>(`/meetings/${id}`, payload);
  return data;
}

export async function deleteMeeting(id: string): Promise<void> {
  await apiClient.delete(`/meetings/${id}`);
}

export async function resendMeetingInvitations(id: string): Promise<{ sent: number }> {
  const { data } = await apiClient.post<{ sent: number }>(`/meetings/${id}/resend-invitations`);
  return data;
}

export interface MeetingRecording {
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

export async function getMeetingRecordings(meetingId: string): Promise<MeetingRecording[]> {
  const { data } = await apiClient.get<MeetingRecording[]>(`/meetings/${meetingId}/recordings`);
  return data;
}
