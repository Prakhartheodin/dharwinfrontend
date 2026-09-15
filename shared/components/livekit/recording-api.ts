import * as livekitApi from "@/shared/lib/api/livekit";

/** Poll recording status via the public (no auth) or authenticated endpoint. */
export function fetchRecordingStatus(roomName: string, usePublicApi = false) {
  return usePublicApi
    ? livekitApi.getRecordingStatusPublic(roomName)
    : livekitApi.getRecordingStatus(roomName);
}

export function startRoomRecording(roomName: string, hostEmail?: string) {
  return hostEmail
    ? livekitApi.startRecordingPublic(roomName, hostEmail)
    : livekitApi.startRecording(roomName);
}

export function stopRoomRecording(egressId: string, roomName: string, hostEmail?: string) {
  return hostEmail
    ? livekitApi.stopRecordingPublic(egressId, roomName, hostEmail)
    : livekitApi.stopRecording(egressId, roomName);
}

export function recordingApiError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { status?: number; data?: { message?: string; code?: string; errorCode?: string } };
    message?: string;
  };
  if (e?.response?.status === 409) {
    const code = e.response.data?.code || e.response.data?.errorCode;
    if (code === "consent_required") {
      return "Recording cannot start until the candidate completes recording consent in the join flow.";
    }
  }
  return e?.response?.data?.message || e?.message || fallback;
}
