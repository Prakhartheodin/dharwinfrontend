"use client";

/** ATS screening interviews only. API: `GET|POST /meetings`. Communication internal meetings use `internal-meetings.ts` → `/internal-meetings`. */
import { apiClient } from "@/shared/lib/api/client";

/**
 * Download interviews as an .xlsx file. Mirrors the active list filters
 * (status / title) so the export matches what's on screen.
 */
export async function exportInterviewsExcel(
  params: { status?: string; title?: string } = {}
): Promise<Blob> {
  const query: Record<string, string> = {};
  if (params.status) query.status = params.status;
  if (params.title) query.title = params.title;
  const res = await apiClient.get<Blob>("/meetings/export", {
    params: query,
    responseType: "blob",
  });
  return res.data;
}

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

export interface MeetingAgentRef {
  id?: string;
  name?: string;
  email?: string;
}

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  scheduledAt: string; // ISO date string
  timezone?: string;
  durationMinutes: number; // Required for auto-ending meetings after duration
  maxParticipants?: number;
  allowGuestJoin?: boolean;
  requireApproval?: boolean;
  hosts?: MeetingHost[];
  emailInvites?: string[];
  jobPosition?: string;
  interviewType?: "Video" | "In-Person" | "Phone";
  candidate?: MeetingCandidateRef | null;
  recruiter?: MeetingRecruiterRef | null;
  agents?: MeetingAgentRef[];
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
  agents?: MeetingAgentRef[];
  notes?: string;
  status: string;
  /** Interview result: pending, selected, rejected */
  interviewResult?: 'pending' | 'selected' | 'rejected';
  createdBy?: { _id: string; name?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
  publicMeetingUrl?: string;
  /** Set when interviewResult=selected but createPlacementFromInterview failed (PATCH response only). */
  moveToPreboardingError?: string;
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

export type UpdateMeetingPayload = Partial<CreateMeetingPayload> & {
  status?: string;
  interviewResult?: 'pending' | 'selected' | 'rejected';
};

export async function updateMeeting(id: string, payload: UpdateMeetingPayload): Promise<Meeting> {
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

/** Manually trigger move to pre-boarding for a meeting with result=selected. Use to retry if auto-move failed. */
export async function moveMeetingToPreboarding(id: string): Promise<{ moved: boolean; message: string }> {
  const { data } = await apiClient.post<{ moved: boolean; message: string }>(`/meetings/${id}/move-to-preboarding`);
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
  /** Duration in milliseconds. Backend computes from completedAt - startedAt when stored value is null. */
  durationMs?: number | null;
  /** S3 file size in bytes (when known). */
  bytes?: number | null;
  playbackUrl?: string | null;
  playbackError?: string;
}

export async function getMeetingRecordings(meetingId: string): Promise<MeetingRecording[]> {
  const { data } = await apiClient.get<MeetingRecording[]>(`/meetings/${meetingId}/recordings`);
  return data;
}

/** Public: mark meeting as ended when host leaves. No auth. Body: { roomName, hostEmail } */
export async function endMeetingPublic(roomName: string, hostEmail: string): Promise<Meeting> {
  const { data } = await apiClient.post<Meeting>("/public/meetings/end", { roomName, hostEmail });
  return data;
}

export interface RecordingAttendee {
  name: string | null;
  email: string | null;
  /** candidate | recruiter | host | agent | invite */
  role: string;
}

export interface RecordingWithMeeting extends MeetingRecording {
  meetingTitle?: string;
  /** 'interview' when the meeting has a candidate/jobPosition; 'meeting' otherwise. */
  source?: "interview" | "meeting";
  /** Denormalised attendee list from the joined Meeting document. */
  attendees?: RecordingAttendee[];
  /** Backend exposes for aborted/failed/missing rows so UI can surface the failure reason. */
  lastError?: string;
  /** LiveKit egress identifier (sparse). Surfaced for ops/debug copy actions. */
  egressId?: string | null;
}

export interface RecordingsListResponse {
  results: RecordingWithMeeting[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/** List all meeting recordings (paginated). Requires meetings.record permission. */
export async function listAllRecordings(params?: {
  page?: number;
  limit?: number;
  status?: string;
  /** Free-text search across title, attendee name, attendee/host email. */
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Filter by recording origin: 'interview' | 'meeting' */
  source?: "interview" | "meeting" | "";
}): Promise<RecordingsListResponse> {
  const { data } = await apiClient.get<RecordingsListResponse>("/recordings", { params });
  return data;
}

export interface SyncFromLiveKitResult {
  swept: number;
  upserted: number;
  skipped: number;
  stuckScanned?: number;
  backfilled?: number;
  stuckSkipped?: number;
  results: Array<{
    egressId: string;
    meetingId: string;
    meetingTitle?: string | null;
    matched?: boolean;
    status: string;
    livekitStatus?: string;
    filePath?: string | null;
    bytes?: number | null;
  }>;
}

/** Pull every egress from LiveKit + upsert Recording rows. Idempotent. */
export async function syncRecordingsFromLiveKit(): Promise<SyncFromLiveKitResult> {
  const { data } = await apiClient.post<SyncFromLiveKitResult>("/recordings/sync");
  return data;
}

export interface TranscriptUtterance {
  speaker?: string | null;
  speakerName?: string | null;
  speakerLabel?: string | null;
  speakerSource?: "livekit" | "deepgram" | "fallback" | null;
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number | null;
}

export interface TranscriptSegment {
  id: string;
  sequenceNumber: number;
  windowStartMs: number;
  windowEndMs: number;
  combinedText: string;
  utteranceCount: number;
  utterances: TranscriptUtterance[];
  createdAt?: string;
}

export interface RecordingTranscriptResponse {
  recording: {
    id: string;
    meetingId: string;
    egressId?: string | null;
    status: string;
    startedAt?: string | null;
    completedAt?: string | null;
    durationMs?: number | null;
    aiProcessingStatus: string;
    aiProcessingError: string | null;
  };
  meetingTitle: string;
  segments: TranscriptSegment[];
  totalSegments: number;
  /** Which key found the segments: `recordingId` (preferred) or `meetingId` (legacy fallback). */
  source: "recordingId" | "meetingId";
}

/** Fetch transcript segments for a recording (sequenceNumber asc). */
export async function getRecordingTranscript(
  recordingId: string
): Promise<RecordingTranscriptResponse> {
  const { data } = await apiClient.get<RecordingTranscriptResponse>(
    `/recordings/${recordingId}/transcript`
  );
  return data;
}
