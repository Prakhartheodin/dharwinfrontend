"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  status: string;
  createdAt?: string;
}

export interface EmailMessageListItem {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string | null;
  isUnread: boolean;
}

export interface EmailMessage {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string | null;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  isUnread: boolean;
  htmlBody: string | null;
  textBody: string | null;
  attachments: { filename: string; mimeType: string; size: number; attachmentId?: string; messageId?: string }[];
}

export interface EmailThreadListItem {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string | null;
  messageCount: number;
  labelIds?: string[];
  isUnread: boolean;
}

export interface EmailLabel {
  id: string;
  name: string;
  type?: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
}

const BASE = "/email";

export async function getEmailAccounts(): Promise<EmailAccount[]> {
  const { data } = await apiClient.get(`${BASE}/accounts`);
  return data;
}

export async function getGoogleAuthUrl(): Promise<{ url: string }> {
  const { data } = await apiClient.get(`${BASE}/auth/google`);
  return data;
}

export async function disconnectAccount(accountId: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`${BASE}/accounts/${accountId}`);
  return data;
}

export async function getMessages(params: {
  accountId: string;
  labelId?: string;
  pageToken?: string;
  pageSize?: number;
  q?: string;
}): Promise<{
  messages: EmailMessageListItem[];
  nextPageToken: string | null;
  resultSizeEstimate: number;
}> {
  const { data } = await apiClient.get(`${BASE}/messages`, { params });
  return data;
}

export async function getThreads(params: {
  accountId: string;
  labelId?: string;
  pageToken?: string;
  pageSize?: number;
  q?: string;
}): Promise<{
  threads: EmailThreadListItem[];
  nextPageToken: string | null;
  resultSizeEstimate: number;
}> {
  const { data } = await apiClient.get(`${BASE}/threads`, { params });
  return data;
}

export async function getThread(
  accountId: string,
  threadId: string
): Promise<{ id: string; messages: EmailMessage[] }> {
  const { data } = await apiClient.get(`${BASE}/threads/${threadId}`, {
    params: { accountId },
  });
  return data;
}

export async function getMessage(accountId: string, messageId: string): Promise<EmailMessage> {
  const { data } = await apiClient.get(`${BASE}/messages/${messageId}`, {
    params: { accountId },
  });
  return data;
}

export function getAttachmentUrl(
  accountId: string,
  messageId: string,
  attachmentId: string
): string {
  const base = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "/api/v1" : "");
  return `${base}${BASE}/messages/${messageId}/attachments/${attachmentId}?accountId=${accountId}`;
}

export async function sendMessage(body: {
  accountId: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: string | ArrayBuffer; mimeType?: string }[];
}): Promise<{ id: string; threadId?: string }> {
  const { data } = await apiClient.post(`${BASE}/messages/send`, body);
  return data;
}

export async function replyMessage(
  messageId: string,
  body: {
    accountId: string;
    html: string;
    attachments?: { filename: string; content: string | ArrayBuffer; mimeType?: string }[];
  }
): Promise<{ id: string; threadId?: string }> {
  const { data } = await apiClient.post(`${BASE}/messages/${messageId}/reply`, body);
  return data;
}

export async function forwardMessage(
  messageId: string,
  body: {
    accountId: string;
    to: string | string[];
    html?: string;
    attachments?: unknown[];
  }
): Promise<{ id: string; threadId?: string }> {
  const { data } = await apiClient.post(`${BASE}/messages/${messageId}/forward`, body);
  return data;
}

export async function modifyMessage(
  accountId: string,
  messageId: string,
  body: { addLabelIds?: string[]; removeLabelIds?: string[] }
): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch(`${BASE}/messages/${messageId}`, body, {
    params: { accountId },
  });
  return data;
}

export async function batchModifyMessages(
  body: {
    accountId: string;
    messageIds: string[];
    addLabelIds?: string[];
    removeLabelIds?: string[];
  }
): Promise<{ success: boolean; modified: number }> {
  const { data } = await apiClient.post(`${BASE}/messages/batch-modify`, body);
  return data;
}

export async function batchModifyThreads(body: {
  accountId: string;
  threadIds: string[];
  addLabelIds?: string[];
  removeLabelIds?: string[];
}): Promise<{ success: boolean; modified: number }> {
  const { data } = await apiClient.post(`${BASE}/threads/batch-modify`, body);
  return data;
}

export async function trashThreads(accountId: string, threadIds: string[]): Promise<{ success: boolean }> {
  const { data } = await apiClient.post(`${BASE}/threads/trash`, { accountId, threadIds });
  return data;
}

export async function trashMessage(accountId: string, messageId: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`${BASE}/messages/${messageId}`, {
    params: { accountId },
  });
  return data;
}

export async function getLabels(accountId: string): Promise<EmailLabel[]> {
  const { data } = await apiClient.get(`${BASE}/labels`, {
    params: { accountId },
  });
  return data;
}

export async function createLabel(
  accountId: string,
  body: { name: string }
): Promise<EmailLabel> {
  const { data } = await apiClient.post(`${BASE}/labels`, body, {
    params: { accountId },
  });
  return data;
}
