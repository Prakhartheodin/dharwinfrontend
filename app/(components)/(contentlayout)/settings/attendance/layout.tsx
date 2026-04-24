"use client";

import { usePathname } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";
import { useAuth } from "@/shared/contexts/auth-context";

const sidebarStyles = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
    .attendance-sidebar { font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif; }
  `}</style>
);

const NAV_ICONS: Record<string, string> = {
  [ROUTES.settingsAttendanceWeekOff]: "ri-calendar-schedule-line",
  [ROUTES.settingsAttendanceHolidays]: "ri-calendar-event-line",
  [ROUTES.settingsAttendanceAssignHolidays]: "ri-calendar-check-line",
  [ROUTES.settingsAttendanceCandidateGroups]: "ri-group-line",
  [ROUTES.settingsAttendanceManageShifts]: "ri-time-line",
  [ROUTES.settingsAttendanceAssignShift]: "ri-user-add-line",
  [ROUTES.settingsAttendanceAssignLeave]: "ri-calendar-todo-line",
  [ROUTES.settingsAttendanceLeaveRequests]: "ri-file-list-3-line",
  [ROUTES.settingsAttendanceBackdated]: "ri-calendar-2-line",
};

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
    <>
      {sidebarStyles}
      <div className="grid grid-cols-12 gap-6 attendance-sidebar">
        {/*
          Must stack above react-select menuPortal (e.g. week-off / assign use z-index 10000 on document.body);
          otherwise the last items in this nav can be unclickable when a portal is active or leaves a high-z layer.
        */}
        <div className="xl:col-span-3 col-span-12 relative z-[10050] min-w-0">
          <aside
            className="pointer-events-auto rounded-2xl border border-defaultborder/70 bg-white dark:bg-bodybg shadow-sm shadow-black/[0.03] dark:shadow-none overflow-hidden sticky top-4 isolate"
            aria-label="Attendance navigation"
          >
            <div className="px-5 py-4 border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white dark:from-white/[0.03] dark:to-transparent">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20"
                  aria-hidden
                >
                  <i className="ri-calendar-line text-xl" />
                </span>
                <h2 className="text-base font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                  Attendance
                </h2>
              </div>
            </div>
            <nav className="pointer-events-auto relative z-[10051] p-2 pb-2.5" aria-label="Attendance settings">
              {/*
                Native <a> forces a full document navigation. Next.js <Link> soft navigation
                can fail to swap the page slot in this nested settings layout; full navigation is reliable.
              */}
              {visibleLinks.map(({ href, label }) => {
                const isActive =
                  pathname === href || pathname.replace(/\/$/, "") === href.replace(/\/$/, "");
                const icon = NAV_ICONS[href] ?? "ri-arrow-right-s-line";
                return (
                  <a
                    key={href}
                    href={href}
                    onClick={(e) => {
                      if (e.defaultPrevented) return;
                      if (e.button !== 0) return;
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                      e.preventDefault();
                      window.location.assign(href);
                    }}
                    className={`relative z-0 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 pointer-events-auto ${
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-defaulttextcolor/80 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-defaulttextcolor"
                    }`}
                  >
                    <i
                      className={`${icon} text-lg shrink-0 ${
                        isActive ? "text-primary" : "text-defaulttextcolor/60"
                      }`}
                    />
                    <span className="truncate">{label}</span>
                    {isActive && (
                      <span
                        className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                        aria-hidden
                      />
                    )}
                  </a>
                );
              })}
            </nav>
          </aside>
        </div>
        <div className="xl:col-span-9 col-span-12 min-w-0">
          {children}
        </div>
      </div>
    </>
  );
}
