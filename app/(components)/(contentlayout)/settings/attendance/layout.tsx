"use client";

import { usePathname } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasAttendanceAssign, hasStudentsManage } from "@/shared/lib/attendance-access";

const sidebarStyles = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
    .attendance-sidebar { font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif; }
  `}</style>
);

/** App header is 3.75rem; sit just below it when the header pins. */
const STICKY_TOP = "top-[4.75rem]";

const NAV_ICONS: Record<string, string> = {
  [ROUTES.settingsAttendanceWeekOff]: "ri-calendar-schedule-line",
  [ROUTES.settingsAttendanceHolidays]: "ri-calendar-event-line",
  [ROUTES.settingsAttendanceHolidayGroups]: "ri-folder-2-line",
  [ROUTES.settingsAttendanceAssignHolidays]: "ri-calendar-check-line",
  [ROUTES.settingsAttendanceCandidateGroups]: "ri-group-line",
  [ROUTES.settingsAttendanceManageShifts]: "ri-time-line",
  [ROUTES.settingsAttendanceAssignShift]: "ri-user-add-line",
  [ROUTES.settingsAttendanceAssignLeave]: "ri-calendar-todo-line",
  [ROUTES.settingsAttendanceLeaveRequests]: "ri-file-list-3-line",
  [ROUTES.settingsAttendanceBackdated]: "ri-calendar-2-line",
};


const ATTENDANCE_LINKS: {
  href: string;
  label: string;
  /** 'assign' = agent-visible (attendance.assign); 'admin' = admin-only (students.manage) */
  access: "assign" | "admin";
}[] = [
  { href: ROUTES.settingsAttendanceWeekOff, label: "Manage Week Off", access: "assign" },
  { href: ROUTES.settingsAttendanceHolidays, label: "Holidays List", access: "admin" },
  { href: ROUTES.settingsAttendanceAssignHolidays, label: "Assign Holidays", access: "assign" },
  { href: ROUTES.settingsAttendanceCandidateGroups, label: "Employee Groups", access: "admin" },
  { href: ROUTES.settingsAttendanceManageShifts, label: "Manage Shifts", access: "admin" },
  { href: ROUTES.settingsAttendanceAssignShift, label: "Assign Shift", access: "assign" },
  { href: ROUTES.settingsAttendanceAssignLeave, label: "Assign Leave", access: "assign" },
  { href: ROUTES.settingsAttendanceLeaveRequests, label: "Leave Requests", access: "assign" },
  { href: ROUTES.settingsAttendanceBackdated, label: "Backdated Attendance", access: "assign" },
];

function pathMatches(pathname: string, href: string): boolean {
  return pathname === href || pathname.replace(/\/$/, "") === href.replace(/\/$/, "");
}

function goToAttendancePage(href: string) {
  window.location.assign(href);
}

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
  const activeHref =
    visibleLinks.find((link) => pathMatches(pathname, link.href))?.href ?? visibleLinks[0]?.href ?? "";

  return (
    <>
      {sidebarStyles}
      <div className="attendance-sidebar">
        {visibleLinks.length > 0 && (
          <div className={`xl:hidden sticky ${STICKY_TOP} z-30 mb-4`}>
            <div className="rounded-2xl border border-defaultborder/70 bg-white px-3 py-2 shadow-sm dark:bg-bodybg">
              <label htmlFor="attendance-page-switcher" className="mb-1.5 block text-xs font-semibold text-defaulttextcolor/70">
                Attendance
              </label>
              <select
                id="attendance-page-switcher"
                value={activeHref}
                onChange={(e) => goToAttendancePage(e.currentTarget.value)}
                className="ti-form-control min-h-11 w-full text-sm"
              >
                {visibleLinks.map(({ href, label }) => (
                  <option key={href} value={href}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/*
            Sub-nav sits above page content but BELOW any dialog/modal/Swal/menu portal
            so it never occludes confirmation dialogs (Swal default z-1060) or shift/leave success modals.
          */}
          <div className="relative z-30 hidden min-w-0 self-stretch xl:col-span-3 xl:block">
            <aside
              className={`pointer-events-auto sticky ${STICKY_TOP} max-h-[calc(100dvh-5.75rem)] isolate overflow-y-auto rounded-2xl border border-defaultborder/70 bg-white shadow-sm shadow-black/[0.03] dark:bg-bodybg dark:shadow-none`}
              aria-label="Attendance navigation"
            >
              <div className="border-b border-defaultborder/50 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4 dark:from-white/[0.03] dark:to-transparent">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:ring-primary/20"
                    aria-hidden
                  >
                    <i className="ri-calendar-line text-xl" />
                  </span>
                  <h2 className="text-base font-semibold tracking-tight text-defaulttextcolor dark:text-white">
                    Attendance
                  </h2>
                </div>
              </div>
              <nav className="pointer-events-auto relative z-40 p-2 pb-2.5" aria-label="Attendance settings">
                {/*
                  Native <a> forces a full document navigation. Next.js <Link> soft navigation
                  can fail to swap the page slot in this nested settings layout; full navigation is reliable.
                */}
                {visibleLinks.map(({ href, label }) => {
                  const isActive = pathMatches(pathname, href);
                  const icon = NAV_ICONS[href] ?? "ri-arrow-right-s-line";
                  return (
                    <a
                      key={href}
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={(e) => {
                        if (e.defaultPrevented) return;
                        if (e.button !== 0) return;
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                        e.preventDefault();
                        goToAttendancePage(href);
                      }}
                      className={`relative z-0 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 pointer-events-auto ${
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-defaulttextcolor/80 hover:bg-slate-50 hover:text-defaulttextcolor dark:hover:bg-white/5"
                      }`}
                    >
                      <i
                        className={`${icon} shrink-0 text-lg ${
                          isActive ? "text-primary" : "text-defaulttextcolor/60"
                        }`}
                      />
                      <span className="truncate">{label}</span>
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      )}
                    </a>
                  );
                })}
              </nav>
            </aside>
          </div>
          <div className="col-span-12 min-w-0 xl:col-span-9">{children}</div>
        </div>
      </div>
    </>
  );
}
