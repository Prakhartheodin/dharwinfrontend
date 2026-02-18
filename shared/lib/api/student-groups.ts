"use client";

import { apiClient } from "@/shared/lib/api/client";

const BASE = "/student-groups";

export interface StudentGroup {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  students?: { id?: string; _id?: string; user?: { name?: string; email?: string } }[];
  /** Present when API omits full students list for scale (use getGroupStudents for paginated list) */
  studentCount?: number;
  holidays?: string[];
  isActive?: boolean;
  createdBy?: { name?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupStudentsParams {
  page?: number;
  limit?: number;
}

export interface GroupStudentsResponse {
  results: { id?: string; _id?: string; user?: { name?: string; email?: string } }[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function getAllStudentGroups(params?: {
  name?: string;
  isActive?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: { results: StudentGroup[]; totalPages: number; totalResults: number } }> {
  const search = new URLSearchParams();
  if (params?.name) search.set("name", params.name);
  if (params?.isActive !== undefined) search.set("isActive", String(params.isActive));
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.page != null) search.set("page", String(params.page));
  const qs = search.toString();
  const { data } = await apiClient.get<{ success: boolean; data: { results: StudentGroup[]; totalPages: number; totalResults: number } }>(
    qs ? `${BASE}?${qs}` : BASE
  );
  return data as { data: { results: StudentGroup[]; totalPages: number; totalResults: number } };
}

export async function createStudentGroup(body: {
  name: string;
  description?: string;
  studentIds?: string[];
}): Promise<{ data: StudentGroup }> {
  const { data } = await apiClient.post<{ success: boolean; data: StudentGroup }>(BASE, body);
  return data as { data: StudentGroup };
}

export async function getStudentGroupById(groupId: string): Promise<{ data: StudentGroup }> {
  const { data } = await apiClient.get<{ success: boolean; data: StudentGroup }>(`${BASE}/${groupId}`);
  return data as { data: StudentGroup };
}

export async function updateStudentGroup(
  groupId: string,
  updates: { name?: string; description?: string; studentIds?: string[]; isActive?: boolean }
): Promise<{ data: StudentGroup }> {
  const { data } = await apiClient.patch<{ success: boolean; data: StudentGroup }>(`${BASE}/${groupId}`, updates);
  return data as { data: StudentGroup };
}

export async function deleteStudentGroup(groupId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${groupId}`);
}

export async function addStudentsToGroup(groupId: string, studentIds: string[]): Promise<{ data: StudentGroup }> {
  const { data } = await apiClient.post<{ success: boolean; data: StudentGroup }>(`${BASE}/${groupId}/students`, {
    studentIds,
  });
  return data as { data: StudentGroup };
}

export async function removeStudentsFromGroup(groupId: string, studentIds: string[]): Promise<{ data: StudentGroup }> {
  const { data } = await apiClient.post<{ success: boolean; data: StudentGroup }>(
    `${BASE}/${groupId}/students/remove`,
    { studentIds }
  );
  return data as { data: StudentGroup };
}

export async function assignHolidaysToGroup(groupId: string, holidayIds: string[]): Promise<unknown> {
  const { data } = await apiClient.post<unknown>(`${BASE}/${groupId}/holidays`, { holidayIds });
  return data as unknown;
}

export async function removeHolidaysFromGroup(groupId: string, holidayIds: string[]): Promise<unknown> {
  const { data } = await apiClient.delete<unknown>(`${BASE}/${groupId}/holidays`, { data: { holidayIds } });
  return data as unknown;
}

export async function getGroupStudents(
  groupId: string,
  params?: GroupStudentsParams
): Promise<{ data: GroupStudentsResponse }> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  const { data } = await apiClient.get<{ success: boolean; data: GroupStudentsResponse }>(
    qs ? `${BASE}/${groupId}/students?${qs}` : `${BASE}/${groupId}/students`
  );
  return data as { data: GroupStudentsResponse };
}
