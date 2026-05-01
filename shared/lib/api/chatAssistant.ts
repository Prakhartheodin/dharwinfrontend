"use client";

import { apiClient, normalizeApiBase } from "@/shared/lib/api/client";
import { AUTH_ENDPOINTS } from "@/shared/lib/constants";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<{ reply: string }> {
  const res = await apiClient.post("/chat-assistant/message", { messages });
  return res.data.data;
}

/**
 * SSE-based streaming. Calls onToken for each text chunk, resolves when done.
 * Pass an AbortSignal to cancel mid-stream (e.g. when the panel closes).
 */
async function fetchStream(url: string, messages: ChatMessage[], signal?: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
}

export async function streamChatMessage(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const url = `${normalizeApiBase()}/chat-assistant/stream`;

  let res = await fetchStream(url, messages, signal);

  if (res.status === 401) {
    try {
      await apiClient.post(AUTH_ENDPOINTS.refreshTokens, {});
    } catch {
      throw new Error("Session expired. Please log in again.");
    }
    res = await fetchStream(url, messages, signal);
  }

  if (!res.ok) throw new Error(`Stream request failed: HTTP ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep any incomplete trailing line

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.token) onToken(parsed.token);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.done) return;
      } catch {
        /* skip malformed SSE line */
      }
    }
  }
}
