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

const EMAIL_BASE = "/email";
const OUTLOOK_BASE = "/outlook";

export type MailProvider = "gmail" | "outlook";

function mailBase(provider?: string): string {
  return provider === "outlook" ? OUTLOOK_BASE : EMAIL_BASE;
}

/** Gmail + Outlook accounts (merged). */
export async function getEmailAccounts(): Promise<EmailAccount[]> {
  const [gmailRes, outlookRes] = await Promise.allSettled([
    apiClient.get<EmailAccount[]>(`${EMAIL_BASE}/accounts`),
    apiClient.get<EmailAccount[]>(`${OUTLOOK_BASE}/accounts`),
  ]);
  const gmail = gmailRes.status === "fulfilled" ? gmailRes.value.data : [];
  const outlook = outlookRes.status === "fulfilled" ? outlookRes.value.data : [];
  return [...(gmail || []), ...(outlook || [])];
}

export async function getGoogleAuthUrl(): Promise<{ url: string }> {
  const { data } = await apiClient.get(`${EMAIL_BASE}/auth/google`);
  return data;
}

export async function getMicrosoftAuthUrl(): Promise<{ url: string }> {
  const { data } = await apiClient.get(`${OUTLOOK_BASE}/auth/microsoft`);
  return data;
}

export async function disconnectAccount(
  accountId: string,
  provider: MailProvider
): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`${mailBase(provider)}/accounts/${accountId}`);
  return data;
}

export async function getMessages(
  params: {
    accountId: string;
    labelId?: string;
    pageToken?: string;
    pageSize?: number;
    q?: string;
  },
  provider: MailProvider = "gmail"
): Promise<{
  messages: EmailMessageListItem[];
  nextPageToken: string | null;
  resultSizeEstimate: number;
}> {
  const { data } = await apiClient.get(`${mailBase(provider)}/messages`, { params });
  return data;
}

export async function getThreads(
  params: {
    accountId: string;
    labelId?: string;
    pageToken?: string;
    pageSize?: number;
    q?: string;
  },
  provider: MailProvider = "gmail"
): Promise<{
  threads: EmailThreadListItem[];
  nextPageToken: string | null;
  resultSizeEstimate: number;
}> {
  const { data } = await apiClient.get(`${mailBase(provider)}/threads`, { params });
  return data;
}

export async function getThread(
  accountId: string,
  threadId: string,
  provider: MailProvider = "gmail"
): Promise<{ id: string; messages: EmailMessage[] }> {
  const encodedId = encodeURIComponent(threadId);
  const { data } = await apiClient.get(`${mailBase(provider)}/threads/${encodedId}`, {
    params: { accountId },
  });
  return data;
}

export async function getMessage(
  accountId: string,
  messageId: string,
  provider: MailProvider = "gmail"
): Promise<EmailMessage> {
  const { data } = await apiClient.get(`${mailBase(provider)}/messages/${messageId}`, {
    params: { accountId },
  });
  return data;
}

export function getAttachmentUrl(
  accountId: string,
  messageId: string,
  attachmentId: string,
  provider: MailProvider = "gmail"
): string {
  const base = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "/api/v1" : "");
  const b = mailBase(provider);
  return `${base}${b}/messages/${messageId}/attachments/${attachmentId}?accountId=${accountId}`;
}

export async function sendMessage(
  body: {
    accountId: string;
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    html: string;
    attachments?: { filename: string; content: string | ArrayBuffer; mimeType?: string }[];
  },
  provider: MailProvider = "gmail"
): Promise<{ id: string; threadId?: string }> {
  const { data } = await apiClient.post(`${mailBase(provider)}/messages/send`, body);
  return data;
}

export async function replyMessage(
  messageId: string,
  body: {
    accountId: string;
    html: string;
    attachments?: { filename: string; content: string | ArrayBuffer; mimeType?: string }[];
  },
  provider: MailProvider = "gmail"
): Promise<{ id: string; threadId?: string }> {
  const { data } = await apiClient.post(`${mailBase(provider)}/messages/${messageId}/reply`, body);
  return data;
}

export async function forwardMessage(
  messageId: string,
  body: {
    accountId: string;
    to: string | string[];
    html?: string;
    attachments?: unknown[];
  },
  provider: MailProvider = "gmail"
): Promise<{ id: string; threadId?: string }> {
  const { data } = await apiClient.post(`${mailBase(provider)}/messages/${messageId}/forward`, body);
  return data;
}

export async function modifyMessage(
  accountId: string,
  messageId: string,
  body: { addLabelIds?: string[]; removeLabelIds?: string[] },
  provider: MailProvider = "gmail"
): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch(`${mailBase(provider)}/messages/${messageId}`, body, {
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
  },
  provider: MailProvider = "gmail"
): Promise<{ success: boolean; modified: number }> {
  const { data } = await apiClient.post(`${mailBase(provider)}/messages/batch-modify`, body);
  return data;
}

export async function batchModifyThreads(
  body: {
    accountId: string;
    threadIds: string[];
    addLabelIds?: string[];
    removeLabelIds?: string[];
  },
  provider: MailProvider = "gmail"
): Promise<{ success: boolean; modified: number }> {
  const { data } = await apiClient.post(`${mailBase(provider)}/threads/batch-modify`, body);
  return data;
}

export async function trashThreads(
  accountId: string,
  threadIds: string[],
  provider: MailProvider = "gmail"
): Promise<{ success: boolean }> {
  const { data } = await apiClient.post(`${mailBase(provider)}/threads/trash`, { accountId, threadIds });
  return data;
}

export async function trashMessage(
  accountId: string,
  messageId: string,
  provider: MailProvider = "gmail"
): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`${mailBase(provider)}/messages/${messageId}`, {
    params: { accountId },
  });
  return data;
}

export async function getLabels(
  accountId: string,
  provider: MailProvider = "gmail"
): Promise<EmailLabel[]> {
  const { data } = await apiClient.get(`${mailBase(provider)}/labels`, {
    params: { accountId },
  });
  return data;
}

export async function createLabel(
  accountId: string,
  body: { name: string },
  provider: MailProvider = "gmail"
): Promise<EmailLabel> {
  const { data } = await apiClient.post(`${mailBase(provider)}/labels`, body, {
    params: { accountId },
  });
  return data;
}

/** Resolve provider for API calls from account list + selected id. */
export function providerForAccount(
  accounts: Pick<EmailAccount, "id" | "provider">[],
  accountId: string | null
): MailProvider {
  if (!accountId) return "gmail";
  const a = accounts.find((x) => x.id === accountId);
  return a?.provider === "outlook" ? "outlook" : "gmail";
}

// --- Agent email templates & signatures (always `/email`, not provider-specific) ---

export interface AgentEmailTemplate {
  id: string;
  title: string;
  subject?: string;
  bodyHtml: string;
  isShared?: boolean;
  user?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentEmailTemplateShared extends AgentEmailTemplate {
  owner?: { id: string; name?: string; email?: string };
}

export interface AgentEmailSignature {
  id: string;
  user: string;
  html: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function listAgentEmailTemplates(): Promise<{
  own: AgentEmailTemplate[];
  shared: AgentEmailTemplateShared[];
}> {
  const { data } = await apiClient.get(`${EMAIL_BASE}/templates`);
  return data;
}

export async function createAgentEmailTemplate(body: {
  title: string;
  subject?: string;
  bodyHtml: string;
  isShared?: boolean;
}): Promise<AgentEmailTemplate> {
  const { data } = await apiClient.post(`${EMAIL_BASE}/templates`, body);
  return data;
}

export async function updateAgentEmailTemplate(
  templateId: string,
  body: Partial<{ title: string; subject: string; bodyHtml: string; isShared: boolean }>
): Promise<AgentEmailTemplate> {
  const { data } = await apiClient.patch(`${EMAIL_BASE}/templates/${templateId}`, body);
  return data;
}

export async function deleteAgentEmailTemplate(templateId: string): Promise<void> {
  await apiClient.delete(`${EMAIL_BASE}/templates/${templateId}`);
}

export async function getAgentEmailSignature(): Promise<AgentEmailSignature> {
  const { data } = await apiClient.get(`${EMAIL_BASE}/signature`);
  return data;
}

export async function patchAgentEmailSignature(body: {
  html?: string;
  enabled?: boolean;
}): Promise<AgentEmailSignature> {
  const { data } = await apiClient.patch(`${EMAIL_BASE}/signature`, body);
  return data;
}

/** Admin: list templates for an Agent user */
export async function adminListAgentEmailTemplates(userId: string): Promise<{ results: AgentEmailTemplate[] }> {
  const { data } = await apiClient.get(`${EMAIL_BASE}/admin/templates`, { params: { userId } });
  return data;
}

export async function adminCreateAgentEmailTemplate(body: {
  userId: string;
  title: string;
  subject?: string;
  bodyHtml: string;
  isShared?: boolean;
}): Promise<AgentEmailTemplate> {
  const { data } = await apiClient.post(`${EMAIL_BASE}/admin/templates`, body);
  return data;
}

export async function adminGetAgentEmailSignature(userId: string): Promise<AgentEmailSignature> {
  const { data } = await apiClient.get(`${EMAIL_BASE}/admin/signature`, { params: { userId } });
  return data;
}

export async function adminUpdateAgentEmailTemplate(
  templateId: string,
  body: Partial<{ title: string; subject: string; bodyHtml: string; isShared: boolean }>
): Promise<AgentEmailTemplate> {
  const { data } = await apiClient.patch(`${EMAIL_BASE}/admin/templates/${templateId}`, body);
  return data;
}

export async function adminDeleteAgentEmailTemplate(templateId: string): Promise<void> {
  await apiClient.delete(`${EMAIL_BASE}/admin/templates/${templateId}`);
}

export async function adminPatchAgentEmailSignature(body: {
  userId: string;
  html?: string;
  enabled?: boolean;
}): Promise<AgentEmailSignature> {
  const { data } = await apiClient.patch(`${EMAIL_BASE}/admin/signature`, body);
  return data;
}
