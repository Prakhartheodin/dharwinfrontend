"use client";

/** ATS screening interviews only. API: `GET|POST /meetings`. Communication internal meetings use `internal-meetings.ts` → `/internal-meetings`. */
import { apiClient } from "@/shared/lib/api/client";

/**
 * Download interviews as an .xlsx file. POST with the same query filters as the list
 * (omit page/limit) so the export matches the filtered Interviews table.
 */
export type ExportInterviewsExcelParams = {
  candidate?: string
  recruiter?: string
  status?: string
  interviewType?: string
  title?: string
  sortBy?: string
}

export async function exportInterviewsExcel(
  params: ExportInterviewsExcelParams = {}
): Promise<Blob> {
  const query: Record<string, string> = {};
  if (params.candidate) query.candidate = params.candidate;
  if (params.recruiter) query.recruiter = params.recruiter;
  if (params.status) query.status = params.status;
  if (params.interviewType) query.interviewType = params.interviewType;
  if (params.title) query.title = params.title;
  if (params.sortBy) query.sortBy = params.sortBy;
  const res = await apiClient.post<Blob>("/meetings/export", {}, {
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

/** D4 round types — must match backend src/constants/interviewLinkage.js INTERVIEW_ROUND_TYPES (Joi rejects others). */
export type InterviewRoundType =
  | 'screening'
  | 'technical'
  | 'behavioral'
  | 'hiring_manager'
  | 'culture'
  | 'final'
  | 'other';

/** Backend SUPPORTED_INTERVIEW_LANGUAGES; anything else is a 400. */
export type InterviewLanguage = 'en';

export interface InterviewRound {
  /** Server defaults to (non-cancelled interviews for the application) + 1 when omitted. */
  index?: number;
  type?: InterviewRoundType;
  label?: string | null;
}

/** `verified*` = evaluation-eligible; `legacy_title_candidate` needs human confirmation; missing = `unlinked`. */
export type InterviewLinkageStatus =
  | 'unlinked'
  | 'legacy_title_candidate'
  | 'verified'
  | 'verified_exact_ids'
  | 'verified_manual';

/** `errorCode` of the HTTP 409 bodies returned by the interview-linkage endpoints and placement/transfer. */
export type InterviewLinkageErrorCode =
  | 'interview_not_linked'
  | 'linkage_revision_conflict'
  | 'interview_already_linked'
  | 'application_exists';

/** GET /meetings/:id/linkage (also returned by the linkage PATCH and the explicit application create). */
export interface MeetingLinkage {
  applicationId?: string | null;
  jobId?: string | null;
  candidateId?: string | null;
  round?: InterviewRound | null;
  interviewLanguage: string;
  linkageStatus: InterviewLinkageStatus;
  linkageSource?: string | null;
  /** Send back as `expectedRevision`; a stale value answers 409 `linkage_revision_conflict`. */
  linkageRevision: number;
  linkageVerifiedAt?: string | null;
}

export interface PatchMeetingLinkagePayload {
  applicationId?: string;
  round?: InterviewRound;
  interviewLanguage?: InterviewLanguage;
  expectedRevision: number;
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
  /** 24-hex JobApplication id. Omit (never '' or null) when unknown — Joi accepts only a hex string. */
  applicationId?: string;
  round?: InterviewRound;
  interviewLanguage?: InterviewLanguage;
}

/** Rubric criterion ids — must stay in sync with backend src/constants/interviewRubric.js. */
export type RubricCriterionId =
  | 'technical'
  | 'communication'
  | 'problemSolving'
  | 'cultureFit'
  | 'experience';

export interface RubricRating {
  criterion: RubricCriterionId;
  /** 1-5. A criterion the scorer skipped is absent from the array, never stored as 0. */
  rating: number;
}

export interface InterviewScorecard {
  ratings?: RubricRating[];
  comment?: string;
  /** Stamped server-side on every write; never sent by the client. */
  scoredBy?: { _id: string; name?: string; email?: string } | string | null;
  scoredAt?: string | null;
}

export interface Meeting {
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
  /** Rubric scores (PRD 5.4). Informational — never derives interviewResult. */
  interviewScorecard?: InterviewScorecard;
  createdBy?: { _id: string; name?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
  publicMeetingUrl?: string;
  /** Set when interviewResult=selected but createPlacementFromInterview failed (PATCH response only). */
  moveToPreboardingError?: string;
  /** Stable code for moveToPreboardingError, e.g. `interview_not_linked` (PATCH response only). */
  moveToPreboardingErrorCode?: string;
  /** Result saved but its application side effect was skipped: the interview has no application (PATCH response only). */
  linkageWarning?: 'interview_not_linked';
  applicationId?: string | null;
  jobId?: string | null;
  candidateId?: string | null;
  round?: InterviewRound | null;
  interviewLanguage?: string;
  linkageStatus?: InterviewLinkageStatus;
  linkageSource?: string | null;
  linkageRevision?: number;
  /** Populated on GET /meetings/my-interviews for candidate dashboard rows. */
  jobTitle?: string;
  companyName?: string;
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
  candidate?: string;
  recruiter?: string;
  interviewType?: string;
  /**
   * scheduledAt window, as ISO INSTANTS (not calendar days). Resolve the viewer's local
   * day to UTC before calling — the server infers no timezone. Server-side filtering is
   * what keeps a "today" query bounded by time rather than by row count.
   * Max span 92 days; dateTo must not precede dateFrom.
   */
  dateFrom?: string;
  dateTo?: string;
  /** Server-side: only rows where the caller is creator, host, recruiter, agent, or invitee. */
  scope?: "mine";
  page?: number;
  limit?: number;
  sortBy?: string;
}): Promise<MeetingsListResponse> {
  const { data } = await apiClient.get<MeetingsListResponse>("/meetings", { params });
  return data;
}

/** Upcoming interviews for the signed-in candidate (auth only). */
export async function getMyInterviews(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
}): Promise<MeetingsListResponse> {
  const { data } = await apiClient.get<MeetingsListResponse>("/meetings/my-interviews", { params });
  return data;
}

export async function getMeeting(id: string): Promise<Meeting> {
  const { data } = await apiClient.get<Meeting>(`/meetings/${id}`);
  return data;
}

/** Linkage keys are not accepted by `PATCH /meetings/:id` (Joi 400s the whole save) — use patchMeetingLinkage. */
export type UpdateMeetingPayload = Partial<Omit<CreateMeetingPayload, 'applicationId' | 'round' | 'interviewLanguage'>> & {
  status?: string;
  interviewResult?: 'pending' | 'selected' | 'rejected';
  /** Ratings + comment only — scoredBy/scoredAt are server-owned and rejected by Joi. */
  interviewScorecard?: Pick<InterviewScorecard, 'ratings' | 'comment'>;
};

export async function updateMeeting(id: string, payload: UpdateMeetingPayload): Promise<Meeting> {
  const { data } = await apiClient.patch<Meeting>(`/meetings/${id}`, payload);
  return data;
}

export async function getMeetingLinkage(id: string): Promise<MeetingLinkage> {
  const { data } = await apiClient.get<MeetingLinkage>(`/meetings/${id}/linkage`);
  return data;
}

/** Link an application / edit round or language. 409 `linkage_revision_conflict` when `expectedRevision` is stale. */
export async function patchMeetingLinkage(id: string, payload: PatchMeetingLinkagePayload): Promise<MeetingLinkage> {
  const { data } = await apiClient.patch<MeetingLinkage>(`/meetings/${id}/linkage`, payload);
  return data;
}

/**
 * Explicit, audited "Create application for this interview" (candidate + 24-hex jobPosition required).
 * 409: `interview_already_linked` / `application_exists` (details.applicationId) /
 * `linkage_revision_conflict` (application created, link lost a race; details.applicationId).
 */
export async function createApplicationForMeeting(id: string): Promise<MeetingLinkage> {
  const { data } = await apiClient.post<MeetingLinkage>(`/meetings/${id}/application`);
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

/**
 * Internal transfer for a self-applied EXISTING employee after a selected interview. Updates the same
 * employee record (designation/department), no new offer/placement, keeps employeeId. Backend rejects
 * non-employees and resigned employees (use the hire/rehire flow instead).
 */
export async function internalTransferEmployee(
  id: string,
  body: { designation?: string; departmentId?: string; effectiveDate?: string } = {}
): Promise<{ transferred: boolean; message: string; transferId: string }> {
  const { data } = await apiClient.post<{ transferred: boolean; message: string; transferId: string }>(
    `/meetings/${id}/internal-transfer`,
    body
  );
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

export interface MeetingTranscriptUtterance {
  utteranceId?: string;
  displayName?: string | null;
  speakerRole?: string;
  roleAssurance?: string | null;
  participantIdentity?: string | null;
  text: string;
  recordingOffsetMs?: number | null;
  startedAtEpochMs?: number | null;
  endedAtEpochMs?: number | null;
  confidence?: number | null;
}

export interface MeetingTranscriptResponse {
  meetingId: string;
  interviewId: string;
  version: number;
  schemaVersion?: number;
  evidenceGrade?: string | null;
  partialReasons?: string[];
  quality?: {
    maxGapMs?: number | null;
    lowConfidenceShare?: number | null;
    coverageRatio?: number | null;
  } | null;
  utteranceCount: number;
  interviewLanguage?: string;
  transcriptVersionId?: string;
  utterances: MeetingTranscriptUtterance[];
}

export async function getMeetingTranscript(
  meetingId: string,
  params?: { version?: number }
): Promise<MeetingTranscriptResponse> {
  const { data } = await apiClient.get<MeetingTranscriptResponse>(`/meetings/${meetingId}/transcript`, {
    params,
  });
  return data;
}

export interface MeetingSummaryResponse {
  meetingId: string;
  interviewId: string;
  version: number;
  partial?: boolean;
  executiveSummary: string;
  bulletSummary: string[];
  actionItems: Array<{ text: string; owner?: string | null; dueHint?: string | null; timestampMs?: number | null }>;
  decisions: Array<{ text: string; timestampMs?: number | null }>;
  blockers: string[];
  nextSteps: string[];
  participantsActive: Array<{ identity?: string | null; name?: string | null; speakingMs?: number }>;
  durationMs?: number | null;
  generatedAt?: string | null;
  summaryId?: string;
}

export async function getMeetingSummary(
  meetingId: string,
  params?: { version?: number }
): Promise<MeetingSummaryResponse> {
  const { data } = await apiClient.get<MeetingSummaryResponse>(`/meetings/${meetingId}/summary`, { params });
  return data;
}

export const INTERVIEW_NOTICE_VERSION = "draft-2026-09-v1";

export interface SubmitInterviewConsentPayload {
  noticeVersion: string;
  recording: boolean;
  transcription: boolean;
  aiEvaluation: boolean;
}

export interface SubmitInterviewConsentResponse {
  meetingId: string;
  identity: string;
  noticeVersion: string;
  recording: boolean;
  transcription: boolean;
  aiEvaluation: boolean;
  acceptedAt: string;
}

/** Public join consent — Authorization: Bearer LiveKit access token. */
export async function submitPublicMeetingConsent(
  roomName: string,
  liveKitToken: string,
  payload: SubmitInterviewConsentPayload
): Promise<SubmitInterviewConsentResponse> {
  const { data } = await apiClient.post<SubmitInterviewConsentResponse>(
    `/public/meetings/${encodeURIComponent(roomName)}/consent`,
    payload,
    { headers: { Authorization: `Bearer ${liveKitToken}` } }
  );
  return data;
}
