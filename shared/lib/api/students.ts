"use client";

import { apiClient } from "@/shared/lib/api/client";

/**
 * Download students as an .xlsx file. Mirrors the active list filters
 * (status / position / search) so the export matches what's on screen.
 */
export async function exportStudentsExcel(
  params: ListStudentsParams = {}
): Promise<{ blob: Blob; capped: boolean; totalResults?: number; exportMax?: number }> {
  const query: Record<string, string | number> = {};
  if (params.status) query.status = params.status;
  if (params.position) query.position = params.position;
  if (params.search) query.search = params.search;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.names?.length) query.names = params.names.join(",");
  if (params.skills?.length) query.skills = params.skills.join(",");
  if (params.education?.length) query.education = params.education.join(",");
  if (params.email) query.email = params.email;
  if (params.experienceMin != null) query.experienceMin = params.experienceMin;
  if (params.experienceMax != null) query.experienceMax = params.experienceMax;
  if (params.studentRoleOnly != null) query.studentRoleOnly = params.studentRoleOnly;

  const res = await apiClient.get<Blob>("/training/students/export", {
    params: query,
    responseType: "blob",
  });

  const capped = res.headers["x-export-capped"] === "true";
  const totalResults = res.headers["x-export-total-results"]
    ? Number(res.headers["x-export-total-results"])
    : undefined;
  const exportMax = res.headers["x-export-max-rows"]
    ? Number(res.headers["x-export-max-rows"])
    : undefined;

  return { blob: res.data, capped, totalResults, exportMax };
}

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleIds: string[];
  status: string;
  isEmailVerified: boolean;
  phoneNumber?: string | null;
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
  institute?: string;
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
  /** String names, or person-profile objects `{ name, level }`. */
  skills?: Array<string | { name?: string; level?: string }>;
  documents?: StudentDocument[];
  bio?: string | null;
  /** Candidate/Employee short bio, present when list/get overlays person profile. */
  shortBio?: string | null;
  profileImageUrl?: string | null;
  status: string;
  /** First day attendance applies (aligned with candidate joining; used in attendance UI). */
  joiningDate?: string | null;
  weekOff?: string[];
  holidays?: string[];
  /** Populated when fetching a single student (e.g. for attendance detail). */
  /** Position (Java Developer, Data Analyst, etc.) – for filtering in module assignment */
  position?: { id?: string; _id?: string; name?: string } | null;
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
  position?: string;
  search?: string;
  names?: string[];
  skills?: string[];
  education?: string[];
  email?: string;
  experienceMin?: number;
  experienceMax?: number;
  sortBy?: string;
  limit?: number;
  page?: number;
  /** Only users with the Employee RBAC role (for group pickers; excludes agents/candidates). */
  employeeRoleOnly?: boolean | "true" | "false" | "1" | "0";
  /** Exclude owners linked to resigned employee records. */
  excludeResignedEmployed?: boolean | "true" | "false" | "1" | "0";
  /** Only users with the Student RBAC role (Training students list). */
  studentRoleOnly?: boolean | "true" | "false" | "1" | "0";
}

export interface StudentFilterOptions {
  names: string[];
  skills: string[];
  education: string[];
  emails?: string[];
  experience: { min: number; max: number };
}

export interface StudentNote {
  id: string;
  student: string;
  note: string;
  visibility: "public" | "private";
  postedBy: string;
  postedByName?: string;
  createdAt: string;
  updatedAt: string;
}

function serializeListParams(params?: ListStudentsParams): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const query: Record<string, string | number | boolean> = {};
  if (params.status) query.status = params.status;
  if (params.position) query.position = params.position;
  if (params.search) query.search = params.search;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.limit != null) query.limit = params.limit;
  if (params.page != null) query.page = params.page;
  if (params.email) query.email = params.email;
  if (params.experienceMin != null) query.experienceMin = params.experienceMin;
  if (params.experienceMax != null) query.experienceMax = params.experienceMax;
  if (params.names?.length) query.names = params.names.join(",");
  if (params.skills?.length) query.skills = params.skills.join(",");
  if (params.education?.length) query.education = params.education.join(",");
  if (params.employeeRoleOnly != null) query.employeeRoleOnly = params.employeeRoleOnly;
  if (params.excludeResignedEmployed != null) query.excludeResignedEmployed = params.excludeResignedEmployed;
  if (params.studentRoleOnly != null) query.studentRoleOnly = params.studentRoleOnly;
  return query;
}

export async function listStudents(params?: ListStudentsParams): Promise<StudentsListResponse> {
  const { data } = await apiClient.get<StudentsListResponse>("/training/students", {
    params: serializeListParams(params),
  });
  return data;
}

export async function getStudentFilterOptions(
  params?: Pick<ListStudentsParams, "status" | "search" | "studentRoleOnly">
): Promise<StudentFilterOptions> {
  const { data } = await apiClient.get<StudentFilterOptions>("/training/students/filter-options", {
    params: serializeListParams(params),
  });
  return data;
}

function normalizeStudentNote(raw: StudentNote & { _id?: string }): StudentNote {
  const studentVal = raw.student as unknown;
  const student =
    studentVal && typeof studentVal === "object"
      ? String(
          (studentVal as { id?: string; _id?: string }).id ??
            (studentVal as { _id?: string })._id ??
            ""
        )
      : String(studentVal ?? "");
  return {
    ...raw,
    id: String(raw.id ?? raw._id ?? ""),
    student,
  };
}

export async function listStudentNotes(studentId: string): Promise<{ results: StudentNote[] }> {
  const { data } = await apiClient.get<{ results: StudentNote[] }>(`/training/students/${studentId}/notes`);
  return { results: (data.results ?? []).map(normalizeStudentNote) };
}

export async function createStudentNote(
  studentId: string,
  payload: { note: string; visibility: "public" | "private" }
): Promise<StudentNote> {
  const { data } = await apiClient.post<StudentNote>(`/training/students/${studentId}/notes`, payload);
  return normalizeStudentNote(data);
}

export async function deleteStudentNote(noteId: string): Promise<void> {
  await apiClient.delete(`/training/students/notes/${noteId}`);
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

export type CreateStudentFromUserOptions = {
  /**
   * When true, backend adds the Student role to the user if they own a Candidate but lack Student
   * (requires `students.manage`). Use for SOP / attendance flows so candidate-only people get a profile.
   */
  ensureStudentRoleForCandidateOwner?: boolean;
};

export async function createStudentFromUser(
  userId: string,
  options?: CreateStudentFromUserOptions
): Promise<Student> {
  const { data } = await apiClient.post<Student>("/training/students/from-user", {
    userId,
    ...(options?.ensureStudentRoleForCandidateOwner
      ? { ensureStudentRoleForCandidateOwner: true }
      : {}),
  });
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
  position?: string | null;
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
 * Returns null when the student has no uploaded profile image (HTTP 200, not 404).
 */
export async function getStudentProfileImage(
  studentId: string
): Promise<StudentProfileImageInfo | null> {
  try {
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
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw e;
  }
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

/** Short labels for week-off day pickers on narrow viewports */
export const WEEK_OFF_DAY_ABBREV: Record<(typeof WEEK_OFF_DAYS)[number], string> = {
  Sunday: "Sun",
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
};

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
 * Export people with the given week-off days as an .xlsx download.
 * GET /training/students/week-off/export?days=Saturday,Sunday
 */
export async function exportWeekOffExcel(
  days: string[]
): Promise<{ blob: Blob; rowCount: number }> {
  const res = await apiClient.get<Blob>("/training/students/week-off/export", {
    params: { days: days.join(",") },
    responseType: "blob",
  });
  const rowCount = res.headers["x-export-row-count"]
    ? Number(res.headers["x-export-row-count"])
    : 0;
  return { blob: res.data, rowCount };
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
