"use client";

import { apiClient } from "./client";

export interface LiveKitTokenResponse {
  token: string;
  roomName: string;
  participantName: string;
  participantIdentity: string;
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
 * Generate LiveKit access token
 */
export async function getLiveKitToken(
  roomName: string,
  participantName?: string
): Promise<LiveKitTokenResponse> {
  const response = await apiClient.post<LiveKitTokenResponse>("/livekit/token", {
    roomName,
    participantName,
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
 * Stop recording
 */
export async function stopRecording(
  egressId: string
): Promise<StopRecordingResponse> {
  const response = await apiClient.post<StopRecordingResponse>(
    "/livekit/recording/stop",
    { egressId }
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
