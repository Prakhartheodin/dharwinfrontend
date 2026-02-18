"use client";

import { apiClient } from "@/shared/lib/api/client";

const BASE = "/shifts";

export interface Shift {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  timezone: string;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getAllShifts(params?: {
  name?: string;
  timezone?: string;
  isActive?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: { results: Shift[]; totalPages: number; totalResults: number } }> {
  const search = new URLSearchParams();
  if (params?.name) search.set("name", params.name);
  if (params?.timezone) search.set("timezone", params.timezone);
  if (params?.isActive !== undefined) search.set("isActive", String(params.isActive));
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.page != null) search.set("page", String(params.page));
  const qs = search.toString();
  const { data } = await apiClient.get<{ success: boolean; data: { results: Shift[]; totalPages: number; totalResults: number } }>(
    qs ? `${BASE}?${qs}` : BASE
  );
  return data as { data: { results: Shift[]; totalPages: number; totalResults: number } };
}

export async function createShift(body: {
  name: string;
  description?: string;
  timezone: string;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}): Promise<{ data: Shift }> {
  const { data } = await apiClient.post<{ success: boolean; data: Shift }>(BASE, body);
  return data as { data: Shift };
}

export type ShiftCreatePayload = {
  name: string;
  description?: string;
  timezone: string;
  startTime: string;
  endTime: string;
  isActive?: boolean;
};

/** Bulk create shifts (1–100). Backend accepts array. */
export async function createShiftsBulk(
  shifts: ShiftCreatePayload[]
): Promise<{ data: Shift[]; message?: string; errors?: { index: number; error: string }[] }> {
  const res = await apiClient.post<{
    success: boolean;
    message?: string;
    data: Shift | Shift[];
    errors?: { index: number; error: string }[];
    partialSuccess?: boolean;
  }>(BASE, shifts);
  const data = res.data ?? (res as unknown as { data?: Shift | Shift[] }).data;
  const arr = Array.isArray(data) ? data : data ? [data] : [];
  return {
    data: arr as Shift[],
    message: (res as { message?: string }).message,
    errors: (res as { errors?: { index: number; error: string }[] }).errors,
  };
}

export async function getShiftById(shiftId: string): Promise<{ data: Shift }> {
  const { data } = await apiClient.get<{ success: boolean; data: Shift }>(`${BASE}/${shiftId}`);
  return data as { data: Shift };
}

export async function updateShift(
  shiftId: string,
  updates: Partial<Pick<Shift, "name" | "description" | "timezone" | "startTime" | "endTime" | "isActive">>
): Promise<{ data: Shift }> {
  const { data } = await apiClient.patch<{ success: boolean; data: Shift }>(`${BASE}/${shiftId}`, updates);
  return data as { data: Shift };
}

export async function deleteShift(shiftId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${shiftId}`);
}
