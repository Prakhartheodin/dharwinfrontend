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
  purpose?: string | null;
  job?: string;
  candidate?: string;
  /** Computed: Job/Recruiter | Student/Candidate | Other */
  displayCategory?: string;
  /** Company name (Job/Recruiter) or student name (Student/Candidate); fallback to phone */
  displayName?: string | null;
};

export type GetCallRecordsParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  language?: string;
  sortBy?: "date" | "createdAt";
  order?: "asc" | "desc";
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

export type BolnaCandidateAgentSettings = {
  success: boolean;
  extraSystemInstructions: string;
  greetingOverride: string;
  updatedAt?: string;
  updatedBy?: string | null;
};

export async function getBolnaCandidateAgentSettings(): Promise<BolnaCandidateAgentSettings> {
  const { data } = await apiClient.get<BolnaCandidateAgentSettings>("/bolna/candidate-agent-settings");
  return data;
}

export async function patchBolnaCandidateAgentSettings(body: {
  extraSystemInstructions?: string;
  greetingOverride?: string;
}): Promise<BolnaCandidateAgentSettings> {
  const { data } = await apiClient.patch<BolnaCandidateAgentSettings>("/bolna/candidate-agent-settings", body);
  return data;
}

