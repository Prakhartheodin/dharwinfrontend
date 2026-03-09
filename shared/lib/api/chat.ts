"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface Attachment {
  url: string;
  key?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  participants: { user: { id: string; name: string; email: string }; role?: "member" | "admin" }[];
  name?: string;
  displayName?: string;
  createdBy?: { id: string; name: string; email?: string };
  lastMessage?: { content: string; sender?: string; createdAt: string };
  unreadCount?: number;
  lastMessageAt?: string;
}

export interface Message {
  id: string;
  conversation: string;
  sender: { id: string; name: string; email: string };
  content: string;
  type: "text" | "image" | "file" | "audio";
  attachments?: Attachment[];
  replyTo?: { id: string; content: string; type: string; sender?: { name: string }; createdAt: string };
  reactions?: { user: { id: string; name?: string }; emoji: string }[];
  readBy?: string[];
  createdAt: string;
  deletedAt?: string;
  deletedFor?: "me" | "everyone";
}

export interface ChatCall {
  id: string;
  conversation: string | { id: string };
  caller: { id: string; name: string; email: string };
  participants: { id: string; name: string; email: string }[];
  callType: "audio" | "video";
  status: string;
  livekitRoom?: string;
  duration?: number;
  createdAt: string;
  /** Presigned playback URL when call was recorded via LiveKit Egress */
  recordingUrl?: string | null;
}

const BASE = "/chats";

export async function listConversations(params?: {
  page?: number;
  limit?: number;
}): Promise<{ results: Conversation[]; page: number; limit: number; totalPages: number }> {
  const { data } = await apiClient.get(`${BASE}/conversations`, { params });
  return data;
}

export async function createConversation(body: {
  type: "direct" | "group";
  participantIds: string[];
  name?: string;
}): Promise<Conversation> {
  const { data } = await apiClient.post(`${BASE}/conversations`, body);
  return data;
}

export async function getConversation(id: string): Promise<Conversation> {
  const { data } = await apiClient.get(`${BASE}/conversations/${id}`);
  return data;
}

export async function getMessages(
  conversationId: string,
  params?: { before?: string; limit?: number }
): Promise<Message[]> {
  const { data } = await apiClient.get(`${BASE}/conversations/${conversationId}/messages`, {
    params,
  });
  return data;
}

export async function sendMessage(
  conversationId: string,
  content: string,
  options?: { type?: "text" | "image" | "file"; attachments?: Attachment[]; replyTo?: string }
): Promise<Message> {
  const { data } = await apiClient.post(`${BASE}/conversations/${conversationId}/messages`, {
    content,
    ...options,
  });
  return data;
}

export async function uploadChatFiles(
  conversationId: string,
  files: File[],
  content?: string,
  replyTo?: string
): Promise<Message> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  if (content) formData.append("content", content);
  if (replyTo) formData.append("replyTo", replyTo);
  // Don't set Content-Type - let browser set multipart/form-data with boundary
  const { data } = await apiClient.post(
    `${BASE}/conversations/${conversationId}/messages/upload`,
    formData,
    {
      transformRequest: [
        (data: unknown, headers: Record<string, string>) => {
          delete headers["Content-Type"];
          return data;
        },
      ],
    } as any
  );
  return data;
}

export async function reactToMessage(
  conversationId: string,
  messageId: string,
  emoji: string = "👍"
): Promise<Message> {
  const { data } = await apiClient.post(
    `${BASE}/conversations/${conversationId}/messages/${messageId}/react`,
    { emoji }
  );
  return data;
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  deleteFor: "me" | "everyone" = "me"
): Promise<Message> {
  const { data } = await apiClient.delete(`${BASE}/conversations/${conversationId}/messages/${messageId}`, {
    data: { deleteFor },
  });
  return data;
}

export async function markAsRead(conversationId: string): Promise<void> {
  await apiClient.patch(`${BASE}/conversations/${conversationId}/read`);
}

export async function initiateCall(
  conversationId: string,
  callType: "audio" | "video" = "audio"
): Promise<{ call: ChatCall; roomName: string }> {
  const { data } = await apiClient.post(
    `${BASE}/conversations/${conversationId}/call`,
    { callType }
  );
  return data;
}

export async function listCalls(params?: {
  page?: number;
  limit?: number;
}): Promise<{ results: ChatCall[]; page: number; limit: number; totalPages: number }> {
  const { data } = await apiClient.get(`${BASE}/calls`, { params });
  return data;
}

/** Get call history for a conversation (for chat timeline) */
export async function getCallsForConversation(
  conversationId: string,
  params?: { limit?: number }
): Promise<ChatCall[]> {
  const { data } = await apiClient.get(`${BASE}/conversations/${conversationId}/calls`, { params });
  return data;
}

/** Returns active call for conversation only if LiveKit room has participants (call is truly ongoing) */
export async function getActiveCallForConversation(
  conversationId: string
): Promise<(ChatCall & { liveParticipantCount?: number }) | null> {
  const { data } = await apiClient.get(`${BASE}/conversations/${conversationId}/active-call`);
  return data;
}

export async function updateCall(
  callId: string,
  body: { status?: string; duration?: number }
): Promise<ChatCall> {
  const { data } = await apiClient.patch(`${BASE}/calls/${callId}`, body);
  return data;
}

export async function endCallByRoom(roomName: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.post(`${BASE}/calls/end-by-room`, { roomName });
  return data;
}

export async function searchUsers(params: {
  search: string;
  limit?: number;
}): Promise<{ results: { id: string; name: string; email: string }[] }> {
  const { data } = await apiClient.get(`${BASE}/users/search`, { params });
  return data;
}

export async function addParticipants(
  conversationId: string,
  participantIds: string[]
): Promise<Conversation> {
  const { data } = await apiClient.post(
    `${BASE}/conversations/${conversationId}/participants`,
    { participantIds }
  );
  return data;
}

export async function removeParticipant(
  conversationId: string,
  userId: string
): Promise<Conversation | null> {
  try {
    const { data } = await apiClient.delete(
      `${BASE}/conversations/${conversationId}/participants/${userId}`
    );
    return data ?? null;
  } catch {
    return null;
  }
}

export async function setParticipantRole(
  conversationId: string,
  userId: string,
  role: "admin" | "member"
): Promise<Conversation> {
  const { data } = await apiClient.patch(
    `${BASE}/conversations/${conversationId}/participants/${userId}/role`,
    { role }
  );
  return data;
}

export async function updateGroupName(
  conversationId: string,
  name: string
): Promise<Conversation> {
  const { data } = await apiClient.patch(
    `${BASE}/conversations/${conversationId}`,
    { name }
  );
  return data;
}
