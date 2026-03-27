"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface CreateSupportCameraInviteResponse {
  inviteToken: string;
  roomName: string;
  expiresAt: string;
  joinUrl: string;
  targetName?: string;
  targetEmail?: string;
}

export interface SupportCameraLiveKitTokenResponse {
  token: string;
  roomName: string;
  role: "viewer" | "publisher";
}

export async function createSupportCameraInvite(
  targetUserId: string
): Promise<CreateSupportCameraInviteResponse> {
  const { data } = await apiClient.post<CreateSupportCameraInviteResponse>(
    "/platform/support-camera-invites",
    { targetUserId }
  );
  return data;
}

export async function exchangeSupportCameraInviteToken(
  inviteToken: string
): Promise<SupportCameraLiveKitTokenResponse> {
  const { data } = await apiClient.post<SupportCameraLiveKitTokenResponse>(
    "/platform/support-camera-invites/token",
    { inviteToken }
  );
  return data;
}
