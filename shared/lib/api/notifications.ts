"use client";

import { apiClient } from "@/shared/lib/api/client";

const BASE = "/notifications";

export type NotificationType =
  | "leave"
  | "task"
  | "offer"
  | "meeting"
  | "meeting_reminder"
  | "course"
  | "certificate"
  | "job_application"
  | "project"
  | "account"
  | "recruiter"
  | "assignment"
  | "sop"
  | "general";

export interface Notification {
  _id: string;
  user: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsListResponse {
  results: Notification[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkAllReadResponse {
  modifiedCount: number;
}

export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationsListResponse> {
  const { data } = await apiClient.get<NotificationsListResponse>(BASE, {
    params: params
      ? {
          page: params.page,
          limit: params.limit,
          unreadOnly: params.unreadOnly === true ? "true" : undefined,
        }
      : undefined,
  });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<UnreadCountResponse>(`${BASE}/unread-count`);
  return data.count;
}

export async function markAsRead(id: string): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(`${BASE}/${id}/read`);
  return data;
}

export async function markAllAsRead(): Promise<number> {
  const { data } = await apiClient.patch<MarkAllReadResponse>(`${BASE}/read-all`);
  return data.modifiedCount;
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

/** SSE event types pushed by the server */
export type NotificationSSEEvent = { type: "notification"; notification: Notification } | { type: "unread_count"; count: number };

/**
 * Open Server-Sent Events stream for real-time notifications.
 * Caller must call close() on the returned object when done.
 * Uses fetch with credentials so cookies are sent (same-origin or CORS with credentials).
 * Reconnects automatically with exponential backoff (max 30s) on stream close or error.
 */
export function openNotificationStream(
  onEvent: (event: NotificationSSEEvent) => void,
  onError?: (err: unknown) => void
): { close: () => void } {
  const baseURL = apiClient.defaults.baseURL || (typeof window !== "undefined" ? "/api/v1" : "");
  const url = `${baseURL}${BASE}/sse`;
  const controller = new AbortController();
  let retries = 0;

  function scheduleReconnect() {
    if (controller.signal.aborted) return;
    const delay = Math.min(1000 * 2 ** retries, 30000);
    retries++;
    setTimeout(openStream, delay);
  }

  function openStream() {
    if (controller.signal.aborted) return;
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((res) => {
        if (!res.ok || !res.body) {
          onError?.(new Error(`SSE failed: ${res.status}`));
          scheduleReconnect();
          return;
        }
        retries = 0;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        function read(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) { scheduleReconnect(); return; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";
            for (const chunk of lines) {
              if (chunk.startsWith("data: ")) {
                try {
                  const payload = JSON.parse(chunk.slice(6)) as NotificationSSEEvent;
                  onEvent(payload);
                } catch (_) {
                  // skip non-JSON (e.g. heartbeat)
                }
              }
            }
            return read();
          });
        }
        return read();
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        onError?.(err);
        scheduleReconnect();
      });
  }

  openStream();
  return { close: () => controller.abort() };
}
