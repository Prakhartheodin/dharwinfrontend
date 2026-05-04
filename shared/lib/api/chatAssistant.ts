"use client";

import { apiClient, normalizeApiBase } from "@/shared/lib/api/client";
import { AUTH_ENDPOINTS } from "@/shared/lib/constants";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Match backend Joi limits in validations/chatAssistant.validation.js — keep us under
// the wire so a long previous reply echoed back as history doesn't trigger a 400.
const USER_MAX = 4000;
const ASSISTANT_MAX = 32000;
const MAX_HISTORY_TURNS = 12;
const TRUNCATION_NOTE = "\n\n[…truncated]";

function clampContent(role: ChatMessage["role"], content: string): string {
  const limit = role === "assistant" ? ASSISTANT_MAX : USER_MAX;
  if (content.length <= limit) return content;
  return content.slice(0, limit - TRUNCATION_NOTE.length) + TRUNCATION_NOTE;
}

function prepareMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role, content: clampContent(m.role, (m.content ?? "").trim()) }))
    .filter((m) => m.content.length > 0);
}

export class ChatbotRequestError extends Error {
  status: number;
  userMessage: string;

  constructor(status: number, userMessage: string, raw?: string) {
    super(raw || userMessage);
    this.name = "ChatbotRequestError";
    this.status = status;
    this.userMessage = userMessage;
  }
}

function userMessageForStatus(status: number, raw: string): string {
  if (status === 400) {
    if (/length must be less than/i.test(raw)) {
      return "Your message is a bit long for me to handle. Could you shorten it and try again?";
    }
    return "I couldn't read that request. Could you rephrase your question?";
  }
  if (status === 401) return "Your session has expired. Please log in again to continue.";
  if (status === 403) return "The chatbot is currently disabled for this account.";
  if (status === 429) return "I'm receiving a lot of requests right now. Give me a moment and try again.";
  if (status >= 500) return "I'm having trouble reaching the server. Please try again in a few seconds.";
  return "I couldn't complete that request. Please try again.";
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return "";
    try {
      const parsed = JSON.parse(text);
      return String(parsed?.message || parsed?.error || "").trim();
    } catch {
      return text.slice(0, 280);
    }
  } catch {
    return "";
  }
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<{ reply: string }> {
  const res = await apiClient.post("/chat-assistant/message", { messages: prepareMessages(messages) });
  return res.data.data;
}

async function fetchStream(url: string, messages: ChatMessage[], signal?: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: prepareMessages(messages) }),
    signal,
  });
}

/**
 * SSE-based streaming. Calls onToken for each text chunk, resolves when done.
 * Throws ChatbotRequestError with .userMessage suitable for direct display.
 */
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
      throw new ChatbotRequestError(401, userMessageForStatus(401, ""));
    }
    res = await fetchStream(url, messages, signal);
  }

  if (!res.ok) {
    const raw = await readErrorMessage(res);
    throw new ChatbotRequestError(res.status, userMessageForStatus(res.status, raw), raw);
  }
  if (!res.body) {
    throw new ChatbotRequestError(0, userMessageForStatus(0, ""), "no response body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamError: ChatbotRequestError | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      let parsed: { token?: string; error?: string; done?: boolean } | null = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      if (parsed?.token) onToken(parsed.token);
      if (parsed?.error) {
        streamError = new ChatbotRequestError(
          200,
          userMessageForStatus(500, parsed.error),
          parsed.error
        );
      }
      if (parsed?.done) {
        if (streamError) throw streamError;
        return;
      }
    }
  }

  if (streamError) throw streamError;
}
