"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleIds: string[];
  status: string;
  isEmailVerified: boolean;
}

export interface StudentAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface StudentEducation {
  degree?: string;
  institution?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string;
}

export interface StudentExperience {
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string;
}

export interface StudentDocument {
  name: string;
  type: string;
  fileUrl?: string;
  fileKey?: string;
}

export interface Student {
  id: string;
  user: StudentUser;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: StudentAddress | null;
  education?: StudentEducation[];
  experience?: StudentExperience[];
  skills?: string[];
  documents?: StudentDocument[];
  bio?: string | null;
  profileImageUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentsListResponse {
  results: Student[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ListStudentsParams {
  status?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export async function listStudents(params?: ListStudentsParams): Promise<StudentsListResponse> {
  const { data } = await apiClient.get<StudentsListResponse>("/training/students", { params });
  return data;
}

export async function getStudent(studentId: string): Promise<Student> {
  const { data } = await apiClient.get<Student>(`/training/students/${studentId}`);
  return data;
}

export interface StudentProfileImageInfo {
  url: string;
  mimeType: string;
}

export interface UpdateStudentPayload {
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: StudentAddress;
  education?: StudentEducation[];
  experience?: StudentExperience[];
  skills?: string[];
  documents?: StudentDocument[];
  bio?: string;
  profileImageUrl?: string;
  status?: string;
}

export async function updateStudent(studentId: string, payload: UpdateStudentPayload): Promise<Student> {
  const { data } = await apiClient.patch<Student>(`/training/students/${studentId}`, payload);
  return data;
}

/**
 * Upload or replace a student's profile image.
 * Expects backend endpoint: POST /v1/training/students/:studentId/profile-image
 */
export async function uploadStudentProfileImage(studentId: string, file: File): Promise<Student> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<Student>(
    `/training/students/${studentId}/profile-image`,
    formData,
    {
      // Let Axios set the correct multipart boundary; overriding default JSON header.
      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return data;
}

/**
 * Get a short-lived presigned URL for viewing the student's profile image.
 * GET /v1/training/students/:studentId/profile-image with Accept: application/json
 */
export async function getStudentProfileImage(
  studentId: string
): Promise<StudentProfileImageInfo | null> {
  const { data } = await apiClient.get<{ success?: boolean; data?: StudentProfileImageInfo }>(
    `/training/students/${studentId}/profile-image`,
    {
      headers: { Accept: "application/json" },
    }
  );

  if (!data || (data.success === false && !data.data)) {
    return null;
  }

  return data.data ?? null;
}

export async function deleteStudent(studentId: string): Promise<void> {
  await apiClient.delete(`/training/students/${studentId}`);
}
