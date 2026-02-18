"use client";

import { apiClient } from "@/shared/lib/api/client";

const HOLIDAYS_BASE = "/holidays";

export interface Holiday {
  id?: string;
  _id?: string;
  title: string;
  date: string;
  /** Optional end date for multi-day festivals. When set, holiday spans [date, endDate] inclusive. */
  endDate?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListHolidaysParams {
  title?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface ListHolidaysResponse {
  success: boolean;
  data: {
    results: Holiday[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
}

export async function getAllHolidays(params?: ListHolidaysParams): Promise<ListHolidaysResponse> {
  const search = new URLSearchParams();
  if (params?.title) search.set("title", params.title);
  if (params?.date) search.set("date", params.date);
  if (params?.startDate) search.set("startDate", params.startDate);
  if (params?.endDate) search.set("endDate", params.endDate);
  if (params?.isActive !== undefined) search.set("isActive", String(params.isActive));
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.page != null) search.set("page", String(params.page));
  const qs = search.toString();
  const url = qs ? `${HOLIDAYS_BASE}?${qs}` : HOLIDAYS_BASE;
  const response = await apiClient.get<ListHolidaysResponse>(url);
  return response.data as ListHolidaysResponse;
}

export async function createHoliday(data: {
  title: string;
  date: string;
  endDate?: string | null;
  isActive?: boolean;
}): Promise<{ data: Holiday }> {
  const body: Record<string, unknown> = {
    title: data.title,
    date: new Date(data.date).toISOString(),
    isActive: data.isActive ?? true,
  };
  if (data.endDate != null && data.endDate !== "") {
    body.endDate = new Date(data.endDate).toISOString();
  } else {
    body.endDate = null;
  }
  const response = await apiClient.post<{ success: boolean; data: Holiday }>(HOLIDAYS_BASE, body);
  return response.data as { data: Holiday };
}

export async function getHolidayById(holidayId: string): Promise<{ data: Holiday }> {
  const response = await apiClient.get<{ success: boolean; data: Holiday }>(`${HOLIDAYS_BASE}/${holidayId}`);
  return response.data as { data: Holiday };
}

export async function updateHoliday(
  holidayId: string,
  updates: { title?: string; date?: string; endDate?: string | null; isActive?: boolean }
): Promise<{ data: Holiday }> {
  const body: Record<string, unknown> = { ...updates };
  if (updates.date) body.date = new Date(updates.date).toISOString();
  if (updates.endDate !== undefined) {
    body.endDate = updates.endDate != null && updates.endDate !== "" ? new Date(updates.endDate).toISOString() : null;
  }
  const response = await apiClient.patch<{ success: boolean; data: Holiday }>(`${HOLIDAYS_BASE}/${holidayId}`, body);
  return response.data as { data: Holiday };
}

export async function deleteHoliday(holidayId: string): Promise<void> {
  await apiClient.delete(`${HOLIDAYS_BASE}/${holidayId}`);
}
