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
  weekOff?: string[];
  holidays?: string[];
  /** Populated when fetching a single student (e.g. for attendance detail). */
  shift?: {
    id?: string;
    _id?: string;
    name?: string;
    description?: string;
    timezone?: string;
    startTime?: string;
    endTime?: string;
    isActive?: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithoutStudentProfile {
  id: string;
  name: string;
  email: string;
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

export interface UsersWithoutStudentProfileResponse {
  results: UserWithoutStudentProfile[];
}

export async function getUsersWithoutStudentProfile(): Promise<UsersWithoutStudentProfileResponse> {
  const { data } = await apiClient.get<UsersWithoutStudentProfileResponse>(
    "/training/students/users-without-profile"
  );
  return data;
}

export async function createStudentFromUser(userId: string): Promise<Student> {
  const { data } = await apiClient.post<Student>("/training/students/from-user", { userId });
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

/** Valid week-off day names for attendance calendar */
export const WEEK_OFF_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export interface WeekOffUpdateResponse {
  success: boolean;
  message: string;
  data?: { updatedCount: number; students?: Student[] };
}

/**
 * Update week-off calendar for multiple students (requires students.manage).
 */
export async function updateWeekOffCalendar(
  studentIds: string[],
  weekOff: string[]
): Promise<WeekOffUpdateResponse> {
  const { data } = await apiClient.post<WeekOffUpdateResponse>("/training/students/week-off", {
    studentIds,
    weekOff,
  });
  return data;
}

export interface ImportWeekOffEntry {
  email: string;
  weekOff: string[];
  notes?: string;
}

export interface ImportWeekOffResponse {
  success: boolean;
  message: string;
  data: { updatedCount: number; skipped: { email: string; reason: string }[] };
}

/**
 * Bulk import week-off by candidate email (e.g. from Excel). POST /training/students/week-off/import
 */
export async function importWeekOffBulk(
  entries: ImportWeekOffEntry[]
): Promise<ImportWeekOffResponse> {
  const { data } = await apiClient.post<ImportWeekOffResponse>(
    "/training/students/week-off/import",
    { entries }
  );
  return data;
}

export interface StudentWeekOffResponse {
  studentId: string;
  studentName: string;
  studentEmail: string;
  weekOff: string[];
}

/**
 * Get week-off days for a student.
 */
export async function getStudentWeekOff(studentId: string): Promise<StudentWeekOffResponse> {
  const { data } = await apiClient.get<StudentWeekOffResponse>(
    `/training/students/${studentId}/week-off`
  );
  return data;
}

/**
 * Assign shift to multiple students.
 * POST /training/students/assign-shift
 */
export async function assignShiftToStudents(
  studentIds: string[],
  shiftId: string
): Promise<{ success: boolean; message?: string; data?: { updatedCount: number } }> {
  const { data } = await apiClient.post<{ success: boolean; message?: string; data?: { updatedCount: number } }>(
    "/training/students/assign-shift",
    { studentIds, shiftId }
  );
  return data;
}
