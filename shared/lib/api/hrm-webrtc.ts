"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface HrmWebRtcSignalingTokenResponse {
  token: string;
  expiresAt: string;
  /** HRM backend base URL when configured on the API; else null (use NEXT_PUBLIC_HRM_WEBRTC_BACKEND_URL). */
  backendUrl: string | null;
}

export async function fetchHrmWebRtcSignalingToken(): Promise<HrmWebRtcSignalingTokenResponse> {
  const { data } = await apiClient.post<HrmWebRtcSignalingTokenResponse>("/platform/hrm-webrtc/signaling-token", {});
  return data;
}
