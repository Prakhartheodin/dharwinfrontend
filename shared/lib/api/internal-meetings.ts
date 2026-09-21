"use client";

import { apiClient } from "@/shared/lib/api/client";

/** Communication internal meetings (not ATS interviews). Backend: /internal-meetings */
export interface InternalMeetingHost {
  nameOrRole?: string;
  email: string;
}

/** Recurrence rule for a recurring meeting series. */
export interface MeetingRecurrence {
  frequency: "daily" | "weekly" | "monthly" | "custom";
  interval?: number; // every N days/weeks/months
  daysOfWeek?: number[]; // 0=Sun .. 6=Sat (weekly)
  dayOfMonth?: number | null; // monthly
}

export interface MeetingRecurrenceEnd {
  mode: "never" | "onDate" | "afterCount";
  untilDate?: string | null;
  count?: number | null;
}

export type SeriesEditMode = "single" | "future" | "series";

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
  // Present (with frequency) => the backend creates a recurring series.
  recurrence?: MeetingRecurrence;
  end?: MeetingRecurrenceEnd;
  /** Edit HRMS orientation: duplicate-guard + link Placement.orientationMeetingId. */
  orientationPlacementId?: string;
}

export interface InternalMeeting {
  /** Mongo document id (toJSON plugin exposes this as `id`). */
  id?: string;
  _id?: string;
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
  endedAt?: string | null;
  createdBy?: { _id: string; name?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
  publicMeetingUrl?: string;
  // Recurring-series linkage (null/absent for one-off meetings).
  seriesId?: string | null;
  occurrenceIndex?: number | null;
  recurrenceSummary?: string;
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
  search?: string;
  status?: string;
  /**
   * scheduledAt window, as ISO INSTANTS (not calendar days). Resolve the viewer's local
   * day to UTC before calling — the server infers no timezone. Accepted by the endpoint
   * since before this client exposed it.
   */
  dateFrom?: string;
  dateTo?: string;
  scope?: "mine";
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
  payload: UpdateInternalMeetingPayload,
  mode?: SeriesEditMode
): Promise<InternalMeeting> {
  const { data } = await apiClient.patch<InternalMeeting>(`/internal-meetings/${id}`, payload, {
    params: mode ? { mode } : undefined,
  });
  return data;
}

/** Cancel a one-off (non-recurring) meeting. Distinct from `updateInternalMeeting` so the
 *  backend can require the DELETE permission here instead of EDIT — recurring meetings/series
 *  are cancelled via `deleteInternalMeeting` (mode param), which already enforces DELETE. */
export async function cancelInternalMeeting(id: string): Promise<InternalMeeting> {
  const { data } = await apiClient.patch<InternalMeeting>(`/internal-meetings/${id}/cancel`);
  return data;
}

export async function deleteInternalMeeting(
  id: string,
  mode?: SeriesEditMode,
  opts?: { purge?: boolean }
): Promise<{ deleted?: number; cancelled?: number }> {
  const params: Record<string, string | boolean> = {};
  if (mode) params.mode = mode;
  if (opts?.purge) params.purge = true;
  const { data } = await apiClient.delete<{ deleted?: number; cancelled?: number }>(
    `/internal-meetings/${id}`,
    { params: Object.keys(params).length ? params : undefined }
  );
  return data ?? {};
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

export interface OrientationOnboardingTask {
  title: string;
  required: boolean;
  done: boolean;
  order: number;
  _id?: string;
}

export interface OrientationOnboardingResponse {
  linked: boolean;
  ended?: boolean;
  meetingStatus?: string;
  placementId?: string;
  candidateName?: string;
  tasks?: OrientationOnboardingTask[];
}

export async function getInternalMeetingOrientationOnboarding(
  id: string
): Promise<OrientationOnboardingResponse> {
  const { data } = await apiClient.get<OrientationOnboardingResponse>(
    `/internal-meetings/${id}/orientation-onboarding`
  );
  return data;
}

export async function patchInternalMeetingOrientationOnboarding(
  id: string,
  tasks: { title: string; done: boolean }[]
): Promise<OrientationOnboardingResponse> {
  const { data } = await apiClient.patch<OrientationOnboardingResponse>(
    `/internal-meetings/${id}/orientation-onboarding`,
    { tasks }
  );
  return data;
}
