"use client";

import { apiClient } from "@/shared/lib/api/client";

const BASE = "/support-tickets";

export interface CreateTicketData {
  title: string;
  description: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  category?: string;
  attachments?: File[];
  candidateId?: string;
}

export interface UpdateTicketData {
  status?: "Open" | "In Progress" | "Resolved" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Urgent";
  category?: string;
  assignedTo?: string;
}

export interface TicketFilters {
  status?: "Open" | "In Progress" | "Resolved" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Urgent";
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

export interface SupportTicketListResponse {
  results: SupportTicket[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface SupportTicket {
  id?: string;
  _id?: string;
  ticketId?: string;
  title: string;
  description: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  priority: "Low" | "Medium" | "High" | "Urgent";
  category?: string;
  createdBy?: { id?: string; _id?: string; name?: string; email?: string; role?: string; subRole?: string };
  candidate?: { id?: string; _id?: string; fullName?: string; email?: string };
  assignedTo?: { id?: string; _id?: string; name?: string; email?: string; role?: string; subRole?: string } | null;
  comments?: SupportTicketComment[];
  attachments?: SupportTicketAttachment[];
  resolvedAt?: string;
  resolvedBy?: { id?: string; name?: string; email?: string };
  closedAt?: string;
  closedBy?: { id?: string; name?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface SupportTicketComment {
  id?: string;
  _id?: string;
  content: string;
  commentedBy: { id?: string; _id?: string; name?: string; email?: string; role?: string; subRole?: string };
  isAdminComment?: boolean;
  attachments?: SupportTicketAttachment[];
  createdAt?: string;
}

export interface SupportTicketAttachment {
  key: string;
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt?: string;
}

export async function createSupportTicket(ticketData: CreateTicketData): Promise<SupportTicket> {
  if (ticketData.attachments && ticketData.attachments.length > 0) {
    const formData = new FormData();
    formData.append("title", ticketData.title);
    formData.append("description", ticketData.description);
    if (ticketData.priority) formData.append("priority", ticketData.priority);
    if (ticketData.category) formData.append("category", ticketData.category);
    if (ticketData.candidateId) formData.append("candidateId", ticketData.candidateId);
    ticketData.attachments.forEach((file) => formData.append("attachments", file));
    const { data } = await apiClient.post<SupportTicket>(BASE, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }
  const { data } = await apiClient.post<SupportTicket>(BASE, {
    title: ticketData.title,
    description: ticketData.description,
    priority: ticketData.priority,
    category: ticketData.category,
    ...(ticketData.candidateId && { candidateId: ticketData.candidateId }),
  });
  return data;
}

export async function getAllSupportTickets(filters?: TicketFilters): Promise<SupportTicketListResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.priority) params.append("priority", filters.priority);
  if (filters?.category) params.append("category", filters.category);
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.limit) params.append("limit", String(filters.limit));
  if (filters?.sortBy) params.append("sortBy", filters.sortBy);
  const query = params.toString();
  const url = query ? `${BASE}?${query}` : BASE;
  const { data } = await apiClient.get<SupportTicketListResponse>(url);
  return data;
}

export async function getSupportTicketById(ticketId: string): Promise<SupportTicket> {
  const { data } = await apiClient.get<SupportTicket>(`${BASE}/${ticketId}`);
  return data;
}

export async function updateSupportTicket(ticketId: string, updateData: UpdateTicketData): Promise<SupportTicket> {
  const { data } = await apiClient.patch<SupportTicket>(`${BASE}/${ticketId}`, updateData);
  return data;
}

export async function addCommentToTicket(
  ticketId: string,
  content: string,
  attachments?: File[]
): Promise<SupportTicket> {
  if (attachments && attachments.length > 0) {
    const formData = new FormData();
    formData.append("content", content);
    attachments.forEach((file) => formData.append("attachments", file));
    const { data } = await apiClient.post<SupportTicket>(`${BASE}/${ticketId}/comments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }
  const { data } = await apiClient.post<SupportTicket>(`${BASE}/${ticketId}/comments`, { content });
  return data;
}

export async function deleteSupportTicket(ticketId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${ticketId}`);
}
