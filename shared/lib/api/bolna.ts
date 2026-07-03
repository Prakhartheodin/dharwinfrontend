"use client";

import { apiClient } from "@/shared/lib/api/client";

export type InitiateBolnaCallParams = {
  phone: string;
  candidateName: string;
  jobId: string;
  fromPhoneNumber?: string;
};

export type InitiateCandidateVerificationCallParams = {
  candidateId: string;
  candidateName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
};

export type InitiateBolnaCallResponse = {
  success: boolean;
  executionId: string;
  message?: string;
};

export type BolnaExecutionDetails = {
  execution_id?: string;
  id?: string;
  status?: string;
  transcript?: string;
  conversation_transcript?: string;
  extracted_data?: unknown;
  telephony_data?: {
    recording_url?: string;
    duration?: number;
    to_number?: string;
    from_number?: string;
  };
  error_message?: string;
  [key: string]: unknown;
};

export type GetCallStatusResponse = {
  success: boolean;
  details: BolnaExecutionDetails;
};

export type CallVerification = {
  nameConfirmed?: boolean | null;
  correctedName?: string | null;
  jobConfirmed?: boolean | null;
  availability?: string | null;
  currentLocation?: string | null;
  stillInterested?: "interested" | "not_interested" | "withdrew" | null;
  callOutcome?:
    | "fully_confirmed"
    | "partially_confirmed"
    | "refused"
    | "voicemail"
    | "no_data"
    | null;
  minConfidence?: number | null;
  fieldsPresent?: number;
  extractedAt?: string | null;
};

export type CallQuality = {
  status?: "ok" | "needs_review";
  reasons?: string[];
  evaluatedAt?: string | null;
};

export type CallRecord = {
  _id?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  executionId?: string;
  status?: string;
  phone?: string;
  recipientPhoneNumber?: string;
  toPhoneNumber?: string;
  userNumber?: string;
  fromPhoneNumber?: string;
  businessName?: string;
  language?: string;
  transcript?: string;
  conversationTranscript?: string;
  duration?: number;
  recordingUrl?: string;
  errorMessage?: string | null;
  completedAt?: string | null;
  extractedData?: unknown;
  /** Telephony provider metadata; provider="twilio" marks a Dialer call. */
  telephonyData?: { provider?: string; direction?: string } | null;
  purpose?: string | null;
  job?: string;
  candidate?: string;
  /** Computed: Job/Recruiter | Student/Candidate | Other */
  displayCategory?: string;
  /** Company name (Job/Recruiter) or student name (Student/Candidate); fallback to phone */
  displayName?: string | null;
  verification?: CallVerification;
  callQuality?: CallQuality;
  /**
   * Twilio Conversational Intelligence (dialer calls). Stripped by the backend
   * when the viewer lacks the Call AI permission — absence hides the UI.
   */
  intelligence?: {
    transcriptSid?: string | null;
    status?: string | null;
    summary?: string | null;
    requestedAt?: string | null;
    completedAt?: string | null;
  } | null;
  /** Batch B — agent annotations. */
  notes?: string;
  tags?: string[];
  relatedTo?: { entityType?: CallRelatedEntityType | null; entityId?: string | null };
};

/** Generic CRM call tags (mirror of backend CALL_TAGS). */
export const CALL_TAGS = [
  "sales",
  "support",
  "follow_up",
  "complaint",
  "demo",
  "payment",
  "other",
] as const;
export type CallTag = (typeof CALL_TAGS)[number];

/** Entity types a call can be linked to (mirror of backend CALL_RELATED_ENTITY_TYPES). */
export const CALL_RELATED_ENTITY_TYPES = [
  "lead",
  "client",
  "customer",
  "candidate",
  "job",
  "deal",
  "ticket",
  "project",
] as const;
export type CallRelatedEntityType = (typeof CALL_RELATED_ENTITY_TYPES)[number];

export type PatchCallRecordPayload = {
  notes?: string;
  tags?: CallTag[];
  relatedTo?: { entityType: CallRelatedEntityType | null; entityId: string | null };
};

export async function patchBolnaCallRecord(
  id: string,
  payload: PatchCallRecordPayload
): Promise<{ success: boolean; record: CallRecord }> {
  const { data } = await apiClient.patch<{ success: boolean; record: CallRecord }>(
    `/bolna/call-records/${encodeURIComponent(id)}`,
    payload
  );
  return data;
}

export type GetCallRecordsParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  language?: string;
  sortBy?: "date" | "createdAt";
  order?: "asc" | "desc";
  channel?: "dialer";
};

export type GetCallRecordsResponse = {
  success: boolean;
  records: CallRecord[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

export type SyncCallRecordsResponse = {
  success: boolean;
  backfilled: number;
  synced: number;
  errors: number;
  message?: string;
};

export async function initiateBolnaCall(
  params: InitiateBolnaCallParams
): Promise<InitiateBolnaCallResponse> {
  const { data } = await apiClient.post<InitiateBolnaCallResponse>("/bolna/call", params);
  return data;
}

export async function initiateCandidateVerificationCall(
  params: InitiateCandidateVerificationCallParams
): Promise<InitiateBolnaCallResponse> {
  const { data } = await apiClient.post<InitiateBolnaCallResponse>("/bolna/candidate-call", params);
  return data;
}

export async function getBolnaCallStatus(
  executionId: string
): Promise<GetCallStatusResponse> {
  const { data } = await apiClient.get<GetCallStatusResponse>(`/bolna/call-status/${executionId}`);
  return data;
}

export async function getBolnaCallRecords(
  params?: GetCallRecordsParams
): Promise<GetCallRecordsResponse> {
  const { data } = await apiClient.get<GetCallRecordsResponse>("/bolna/call-records", { params });
  return data;
}

export async function syncBolnaCallRecords(
  limit?: number
): Promise<SyncCallRecordsResponse> {
  const { data } = await apiClient.post<SyncCallRecordsResponse>("/bolna/call-records/sync", {}, {
    params: limit ? { limit } : undefined,
  });
  return data;
}

export async function deleteBolnaCallRecord(id: string): Promise<{ success: boolean; message?: string }> {
  const { data } = await apiClient.delete<{ success: boolean; message?: string }>(`/bolna/call-records/${id}`);
  return data;
}

export type CallRecordingsResponse = {
  success: boolean;
  executionId: string;
  provider?: string | null;
  recordings: {
    bolna: { available: boolean; channel?: string; streamUrl?: string; reason?: string };
    plivo: { available: boolean; channel?: string; durationMs?: number | null; streamUrl?: string; reason?: string };
    twilio?: { available: boolean; channel?: string; streamUrl?: string; reason?: string };
  };
};

export async function getCallRecordings(executionId: string): Promise<CallRecordingsResponse> {
  const { data } = await apiClient.get<CallRecordingsResponse>(
    `/bolna/call-records/${executionId}/recordings`
  );
  return data;
}

/** Bolna default post-call narrative (General → Call Summary → subjective). */
export function readBolnaCallSummary(
  extractedData: unknown
): { subjective: string; confidence: number | null } | null {
  if (!extractedData || typeof extractedData !== "object") return null;
  const general = (extractedData as Record<string, unknown>).General;
  if (!general || typeof general !== "object") return null;
  const entry = (general as Record<string, unknown>)["Call Summary"];
  if (!entry || typeof entry !== "object") return null;
  const subjective = (entry as Record<string, unknown>).subjective;
  if (typeof subjective !== "string" || !subjective.trim()) return null;
  const confidence = (entry as Record<string, unknown>).confidence;
  return {
    subjective: subjective.trim(),
    confidence: typeof confidence === "number" ? confidence : null,
  };
}

/**
 * Lightweight single-record read (backend hits only the DB — no Bolna/Twilio
 * upstream calls). Used to poll while Twilio Intelligence is processing.
 */
export async function getBolnaCallRecord(
  executionId: string
): Promise<{ success: boolean; record: CallRecord }> {
  const { data } = await apiClient.get<{ success: boolean; record: CallRecord }>(
    `/bolna/call-records/${encodeURIComponent(executionId)}`
  );
  return data;
}

export type RefreshCallRecordResponse = { success: boolean; record: CallRecord };

export async function refreshBolnaCallRecord(executionId: string): Promise<RefreshCallRecordResponse> {
  const { data } = await apiClient.post<RefreshCallRecordResponse>(
    `/bolna/call-records/${encodeURIComponent(executionId)}/refresh`
  );
  return data;
}

export type SetupCandidateExtractionsResponse = {
  success: boolean;
  agentId?: string;
  alreadyConfigured?: boolean;
  category?: string;
  existingCount?: number;
  createdCount?: number;
  createdIds?: string[];
  fieldNames?: string[];
};

/** Idempotently provision seven Candidate Verification dispositions on the Bolna candidate agent. */
export async function setupCandidateVerificationExtractions(): Promise<SetupCandidateExtractionsResponse> {
  const { data } = await apiClient.post<SetupCandidateExtractionsResponse>(
    "/bolna/candidate-agent/setup-extractions"
  );
  return data;
}

/**
 * Fetch a proxied recording stream as an object URL (audio routes are
 * JWT-protected). `onProgress` reports 0–100 while the audio downloads, or
 * null when the backend didn't send a Content-Length (indeterminate).
 */
export async function fetchRecordingObjectUrl(
  streamUrl: string,
  onProgress?: (percent: number | null) => void
): Promise<string> {
  // apiClient baseURL already includes /v1 (resolves to /api/v1 in-browser).
  // Backend stream URLs come back as /v1/bolna/... — strip the /v1 prefix so
  // the final request path matches how other calls in this file are written (/bolna/...).
  const path = streamUrl.replace(/^\/v1/, "");
  const res = await apiClient.get(path, {
    responseType: "blob",
    onDownloadProgress: onProgress
      ? (e) => onProgress(e.total ? Math.min(100, Math.round((e.loaded / e.total) * 100)) : null)
      : undefined,
  });
  return URL.createObjectURL(res.data as Blob);
}

