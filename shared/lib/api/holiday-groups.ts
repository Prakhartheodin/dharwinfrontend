"use client";

import { apiClient } from "@/shared/lib/api/client";

const BASE = "/holiday-groups";

export interface HolidayGroupMember {
  id?: string;
  _id?: string;
  user?: { name?: string; email?: string };
}

export interface HolidayGroupHoliday {
  id?: string;
  _id?: string;
  title: string;
  date: string;
  endDate?: string | null;
  isActive?: boolean;
}

export interface HolidayGroup {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  isActive?: boolean;
  /** Number of holidays whose `group` matches this group's name (computed server-side on list). */
  holidayCount?: number;
  /** Number of member training-profiles (computed server-side). */
  memberCount?: number;
  /** Populated members (only on getHolidayGroupById). */
  members?: HolidayGroupMember[];
  /** The group's holiday dates (only on getHolidayGroupById). */
  holidays?: HolidayGroupHoliday[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ListHolidayGroupsResponse {
  success: boolean;
  data: {
    results: HolidayGroup[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
}

export async function getAllHolidayGroups(params?: {
  name?: string;
  isActive?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<ListHolidayGroupsResponse> {
  const search = new URLSearchParams();
  if (params?.name) search.set("name", params.name);
  if (params?.isActive !== undefined) search.set("isActive", String(params.isActive));
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.page != null) search.set("page", String(params.page));
  const qs = search.toString();
  const { data } = await apiClient.get<ListHolidayGroupsResponse>(qs ? `${BASE}?${qs}` : BASE);
  return data as ListHolidayGroupsResponse;
}

export async function getHolidayGroupById(groupId: string): Promise<{ data: HolidayGroup }> {
  const { data } = await apiClient.get<{ success: boolean; data: HolidayGroup }>(`${BASE}/${groupId}`);
  return data as { data: HolidayGroup };
}

export async function createHolidayGroup(body: {
  name: string;
  description?: string;
  isActive?: boolean;
  memberIds?: string[];
  holidayIds?: string[];
}): Promise<{ data: HolidayGroup }> {
  const { data } = await apiClient.post<{ success: boolean; data: HolidayGroup }>(BASE, body);
  return data as { data: HolidayGroup };
}

export async function updateHolidayGroup(
  groupId: string,
  updates: { name?: string; description?: string; isActive?: boolean; memberIds?: string[]; holidayIds?: string[] }
): Promise<{ data: HolidayGroup }> {
  const { data } = await apiClient.patch<{ success: boolean; data: HolidayGroup }>(`${BASE}/${groupId}`, updates);
  return data as { data: HolidayGroup };
}

export async function deleteHolidayGroup(groupId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${groupId}`);
}

/** Apply all of the group's holiday dates to all of its members. */
export async function assignHolidayGroup(groupId: string): Promise<{ message?: string; data?: unknown }> {
  const { data } = await apiClient.post<{ success: boolean; message?: string; data?: unknown }>(`${BASE}/${groupId}/assign`, {});
  return data as { message?: string; data?: unknown };
}

/** Remove all of the group's holiday dates from all of its members. */
export async function removeHolidayGroup(groupId: string): Promise<{ message?: string; data?: unknown }> {
  const { data } = await apiClient.post<{ success: boolean; message?: string; data?: unknown }>(`${BASE}/${groupId}/remove`, {});
  return data as { message?: string; data?: unknown };
}
