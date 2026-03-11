"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface PunchStatusResponse {
  success: boolean;
  isPunchedIn: boolean;
  record: {
    id: string;
    punchIn: string;
    timezone: string;
    date: string;
  } | null;
}

export interface AttendanceRecord {
  id: string;
  student: string;
  studentEmail?: string;
  date: string;
  day?: string;
  punchIn: string;
  punchOut: string | null;
  duration: number | null;
  timezone?: string;
  notes?: string;
  status: string;
  isActive?: boolean;
}

export interface ListAttendanceParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}

export interface ListAttendanceResponse {
  results: AttendanceRecord[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface AttendanceStatistics {
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  totalHoursWeek?: number;
  totalHoursMonth?: number;
  averageSessionMinutes?: number | null;
  latePunchInCount?: number;
  earlyPunchOutCount?: number;
}

export interface PunchInBody {
  punchInTime?: string;
  notes?: string;
  timezone?: string;
}

export interface PunchOutBody {
  punchOutTime?: string;
  notes?: string;
}

export async function punchInAttendance(
  studentId: string,
  body?: PunchInBody
): Promise<{ success: boolean; data: AttendanceRecord }> {
  const { data } = await apiClient.post<{ success: boolean; data: AttendanceRecord }>(
    `/training/attendance/punch-in/${studentId}`,
    body ?? {}
  );
  return data;
}

export async function punchOutAttendance(
  studentId: string,
  body?: PunchOutBody
): Promise<{ success: boolean; data: AttendanceRecord }> {
  const { data } = await apiClient.post<{ success: boolean; data: AttendanceRecord }>(
    `/training/attendance/punch-out/${studentId}`,
    body ?? {}
  );
  return data;
}

/**
 * Get current user's student profile for attendance (punch in/out).
 * Auto-creates Student for Candidate, Agent, and other non-admin roles.
 * Returns null if user is admin (admins don't fill attendance for themselves).
 */
export async function getMyStudentForAttendance(): Promise<{ id: string; user: { id: string; name: string; email: string }; [key: string]: unknown } | null> {
  try {
    const { data } = await apiClient.get<{ id: string; user: { id: string; name: string; email: string }; [key: string]: unknown }>(
      "/training/attendance/me"
    );
    return data;
  } catch {
    return null;
  }
}

export async function getPunchInOutStatus(studentId: string): Promise<PunchStatusResponse> {
  const { data } = await apiClient.get<PunchStatusResponse>(
    `/training/attendance/status/${studentId}`
  );
  return data;
}

export async function listAttendance(
  studentId: string,
  params?: ListAttendanceParams
): Promise<ListAttendanceResponse> {
  const { data } = await apiClient.get<ListAttendanceResponse>(
    `/training/attendance/student/${studentId}`,
    { params }
  );
  return data;
}

export async function getAttendanceStatistics(
  studentId: string,
  params?: { startDate?: string; endDate?: string }
): Promise<AttendanceStatistics> {
  const { data } = await apiClient.get<AttendanceStatistics>(
    `/training/attendance/statistics/${studentId}`,
    { params }
  );
  return data;
}

export interface AttendanceTrackItem {
  studentId: string;
  studentName: string;
  email: string;
  isPunchedIn: boolean;
  punchIn: string | null;
  punchOut: string | null;
  timezone: string;
  durationMs: number | null;
}

export interface AttendanceTrackResponse {
  results: AttendanceTrackItem[];
}

export async function getAttendanceTrackList(): Promise<AttendanceTrackResponse> {
  const { data } = await apiClient.get<AttendanceTrackResponse>("/training/attendance/track");
  return data;
}

export interface AttendanceTrackHistoryItem {
  id: string;
  studentId: string | null;
  studentExists?: boolean;
  studentName: string;
  email: string;
  date: string;
  day?: string;
  punchIn: string | null;
  punchOut: string | null;
  durationMs: number | null;
  timezone: string;
}

export interface AttendanceTrackHistoryParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface AttendanceTrackHistoryResponse {
  results: AttendanceTrackHistoryItem[];
}

export async function getAttendanceTrackHistory(
  params?: AttendanceTrackHistoryParams
): Promise<AttendanceTrackHistoryResponse> {
  const { data } = await apiClient.get<AttendanceTrackHistoryResponse>(
    "/training/attendance/track/history",
    { params }
  );
  return data;
}

/** Response from assign/remove holidays to students */
export interface HolidayAssignmentResponse {
  success: boolean;
  message?: string;
  data?: {
    candidatesUpdated: number;
    holidaysAdded?: number;
    holidaysRemoved?: number;
    attendanceRecordsCreated?: number;
    attendanceRecordsDeleted?: number;
    createdRecords?: unknown[];
    deletedRecords?: unknown[];
    skipped?: { studentName: string; holidayTitle: string; date: string; reason: string }[];
  };
}

/**
 * Assign holidays to multiple students (creates Holiday attendance records).
 * POST /training/attendance/holidays
 */
export async function assignHolidaysToStudents(
  studentIds: string[],
  holidayIds: string[]
): Promise<HolidayAssignmentResponse> {
  const { data } = await apiClient.post<HolidayAssignmentResponse>(
    "/training/attendance/holidays",
    { studentIds, holidayIds }
  );
  return data;
}

/**
 * Remove holidays from multiple students (removes Holiday attendance records).
 * DELETE /training/attendance/holidays
 */
export async function removeHolidaysFromStudents(
  studentIds: string[],
  holidayIds: string[]
): Promise<HolidayAssignmentResponse> {
  const { data } = await apiClient.delete<HolidayAssignmentResponse>(
    "/training/attendance/holidays",
    { data: { studentIds, holidayIds } }
  );
  return data;
}

/**
 * Assign leave to multiple students (creates Attendance with status Leave).
 * POST /training/attendance/leave
 */
export async function assignLeavesToStudents(
  studentIds: string[],
  dates: string[],
  leaveType: "casual" | "sick" | "unpaid",
  notes?: string
): Promise<{ success: boolean; message?: string; data?: { attendanceRecordsCreated: number } }> {
  const { data } = await apiClient.post<{
    success: boolean;
    message?: string;
    data?: { attendanceRecordsCreated: number };
  }>("/training/attendance/leave", {
    studentIds,
    dates,
    leaveType,
    notes: notes ?? "",
  });
  return data;
}

export interface RegularizeEntry {
  date: string; // ISO date or YYYY-MM-DD
  punchIn: string; // ISO datetime
  punchOut?: string | null; // ISO datetime
  timezone?: string;
  notes?: string;
}

/**
 * Regularize attendance: admin adds back-dated attendance records for a student.
 * POST /training/attendance/student/:studentId/regularize
 */
export async function regularizeAttendance(
  studentId: string,
  attendanceEntries: RegularizeEntry[]
): Promise<{ success: boolean; message?: string; createdOrUpdated?: number; errors?: { entryIndex: number; date: string; error: string }[] }> {
  const { data } = await apiClient.post<{
    success: boolean;
    message?: string;
    createdOrUpdated?: number;
    errors?: { entryIndex: number; date: string; error: string }[];
  }>(`/training/attendance/student/${studentId}/regularize`, {
    attendanceEntries,
  });
  return data;
}
