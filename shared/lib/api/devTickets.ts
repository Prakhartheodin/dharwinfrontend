"use client";

import { apiClient } from "@/shared/lib/api/client";

const BASE = "/dev-tickets";

export const DEV_TICKET_LABELS = [
  "regression",
  "needs-repro",
  "good-first-bug",
  "performance",
  "security",
  "ui",
] as const;

export type DevTicketLabel = (typeof DEV_TICKET_LABELS)[number];

export const DEV_TICKET_LINK_RELS = [
  "blocks",
  "blocked-by",
  "duplicate-of",
  "relates-to",
] as const;

export type DevTicketLinkRel = (typeof DEV_TICKET_LINK_RELS)[number];

export interface CreateDevTicketData {
  title: string;
  description: string;
  stepsToReproduce?: string;
  pageUrl?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  severity?: "Minor" | "Major" | "Critical" | "Blocker";
  module?: string;
  environment?: "Staging" | "Production";
  labels?: DevTicketLabel[];
  assignedTo?: string;
  attachments?: File[];
  git?: {
    branch?: string;
    pullRequests?: { number: number; title: string; url: string }[];
    commits?: { sha: string; message: string; url: string }[];
  };
}

export interface UpdateDevTicketData {
  title?: string;
  description?: string;
  stepsToReproduce?: string;
  pageUrl?: string;
  status?: "Open" | "In Progress" | "Resolved" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Urgent";
  severity?: "Minor" | "Major" | "Critical" | "Blocker";
  module?: string;
  environment?: "Staging" | "Production";
  labels?: DevTicketLabel[];
  assignedTo?: string | null;
  git?: {
    branch?: string;
    pullRequests?: { number: number; title: string; url: string }[];
    commits?: { sha: string; message: string; url: string }[];
  };
}

export interface DevTicketFilters {
  status?: "Open" | "In Progress" | "Resolved" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Urgent";
  severity?: "Minor" | "Major" | "Critical" | "Blocker";
  module?: string;
  environment?: "Staging" | "Production";
  label?: DevTicketLabel;
  search?: string;
  scope?: "all" | "mine" | "reported" | "unassigned";
  page?: number;
  limit?: number;
  sortBy?: string;
}

export interface DevTicketListResponse {
  results: DevTicket[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ActivityEntry {
  action: string;
  field?: string;
  from?: string;
  to?: string;
  performedBy?: { id?: string; name?: string; email?: string };
  createdAt?: string;
}

export interface DevTicketUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
}

export interface DevTicketLink {
  id?: string;
  _id?: string;
  rel: DevTicketLinkRel;
  ticket?: { id?: string; _id?: string; ticketId?: string; title?: string };
}

export interface DevTicketReaction {
  emoji: string;
  users: string[];
}

export interface DevTicketComment {
  id?: string;
  _id?: string;
  content: string;
  commentedBy: DevTicketUser;
  mentions?: string[];
  reactions?: DevTicketReaction[];
  attachments?: DevTicketAttachment[];
  createdAt?: string;
}

export interface DevTicketAttachment {
  key: string;
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt?: string;
}

export interface DevTicket {
  id?: string;
  _id?: string;
  ticketId?: string;
  title: string;
  description: string;
  stepsToReproduce?: string;
  pageUrl?: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  priority: "Low" | "Medium" | "High" | "Urgent";
  severity: "Minor" | "Major" | "Critical" | "Blocker";
  module?: string;
  environment?: "Staging" | "Production";
  labels?: DevTicketLabel[];
  createdBy?: DevTicketUser;
  assignedTo?: DevTicketUser | null;
  watchers?: DevTicketUser[];
  links?: DevTicketLink[];
  git?: {
    branch?: string;
    pullRequests?: { number: number; title: string; url: string }[];
    commits?: { sha: string; message: string; url: string }[];
  };
  comments?: DevTicketComment[];
  attachments?: DevTicketAttachment[];
  activityLog?: ActivityEntry[];
  reopenCount?: number;
  reopenedAt?: string | null;
  resolvedAt?: string;
  resolvedBy?: DevTicketUser;
  closedAt?: string;
  closedBy?: DevTicketUser;
  createdAt?: string;
  updatedAt?: string;
}

export interface DevTicketTrendPoint {
  date: string;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface DevTicketAnalytics {
  totals: {
    total: number;
    open: number;
    resolved: number;
    avgResolutionMs: number;
  };
  reopen: { reopened: number; total: number; rate: number };
  statusCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  environmentCounts: Record<string, number>;
  topModules: { module: string; count: number }[];
  trend: DevTicketTrendPoint[];
  openByAssignee: { name: string; count: number }[];
  resolverLeaderboard: { name: string; count: number }[];
  oldestOpen: { ticketId: string; title: string; ageDays: number }[];
}

export interface BulkUpdateAction {
  status?: "Open" | "In Progress" | "Resolved" | "Closed";
  assignedTo?: string;
  addLabel?: DevTicketLabel;
}

export interface BulkUpdateResult {
  updated: string[];
  skipped: string[];
}

function appendFilters(params: URLSearchParams, filters?: DevTicketFilters) {
  if (!filters) return;
  if (filters.status) params.append("status", filters.status);
  if (filters.priority) params.append("priority", filters.priority);
  if (filters.severity) params.append("severity", filters.severity);
  if (filters.module) params.append("module", filters.module);
  if (filters.environment) params.append("environment", filters.environment);
  if (filters.label) params.append("label", filters.label);
  if (filters.search) params.append("search", filters.search);
  if (filters.scope) params.append("scope", filters.scope);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));
  if (filters.sortBy) params.append("sortBy", filters.sortBy);
}

export async function listDevTickets(
  filters?: DevTicketFilters,
  requestConfig?: { signal?: AbortSignal }
): Promise<DevTicketListResponse> {
  const params = new URLSearchParams();
  appendFilters(params, filters);
  const query = params.toString();
  const url = query ? `${BASE}?${query}` : BASE;
  const { data } = await apiClient.get<DevTicketListResponse>(url, requestConfig);
  return data;
}

export async function getDevTicket(id: string): Promise<DevTicket> {
  const { data } = await apiClient.get<DevTicket>(`${BASE}/${id}`);
  return data;
}

export async function createDevTicket(ticketData: CreateDevTicketData): Promise<DevTicket> {
  if (ticketData.attachments && ticketData.attachments.length > 0) {
    const formData = new FormData();
    formData.append("title", ticketData.title);
    formData.append("description", ticketData.description);
    if (ticketData.stepsToReproduce) formData.append("stepsToReproduce", ticketData.stepsToReproduce);
    if (ticketData.pageUrl) formData.append("pageUrl", ticketData.pageUrl);
    if (ticketData.priority) formData.append("priority", ticketData.priority);
    if (ticketData.severity) formData.append("severity", ticketData.severity);
    if (ticketData.module) formData.append("module", ticketData.module);
    if (ticketData.environment) formData.append("environment", ticketData.environment);
    if (ticketData.assignedTo) formData.append("assignedTo", ticketData.assignedTo);
    if (ticketData.labels?.length) formData.append("labels", JSON.stringify(ticketData.labels));
    ticketData.attachments.forEach((file) => formData.append("attachments", file));
    const { data } = await apiClient.post<DevTicket>(BASE, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }
  const { data } = await apiClient.post<DevTicket>(BASE, ticketData);
  return data;
}

export async function updateDevTicket(id: string, body: UpdateDevTicketData): Promise<DevTicket> {
  const { data } = await apiClient.patch<DevTicket>(`${BASE}/${id}`, body);
  return data;
}

export async function deleteDevTicket(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function addComment(
  id: string,
  content: string,
  attachments?: File[]
): Promise<DevTicket> {
  if (attachments && attachments.length > 0) {
    const formData = new FormData();
    formData.append("content", content);
    attachments.forEach((file) => formData.append("attachments", file));
    const { data } = await apiClient.post<DevTicket>(`${BASE}/${id}/comments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }
  const { data } = await apiClient.post<DevTicket>(`${BASE}/${id}/comments`, { content });
  return data;
}

export async function bulkUpdate(ids: string[], action: BulkUpdateAction): Promise<BulkUpdateResult> {
  const { data } = await apiClient.post<BulkUpdateResult>(`${BASE}/bulk`, { ids, action });
  return data;
}

export async function watch(id: string): Promise<DevTicket> {
  const { data } = await apiClient.post<DevTicket>(`${BASE}/${id}/watch`);
  return data;
}

export async function unwatch(id: string): Promise<DevTicket> {
  const { data } = await apiClient.delete<DevTicket>(`${BASE}/${id}/watch`);
  return data;
}

export async function linkTicket(
  id: string,
  body: { rel: DevTicketLinkRel; ticketId: string }
): Promise<DevTicket> {
  const { data } = await apiClient.post<DevTicket>(`${BASE}/${id}/links`, body);
  return data;
}

export async function unlinkTicket(id: string, linkId: string): Promise<DevTicket> {
  const { data } = await apiClient.delete<DevTicket>(`${BASE}/${id}/links/${linkId}`);
  return data;
}

export async function react(id: string, body: { commentId: string; emoji: string }): Promise<DevTicket> {
  const { data } = await apiClient.post<DevTicket>(`${BASE}/${id}/reactions`, body);
  return data;
}

export async function removeReaction(
  id: string,
  body: { commentId: string; emoji: string }
): Promise<DevTicket> {
  const { data } = await apiClient.delete<DevTicket>(`${BASE}/${id}/reactions`, { data: body });
  return data;
}

export async function updateStatus(
  id: string,
  status: "Open" | "In Progress" | "Resolved" | "Closed"
): Promise<DevTicket> {
  return updateDevTicket(id, { status });
}

function normalizeTrendPoint(row: Record<string, unknown>): DevTicketTrendPoint {
  return {
    date: String(row.date ?? ""),
    open: Number(row.open ?? row.raised ?? 0),
    inProgress: Number(row.inProgress ?? 0),
    resolved: Number(row.resolved ?? 0),
    closed: Number(row.closed ?? 0),
  };
}

export async function getDevTicketAnalytics(): Promise<DevTicketAnalytics> {
  const { data } = await apiClient.get<DevTicketAnalytics>(`${BASE}/analytics`);
  return {
    ...data,
    trend: (data.trend ?? []).map((row) => normalizeTrendPoint(row as Record<string, unknown>)),
  };
}

export const DEV_TICKETS_VIEW_PERMISSION = "devTickets.view";

export function hasDevTicketsView(permissions: string[], isPlatformSuperUser?: boolean): boolean {
  if (isPlatformSuperUser) return true;
  return permissions.includes(DEV_TICKETS_VIEW_PERMISSION);
}
