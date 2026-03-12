"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";
import { useAuth } from "@/shared/contexts/auth-context";

/** attendance.assign = students.manage OR attendance.manage - agent-visible links */
function hasAttendanceAssign(permissions: string[], isAdministrator: boolean): boolean {
  if (isAdministrator) return true;
  const hasStudentsManage = permissions.some((p) => p === "students.manage" || p.startsWith("students.manage"));
  const hasAttendanceManage = permissions.some(
    (p) =>
      p === "attendance.manage" ||
      p === "training.attendance:view,create,edit" ||
      (p.includes("training.attendance") && (p.includes("create") || p.includes("edit") || p.includes("view")))
  );
  return hasStudentsManage || hasAttendanceManage;
}

/** Admin only: students.manage - system-level config (holidays list, student groups, manage shifts) */
function hasStudentsManage(permissions: string[], isAdministrator: boolean): boolean {
  if (isAdministrator) return true;
  return permissions.some((p) => p === "students.manage" || p.startsWith("students.manage"));
}

const ATTENDANCE_LINKS: {
  href: string;
  label: string;
  /** 'assign' = agent-visible (attendance.assign); 'admin' = admin-only (students.manage) */
  access: "assign" | "admin";
}[] = [
  { href: ROUTES.settingsAttendanceWeekOff, label: "Manage Week Off", access: "assign" },
  { href: ROUTES.settingsAttendanceHolidays, label: "Holidays List", access: "admin" },
  { href: ROUTES.settingsAttendanceAssignHolidays, label: "Assign Holidays", access: "assign" },
  { href: ROUTES.settingsAttendanceCandidateGroups, label: "Student Groups", access: "admin" },
  { href: ROUTES.settingsAttendanceManageShifts, label: "Manage Shifts", access: "admin" },
  { href: ROUTES.settingsAttendanceAssignShift, label: "Assign Shift", access: "assign" },
  { href: ROUTES.settingsAttendanceAssignLeave, label: "Assign Leave", access: "assign" },
  { href: ROUTES.settingsAttendanceLeaveRequests, label: "Leave Requests", access: "assign" },
  { href: ROUTES.settingsAttendanceBackdated, label: "Backdated Attendance", access: "assign" },
];

export default function SettingsAttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const { permissions, isAdministrator } = useAuth();
  const canAssign = hasAttendanceAssign(permissions, isAdministrator);
  const canAdmin = hasStudentsManage(permissions, isAdministrator);

  const visibleLinks = ATTENDANCE_LINKS.filter((link) =>
    link.access === "assign" ? canAssign : canAdmin
  );

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="xl:col-span-3 col-span-12">
        <div className="box">
          <div className="box-header">
            <div className="box-title text-[0.875rem]">Attendance</div>
          </div>
          <div className="box-body p-0">
            <nav className="flex flex-col" aria-label="Attendance settings">
              {visibleLinks.map(({ href, label }) => {
                const isActive =
                  pathname === href || pathname.replace(/\/$/, "") === href.replace(/\/$/, "");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`block px-4 py-2.5 text-[0.8125rem] font-medium border-b border-defaultborder last:border-b-0 ${
                      isActive
                        ? "bg-primary/10 text-primary border-s-2 border-s-primary"
                        : "text-defaulttextcolor hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
      <div className="xl:col-span-9 col-span-12">{children}</div>
    </div>
  );
}
