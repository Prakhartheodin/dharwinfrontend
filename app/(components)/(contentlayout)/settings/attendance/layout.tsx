"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";

const ATTENDANCE_LINKS: { href: string; label: string }[] = [
  { href: ROUTES.settingsAttendanceWeekOff, label: "Manage Week Off" },
  { href: ROUTES.settingsAttendanceHolidays, label: "Holidays List" },
  { href: ROUTES.settingsAttendanceAssignHolidays, label: "Assign Holidays" },
  { href: ROUTES.settingsAttendanceCandidateGroups, label: "Student Groups" },
  { href: ROUTES.settingsAttendanceManageShifts, label: "Manage Shifts" },
  { href: ROUTES.settingsAttendanceAssignShift, label: "Assign Shift" },
  { href: ROUTES.settingsAttendanceAssignLeave, label: "Assign Leave" },
  { href: ROUTES.settingsAttendanceLeaveRequests, label: "Leave Requests" },
  { href: ROUTES.settingsAttendanceBackdated, label: "Backdated Attendance" },
];

export default function SettingsAttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="xl:col-span-3 col-span-12">
        <div className="box">
          <div className="box-header">
            <div className="box-title text-[0.875rem]">Attendance</div>
          </div>
          <div className="box-body p-0">
            <nav className="flex flex-col" aria-label="Attendance settings">
              {ATTENDANCE_LINKS.map(({ href, label }) => {
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
