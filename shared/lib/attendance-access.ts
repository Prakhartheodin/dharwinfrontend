/**
 * Attendance settings access rules, shared so the nav link and the pages behind it
 * cannot drift apart.
 *
 * `attendance.assign` on the backend resolves to `students.manage` OR `attendance.manage`.
 * The Backdated Attendance page used to gate on the Administrator/Agent role name instead,
 * which let an Agent open the page and then get a 403 from Approve.
 */

/** attendance.assign = students.manage OR attendance.manage — agent-visible attendance screens. */
export function hasAttendanceAssign(permissions: string[], isAdministrator: boolean): boolean {
  if (isAdministrator) return true;
  const hasStudentsManagePermission = permissions.some(
    (p) => p === "students.manage" || p.startsWith("students.manage")
  );
  const hasAttendanceManage = permissions.some(
    (p) =>
      p === "attendance.manage" ||
      p === "training.attendance:view,create,edit" ||
      ((p.includes("training.attendance") || p.includes("settings.attendance")) &&
        (p.includes("create") || p.includes("edit") || p.includes("view")))
  );
  return hasStudentsManagePermission || hasAttendanceManage;
}

/** students.manage — system-level attendance config (holidays list, employee groups, manage shifts). */
export function hasStudentsManage(permissions: string[], isAdministrator: boolean): boolean {
  if (isAdministrator) return true;
  return permissions.some((p) => p === "students.manage" || p.startsWith("students.manage"));
}
