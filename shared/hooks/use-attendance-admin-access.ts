"use client";

import { useMemo } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasAttendanceAssign, hasStudentsManage } from "@/shared/lib/attendance-access";

export type AttendanceSettingsAccessLevel = "assign" | "admin";

/**
 * Gates Attendance settings pages using the same permission keys as the API:
 * - `assign` → `attendance.assign` (students.manage OR attendance.manage)
 * - `admin` → `students.manage` (holidays list, employee groups, shift CRUD)
 */
export function useAttendanceSettingsAccess(
  level: AttendanceSettingsAccessLevel = "assign"
): boolean | null {
  const { permissions, permissionsLoaded, isAdministrator, isPlatformSuperUser } = useAuth();
  return useMemo(() => {
    if (!permissionsLoaded) return null;
    if (isPlatformSuperUser) return true;
    return level === "admin"
      ? hasStudentsManage(permissions, isAdministrator)
      : hasAttendanceAssign(permissions, isAdministrator);
  }, [permissionsLoaded, permissions, isAdministrator, isPlatformSuperUser, level]);
}

/** @deprecated Use `useAttendanceSettingsAccess('assign' | 'admin')` instead. */
export function useAttendanceAdminAccess(): boolean | null {
  return useAttendanceSettingsAccess("assign");
}
