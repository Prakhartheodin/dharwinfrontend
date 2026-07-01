"use client";

import { apiClient } from "@/shared/lib/api/client";

export type Phone = {
  label?: "work" | "mobile" | "other";
  number: string;
  normalizedNumber?: string;
  isPrimary?: boolean;
};
export type LinkedTo = { type: "candidate" | "employee" | "user"; id: string } | null;
export type SuggestedLink = { type: "candidate" | "employee" | "user"; id: string; name: string } | null;

export type Contact = {
  id: string;
  tenantId: string;
  ownerId: string;
  name: string;
  phones: Phone[];
  company?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  favorite?: boolean;
  doNotCall?: boolean;
  source?: "manual" | "from_call" | "imported";
  sourceCallId?: string | null;
  linkedTo?: LinkedTo;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateContactBody = Partial<Omit<Contact, "id" | "tenantId" | "ownerId">> & {
  name: string;
  phones: Phone[];
  autoSuggestLink?: boolean;
};
export type CreateContactResponse = { contact: Contact; suggestedLink: SuggestedLink };
export type ListContactsResponse = {
  results: Contact[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
};

export async function listContacts(params?: {
  q?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<ListContactsResponse> {
  const { data } = await apiClient.get<ListContactsResponse>("/contacts", { params });
  return data;
}

export async function getContact(id: string): Promise<Contact> {
  const { data } = await apiClient.get<Contact>(`/contacts/${id}`);
  return data;
}

export async function createContact(body: CreateContactBody): Promise<CreateContactResponse> {
  const { data } = await apiClient.post<CreateContactResponse>("/contacts", body);
  return data;
}

export async function updateContact(id: string, patch: Partial<CreateContactBody>): Promise<Contact> {
  const { data } = await apiClient.patch<Contact>(`/contacts/${id}`, patch);
  return data;
}

export async function deleteContact(id: string): Promise<void> {
  await apiClient.delete(`/contacts/${id}`);
}
