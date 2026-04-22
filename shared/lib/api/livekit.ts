"use client";

import { apiClient } from "./client";

export interface LiveKitTokenResponse {
  token: string;
  roomName: string;
  participantName: string;
  participantIdentity: string;
  isHost?: boolean;
  /** Same as isHost for public join — true when user may publish (host or admitted from waiting room) */
  canPublish?: boolean;
  /** ISO end time for scheduled interviews (scheduledAt + durationMinutes); absent for non-calendar rooms. */
  meetingEndAt?: string | null;
}

export interface StartRecordingResponse {
  success: boolean;
  egressId: string;
  roomName: string;
  status: string;
  message: string;
}

export interface StopRecordingResponse {
  success: boolean;
  egressId: string;
  status: string;
  message: string;
}

export interface RecordingStatusResponse {
  isRecording: boolean;
  recordings: Array<{
    egressId: string;
    roomName: string;
    status: string;
    startedAt: string;
  }>;
}

/**
 * Generate LiveKit access token (authenticated)
 */
export async function getLiveKitToken(
  roomName: string,
  participantName?: string,
  participantEmail?: string
): Promise<LiveKitTokenResponse> {
  const response = await apiClient.post<LiveKitTokenResponse>("/livekit/token", {
    roomName,
    participantName,
    participantEmail,
  });
  return response.data;
}

/**
 * Generate LiveKit access token (public, no auth) for /join/room/[roomId]
 * Pass participantIdentity when polling so the server can recognize admitted participants.
 */
export async function getPublicLiveKitToken(
  roomName: string,
  participantName: string,
  participantEmail?: string,
  participantIdentity?: string
): Promise<LiveKitTokenResponse> {
  const response = await apiClient.post<LiveKitTokenResponse>("/public/livekit-token", {
    roomName,
    participantName: participantName || "Guest",
    participantEmail,
    participantIdentity,
  });
  return response.data;
}

/**
 * Start recording for a room
 */
export async function startRecording(
  roomName: string
): Promise<StartRecordingResponse> {
  const response = await apiClient.post<StartRecordingResponse>(
    "/livekit/recording/start",
    { roomName }
  );
  return response.data;
}

/**
 * Stop recording (authenticated – requires roomName for host check)
 */
export async function stopRecording(
  egressId: string,
  roomName: string
): Promise<StopRecordingResponse> {
  const response = await apiClient.post<StopRecordingResponse>(
    "/livekit/recording/stop",
    { egressId, roomName }
  );
  return response.data;
}

/**
 * Get recording status for a room
 */
export async function getRecordingStatus(
  roomName: string
): Promise<RecordingStatusResponse> {
  const response = await apiClient.get<RecordingStatusResponse>(
    `/livekit/recording/status/${encodeURIComponent(roomName)}`
  );
  return response.data;
}

/**
 * Start recording (public – host only, no auth)
 */
export async function startRecordingPublic(
  roomName: string,
  hostEmail: string
): Promise<StartRecordingResponse> {
  const response = await apiClient.post<StartRecordingResponse>(
    "/public/recording/start",
    { roomName, hostEmail }
  );
  return response.data;
}

/**
 * Stop recording (public – host only, no auth)
 */
export async function stopRecordingPublic(
  egressId: string,
  roomName: string,
  hostEmail: string
): Promise<StopRecordingResponse> {
  const response = await apiClient.post<StopRecordingResponse>(
    "/public/recording/stop",
    { egressId, roomName, hostEmail }
  );
  return response.data;
}

/**
 * Get recording status (public – no auth)
 */
export async function getRecordingStatusPublic(
  roomName: string
): Promise<RecordingStatusResponse> {
  const response = await apiClient.get<RecordingStatusResponse>(
    `/public/recording/status/${encodeURIComponent(roomName)}`
  );
  return response.data;
}

export interface WaitingParticipant {
  identity: string;
  name: string;
  joinedAt: string;
}

export interface WaitingParticipantsResponse {
  success: boolean;
  participants: WaitingParticipant[];
}

/**
 * Get waiting participants for a room
 */
export async function getWaitingParticipants(
  roomName: string
): Promise<WaitingParticipantsResponse> {
  const response = await apiClient.get<WaitingParticipantsResponse>(
    `/livekit/waiting-participants/${encodeURIComponent(roomName)}`
  );
  return response.data;
}

export interface AdmitParticipantResponse {
  success: boolean;
  identity: string;
  name: string;
  token: string;
  admitted: boolean;
  message: string;
}

/**
 * Admit a waiting participant
 */
export async function admitParticipant(
  roomName: string,
  participantIdentity: string,
  participantName?: string,
  participantEmail?: string
): Promise<AdmitParticipantResponse> {
  const response = await apiClient.post<AdmitParticipantResponse>(
    "/livekit/admit-participant",
    {
      roomName,
      participantIdentity,
      participantName,
      participantEmail,
    }
  );
  return response.data;
}

export interface RemoveParticipantResponse {
  success: boolean;
  identity: string;
  removed: boolean;
  message: string;
}

/**
 * Remove/deny a waiting participant
 */
export async function removeParticipant(
  roomName: string,
  participantIdentity: string
): Promise<RemoveParticipantResponse> {
  const response = await apiClient.post<RemoveParticipantResponse>(
    "/livekit/remove-participant",
    {
      roomName,
      participantIdentity,
    }
  );
  return response.data;
}

/**
 * Get waiting participants for a room (public, no auth required)
 * Pass hostEmail to verify host status
 */
export async function getWaitingParticipantsPublic(
  roomName: string,
  hostEmail?: string
): Promise<WaitingParticipantsResponse> {
  const params = new URLSearchParams();
  if (hostEmail) {
    params.set("hostEmail", hostEmail);
  }
  const url = `/public/waiting-participants/${encodeURIComponent(roomName)}${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await apiClient.get<WaitingParticipantsResponse>(url);
  return response.data;
}

/**
 * Admit a waiting participant (public, no auth required)
 * Pass hostEmail to verify host status
 */
export async function admitParticipantPublic(
  roomName: string,
  participantIdentity: string,
  participantName: string | undefined,
  participantEmail: string | undefined,
  hostEmail: string
): Promise<AdmitParticipantResponse> {
  if (!hostEmail?.trim()) {
    throw new Error("hostEmail is required for public admit-participant");
  }
  const response = await apiClient.post<AdmitParticipantResponse>(
    "/public/admit-participant",
    {
      roomName,
      participantIdentity,
      participantName,
      participantEmail,
      hostEmail: hostEmail.trim(),
    }
  );
  return response.data;
}

/**
 * Remove/deny a waiting participant (public, no auth required)
 * Pass hostEmail to verify host status
 */
export async function removeParticipantPublic(
  roomName: string,
  participantIdentity: string,
  hostEmail: string
): Promise<RemoveParticipantResponse> {
  if (!hostEmail?.trim()) {
    throw new Error("hostEmail is required for public remove-participant");
  }
  const response = await apiClient.post<RemoveParticipantResponse>(
    "/public/remove-participant",
    {
      roomName,
      participantIdentity,
      hostEmail: hostEmail.trim(),
    }
  );
  return response.data;
}
