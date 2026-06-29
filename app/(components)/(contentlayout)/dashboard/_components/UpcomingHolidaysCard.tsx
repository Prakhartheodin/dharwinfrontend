"use client";

import Link from "next/link";
import type { AssignedHolidayItem } from "@/shared/lib/api/attendance";

function formatHolidayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function formatHolidayRange(item: AssignedHolidayItem): string {
  const start = formatHolidayDate(item.date);
  if (!item.endDate) return start;
  const end = formatHolidayDate(item.endDate);
  return start === end ? start : `${start} – ${end}`;
}

function daysUntil(iso: string): number | null {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((day.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

type Props = {
  loading?: boolean;
  todayIsHoliday?: boolean;
  todayHolidayTitle?: string | null;
  holidays: AssignedHolidayItem[];
  /** Show the "Manage" link — only staff who can manage holidays; hidden for plain employees. */
  showManage?: boolean;
};

export default function UpcomingHolidaysCard({
  loading = false,
  todayIsHoliday = false,
  todayHolidayTitle,
  holidays,
  showManage = false,
}: Props) {
  return (
    <div className="box overflow-hidden border-0 shadow-sm bg-gradient-to-br from-primary/5 via-transparent to-warning/5 dark:from-primary/10 dark:to-warning/10">
      <div className="box-header justify-between flex-shrink-0 border-b border-black/5 dark:border-white/10 !pb-3">
        <div className="flex items-center gap-2">
          <span className="avatar avatar-sm avatar-rounded bg-primary/15 text-primary">
            <i className="ti ti-calendar-event text-[1rem]" aria-hidden />
          </span>
          <div>
            <div className="box-title mb-0">Upcoming Holidays</div>
            <p className="text-[0.7rem] text-[#8c9097] dark:text-white/50 mb-0">Assigned to you</p>
          </div>
        </div>
        {showManage && (
          <Link
            href="/settings/attendance/holidays/"
            className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50 hover:text-primary"
          >
            Manage
          </Link>
        )}
      </div>
      <div className="box-body !pt-3">
        {todayIsHoliday && (
          <div
            className="mb-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[0.8125rem] text-warning"
            role="status"
          >
            <span className="font-semibold">Today is a holiday</span>
            {todayHolidayTitle ? (
              <span className="text-warning/90"> — {todayHolidayTitle}. Punch in/out is disabled.</span>
            ) : (
              <span className="text-warning/90"> Punch in/out is disabled.</span>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse bg-black/5 dark:bg-white/10" />
            ))}
          </div>
        ) : holidays.length === 0 ? (
          <p className="text-[#8c9097] dark:text-white/50 text-sm mb-0">
            No upcoming holidays assigned.
          </p>
        ) : (
          <ul className="list-none space-y-2 mb-0">
            {holidays.map((h) => {
              const until = daysUntil(h.date);
              const isToday = until === 0;
              const isTomorrow = until === 1;
              const badge =
                isToday ? "Today" : isTomorrow ? "Tomorrow" : until != null && until > 0 ? `In ${until}d` : null;

              return (
                <li
                  key={h.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isToday
                      ? "bg-warning/10 border border-warning/25"
                      : "bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10"
                  }`}
                >
                  <div
                    className={`flex flex-col items-center justify-center min-w-[2.75rem] rounded-md px-1 py-1 text-center ${
                      isToday ? "bg-warning/20 text-warning" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <span className="text-[0.65rem] font-medium uppercase leading-none">
                      {new Date(h.date).toLocaleDateString("en-IN", { month: "short" })}
                    </span>
                    <span className="text-[1rem] font-bold leading-tight">
                      {new Date(h.date).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[0.875rem] mb-0 truncate">{h.title}</p>
                    <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0 truncate">
                      {formatHolidayRange(h)}
                    </p>
                  </div>
                  {badge && (
                    <span
                      className={`badge shrink-0 ${
                        isToday ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
