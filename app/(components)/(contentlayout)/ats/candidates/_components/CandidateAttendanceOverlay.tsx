"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { listAttendanceByCandidate, type AttendanceRecord } from "@/shared/lib/api/attendance";
import { getCandidate, getCandidateWeekOff } from "@/shared/lib/api/candidates";
import { getStudentWeekOff } from "@/shared/lib/api/students";
import {
  capDayTotalMs,
  countsTowardWorkedMs,
  sessionDurationMsForDisplay,
} from "@/shared/lib/attendance-display";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAME_MAP = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CALENDAR_YEAR_START = 2020;
const CALENDAR_YEAR_END = 2150;

/** Matches training student calendar when candidate.weekOff is empty (student-attendance-client isWeekOffDay). */
function effectiveWeekOffDays(weekOff: string[]): string[] {
  if (weekOff.length > 0) return weekOff;
  return ["Saturday", "Sunday"];
}

function mergeWeekOffLists(lists: string[][]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const day of list) {
      const trimmed = day.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return DAY_NAME_MAP.filter((day) => set.has(day));
}

function formatLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYmdLocal(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) {
    const d = new Date(ymd);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function parseCalendarDayLocal(raw: string | null | undefined): Date | null {
  if (raw == null || String(raw).trim() === "") return null;
  const ymd = String(raw).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return parseYmdLocal(ymd);
}

function getLocalDateKey(isoDateStr: string): string {
  if (!isoDateStr) return "";
  const d = new Date(isoDateStr);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getHolidayNameFromNotes(notes?: string): string {
  if (!notes) return "";
  const m = notes.match(/holiday:\s*([^\n]+)/i);
  return m?.[1]?.trim() ?? "";
}

function getLeaveTypeFromRecord(r: { leaveType?: string | null; notes?: string | null }): string {
  if (r.leaveType) return r.leaveType;
  const n = r.notes ?? "";
  const m = n.match(/leaveType:\s*(\w+)/i);
  return m?.[1] ?? "";
}

function formatLeaveLabel(leaveType: string): string {
  const t = leaveType?.toLowerCase() ?? "";
  if (t === "casual") return "Casual leave";
  if (t === "sick") return "Sick leave";
  if (t === "unpaid") return "Unpaid leave";
  return leaveType ? leaveType.charAt(0).toUpperCase() + leaveType.slice(1) : "Leave";
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export interface CandidateAttendanceOverlayProps {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
}

export default function CandidateAttendanceOverlay({
  open,
  onClose,
  candidateId,
  candidateName,
}: CandidateAttendanceOverlayProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [weekOff, setWeekOff] = useState<string[]>([]);
  const [linkedStudentId, setLinkedStudentId] = useState<string | null>(null);
  const [joiningDateStart, setJoiningDateStart] = useState<Date | null>(null);
  const [resignDateEnd, setResignDateEnd] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !candidateId) return;
    let cancelled = false;
    (async () => {
      const parts: string[][] = [];
      try {
        const candidateWeekOff = await getCandidateWeekOff(candidateId);
        parts.push(candidateWeekOff.weekOff ?? []);
      } catch {
        parts.push([]);
      }
      if (linkedStudentId) {
        try {
          const studentWeekOff = await getStudentWeekOff(linkedStudentId);
          parts.push(studentWeekOff.weekOff ?? []);
        } catch {
          parts.push([]);
        }
      }
      if (!cancelled) {
        setWeekOff(mergeWeekOffLists(parts));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, candidateId, linkedStudentId]);

  useEffect(() => {
    if (!open || !candidateId?.trim()) {
      setJoiningDateStart(null);
      setResignDateEnd(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const c = await getCandidate(candidateId);
        if (!cancelled) {
          setLinkedStudentId(c.studentId ?? null);
          setJoiningDateStart(parseCalendarDayLocal(c.joiningDate ?? undefined));
          setResignDateEnd(parseCalendarDayLocal(c.resignDate ?? undefined));
        }
      } catch {
        if (!cancelled) {
          setLinkedStudentId(null);
          setJoiningDateStart(null);
          setResignDateEnd(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, candidateId]);

  const monthRange = useMemo(() => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      startDate: formatLocalYmd(start),
      endDate: formatLocalYmd(end),
    };
  }, [year, month]);

  const fetchMonth = useCallback(async () => {
    const cid = candidateId?.trim();
    if (!cid) {
      setRecords([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listAttendanceByCandidate(cid, {
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
        limit: 500,
        page: 1,
      });
      setRecords(res.results ?? []);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (e as Error)?.message ??
        "Could not load attendance";
      setError(msg);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [candidateId, monthRange.startDate, monthRange.endDate]);

  useEffect(() => {
    if (!open || !candidateId?.trim()) return;
    fetchMonth();
  }, [open, candidateId, fetchMonth]);

  const calendarCells = useMemo(() => {
    const weekOffSet = new Set(effectiveWeekOffDays(weekOff).map((d) => d.trim()));
    const byDate: Record<
      string,
      {
        present: boolean;
        incomplete: boolean;
        holiday: boolean;
        leave: boolean;
        leaveType: string;
        absent: boolean;
        totalMs: number;
        holidayName: string;
      }
    > = {};

    records.forEach((r) => {
      const dateKey = getLocalDateKey(r.date ?? "");
      if (!dateKey) return;

      // Skip records before joining date
      if (joiningDateStart) {
        const recDate = new Date(dateKey + "T00:00:00");
        if (recDate.getTime() < joiningDateStart.getTime()) return;
      }

      const hasOut = !!r.punchOut;
      const ms = sessionDurationMsForDisplay(r);
      const recStatus = r.status;
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          present: false,
          incomplete: false,
          holiday: false,
          leave: false,
          leaveType: "",
          absent: false,
          totalMs: 0,
          holidayName: "",
        };
      }
      if (recStatus === "Holiday") {
        byDate[dateKey].holiday = true;
        byDate[dateKey].holidayName = getHolidayNameFromNotes(r.notes) || "Holiday";
      } else if (recStatus === "Leave") {
        byDate[dateKey].leave = true;
        byDate[dateKey].leaveType = getLeaveTypeFromRecord(r);
      } else if (recStatus === "Absent") {
        byDate[dateKey].absent = true;
      } else if (hasOut) {
        byDate[dateKey].present = true;
        byDate[dateKey].totalMs += ms;
      } else {
        byDate[dateKey].incomplete = true;
      }
    });

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const cells: Array<{
      day: number;
      date: Date;
      present: boolean;
      incomplete: boolean;
      holiday: boolean;
      leave: boolean;
      leaveType: string;
      absent: boolean;
      weekOff: boolean;
      beforeJoining: boolean;
      afterResign: boolean;
      totalHours: number;
      holidayName: string;
    }> = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({
        day: 0,
        date: new Date(year, month, -startDayOfWeek + 1 + i),
        present: false,
        incomplete: false,
        holiday: false,
        leave: false,
        leaveType: "",
        absent: false,
        weekOff: false,
        beforeJoining: false,
        afterResign: false,
        totalHours: 0,
        holidayName: "",
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const info = byDate[dateKey] ?? {
        present: false,
        incomplete: false,
        holiday: false,
        leave: false,
        leaveType: "",
        absent: false,
        totalMs: 0,
        holidayName: "",
      };
      const dayName = DAY_NAME_MAP[date.getDay()];
      const beforeJoining =
        joiningDateStart != null && date.getTime() < joiningDateStart.getTime();
      const afterResign =
        resignDateEnd != null && date.getTime() > resignDateEnd.getTime();
      const inactiveEmployment = beforeJoining || afterResign;
      const isScheduledWeekOff =
        !inactiveEmployment &&
        weekOffSet.has(dayName);
      const isPast = date < todayStart;
      const isTodayCell = date.getTime() === todayStart.getTime();
      const inferredAbsent =
        !inactiveEmployment &&
        isPast &&
        !isTodayCell &&
        !isScheduledWeekOff &&
        !info.holiday &&
        !info.leave &&
        !info.present &&
        !info.incomplete;
      const cellAbsent =
        !inactiveEmployment && !isScheduledWeekOff && (info.absent || inferredAbsent);
      const displayMs = inactiveEmployment || info.holiday || info.leave ? 0 : capDayTotalMs(info.totalMs);
      cells.push({
        day,
        date,
        present: inactiveEmployment ? false : info.present,
        incomplete: inactiveEmployment ? false : info.incomplete && !info.present,
        holiday: info.holiday,
        leave: info.leave,
        leaveType: info.leaveType,
        absent: cellAbsent,
        weekOff: isScheduledWeekOff,
        beforeJoining,
        afterResign,
        totalHours: Math.round((displayMs / 3600000) * 100) / 100,
        durationLabel: displayMs > 0 ? formatDuration(displayMs) : "",
        holidayName: info.holidayName,
      });
    }
    return cells;
  }, [records, year, month, weekOff, joiningDateStart, resignDateEnd]);

  const monthSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let presentDays = 0;
    let leaveDays = 0;
    let holidayDays = 0;
    let absentDays = 0;
    let incompleteDays = 0;
    let weekOffDays = 0;
    let totalHours = 0;

    for (const cell of calendarCells) {
      if (cell.day === 0) continue;
      if (cell.holiday) holidayDays++;
      else if (cell.leave) leaveDays++;
      else if (cell.weekOff) weekOffDays++;
      else if (cell.present) {
        presentDays++;
        totalHours += cell.totalHours;
      } else if (cell.incomplete) incompleteDays++;
      else if (cell.absent) absentDays++;
    }

    return {
      presentDays,
      leaveDays,
      holidayDays,
      absentDays,
      incompleteDays,
      weekOffDays,
      totalHours: Math.round(totalHours * 100) / 100,
    };
  }, [calendarCells]);

  const goPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
  };

  if (!open) return null;

  const canLoadAttendance = Boolean(candidateId?.trim());

  const LEGEND = [
    { key: "present", label: "Present", dot: "bg-emerald-500", ring: "ring-emerald-500/30" },
    { key: "incomplete", label: "Clocked in", dot: "bg-amber-500", ring: "ring-amber-500/30" },
    { key: "holiday", label: "Holiday", dot: "bg-sky-500", ring: "ring-sky-500/30" },
    { key: "leave", label: "Leave", dot: "bg-violet-500", ring: "ring-violet-500/30" },
    { key: "absent", label: "Absent", dot: "bg-rose-500", ring: "ring-rose-500/30" },
    { key: "weekoff", label: "Week off", dot: "bg-teal-500", ring: "ring-teal-500/35" },
    { key: "weekday", label: "Workday", dot: "bg-white border border-slate-300 dark:bg-zinc-800 dark:border-white/25", ring: "ring-slate-200/60" },
    { key: "weekend", label: "Weekend", dot: "bg-indigo-300 dark:bg-indigo-600", ring: "ring-indigo-300/45" },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-[radial-gradient(ellipse_at_top,_rgba(15,23,42,0.45)_0%,_transparent_55%)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-attendance-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-bodybg rounded-2xl shadow-[0_24px_80px_-16px_rgba(0,0,0,0.35)] border border-defaultborder/80 dark:border-white/10 max-w-[min(100%,52rem)] w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-defaultborder/80 dark:border-white/10 bg-gradient-to-br from-primary/[0.07] via-transparent to-amber-500/[0.04] dark:from-primary/15 dark:to-amber-950/20 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-start gap-3">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner ring-1 ring-primary/20">
                <i className="ri-calendar-schedule-line text-xl" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2
                  id="candidate-attendance-title"
                  className="text-[1.0625rem] font-semibold tracking-tight text-defaulttextcolor dark:text-white"
                >
                  Attendance
                </h2>
                <p className="mt-0.5 text-sm text-[#64748b] dark:text-white/55 truncate">
                  {candidateName}
                </p>
                <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.12em] text-[#94a3b8] dark:text-white/40">
                  Training · punch &amp; policy
                </p>
                {joiningDateStart && (
                  <p className="mt-1.5 text-[0.75rem] text-[#64748b] dark:text-white/50">
                    <i className="ri-login-circle-line me-1 text-primary/80" aria-hidden />
                    Attendance from <span className="font-semibold text-defaulttextcolor/90 dark:text-white/70">{formatLocalYmd(joiningDateStart)}</span>
                  </p>
                )}
                {resignDateEnd && (
                  <p className="mt-0.5 text-[0.75rem] text-[#64748b] dark:text-white/50">
                    <i className="ri-logout-circle-line me-1 text-rose-500/80" aria-hidden />
                    Last day <span className="font-semibold text-defaulttextcolor/90 dark:text-white/70">{formatLocalYmd(resignDateEnd)}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/[0.04] dark:hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4 sm:px-6 sm:py-5">
          {!canLoadAttendance && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              Missing candidate id. Close and open the row again.
            </div>
          )}

          {canLoadAttendance && (
            <>
              {/* Month summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                {[
                  { label: "Hours", value: `${monthSummary.totalHours}h`, icon: "ri-time-line", color: "text-primary" },
                  { label: "Present", value: String(monthSummary.presentDays), icon: "ri-checkbox-circle-line", color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Leave", value: String(monthSummary.leaveDays), icon: "ri-hotel-bed-line", color: "text-violet-600 dark:text-violet-400" },
                  { label: "Holiday", value: String(monthSummary.holidayDays), icon: "ri-sun-line", color: "text-sky-600 dark:text-sky-400" },
                  { label: "Week off", value: String(monthSummary.weekOffDays), icon: "ri-calendar-close-line", color: "text-teal-700 dark:text-teal-400" },
                  { label: "Absent", value: String(monthSummary.absentDays), icon: "ri-close-circle-line", color: "text-rose-600 dark:text-rose-400" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-defaultborder/60 bg-white/60 dark:bg-white/[0.03] px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-[#94a3b8] dark:text-white/45">
                      <i className={`${s.icon} text-[0.85rem] ${s.color}`} aria-hidden />
                      {s.label}
                    </div>
                    <div className="mt-0.5 text-lg font-semibold tabular-nums text-defaulttextcolor dark:text-white">{s.value}</div>
                  </div>
                ))}
              </div>

              {monthSummary.incompleteDays > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-[0.8125rem] text-amber-900 dark:text-amber-100/90">
                  <i className="ri-pulse-line text-amber-600 shrink-0" />
                  <span>
                    {monthSummary.incompleteDays} day{monthSummary.incompleteDays === 1 ? "" : "s"} with an open punch (clocked in) in this month.
                  </span>
                </div>
              )}

              {/* Assigned week-off schedule */}
              {weekOff.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-[0.8125rem] font-medium text-[#64748b] dark:text-white/50">
                    <i className="ri-calendar-line me-1.5 text-defaulttextcolor/70" />
                    Assigned week-off
                  </span>
                  {weekOff.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center rounded-full border border-dashed border-teal-400/80 bg-teal-50 px-2.5 py-0.5 text-[0.75rem] font-semibold text-teal-900 dark:border-teal-500/50 dark:bg-teal-950/40 dark:text-teal-100"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-base font-semibold text-defaulttextcolor dark:text-white">
                  {MONTH_NAMES[month]} {year}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center rounded-xl border border-defaultborder/70 bg-gray-50/90 dark:bg-white/5 p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={goPrevMonth}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-defaulttextcolor/80 hover:bg-primary/10 hover:text-primary transition-colors"
                      aria-label="Previous month"
                    >
                      <i className="ri-arrow-left-s-line text-[1.1rem]" />
                    </button>
                    <button
                      type="button"
                      onClick={goToday}
                      disabled={year === now.getFullYear() && month === now.getMonth()}
                      className="mx-0.5 inline-flex h-9 items-center rounded-lg px-3 text-[0.75rem] font-semibold disabled:opacity-45 disabled:cursor-default"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={goNextMonth}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-defaulttextcolor/80 hover:bg-primary/10 hover:text-primary transition-colors"
                      aria-label="Next month"
                    >
                      <i className="ri-arrow-right-s-line text-[1.1rem]" />
                    </button>
                  </div>
                  <div className="relative inline-flex items-center">
                    <i className="ri-calendar-line absolute left-2.5 text-[0.8rem] text-defaulttextcolor/50 pointer-events-none" />
                    <select
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value, 10))}
                      className="h-9 min-w-[4.75rem] rounded-xl border border-defaultborder/70 bg-gray-50/90 dark:bg-white/5 pl-8 pr-7 py-0 text-[0.75rem] font-semibold"
                      aria-label="Select year"
                    >
                      {Array.from(
                        { length: CALENDAR_YEAR_END - CALENDAR_YEAR_START + 1 },
                        (_, i) => CALENDAR_YEAR_START + i
                      ).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Legend — pill chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {LEGEND.map((item) => (
                  <span
                    key={item.key}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-defaultborder/50 bg-white/70 px-2.5 py-1 text-[0.6875rem] font-medium text-defaulttextcolor/80 shadow-sm ring-1 ${item.ring} dark:bg-white/[0.04] dark:text-white/75`}
                  >
                    <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                    {item.label}
                  </span>
                ))}
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                  {error}
                </div>
              )}

              {loading && records.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <i className="ri-loader-4-line animate-spin text-2xl text-primary" />
                  </div>
                  <p className="text-sm font-medium text-[#64748b] dark:text-white/50">Loading attendance…</p>
                </div>
              ) : (
                <div className="rounded-xl border border-defaultborder/60 overflow-hidden bg-slate-200/50 dark:bg-white/[0.06]">
                  <div className="grid grid-cols-7 bg-gray-100/90 dark:bg-white/5">
                    {DAY_HEADERS.map((d, di) => (
                      <div
                        key={d}
                        className={
                          "py-2.5 text-center text-[0.65rem] font-bold uppercase tracking-wider " +
                          (di === 0 || di === 6
                            ? "bg-indigo-100/80 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
                            : "bg-white/90 text-[#64748b] dark:bg-zinc-900/30 dark:text-white/45")
                        }
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-defaultborder/50 p-px">
                    {calendarCells.map((cell, idx) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const cellDate = new Date(cell.date);
                      cellDate.setHours(0, 0, 0, 0);
                      const isToday = cell.day > 0 && cellDate.getTime() === today.getTime();
                      const isEmpty = cell.day === 0;
                      const isFuture = cellDate > today;
                      const col = idx % 7;
                      const isWeekendCol = col === 0 || col === 6;
                      const isWorkdayCol = col >= 1 && col <= 5;

                      let cellBg = "";
                      let accent = "";
                      let statusLabel = "";
                      /** Teal + dashed frame: reads as “policy week off”, not a blank workday or weekend */
                      const weekOffShell =
                        "bg-teal-50 dark:bg-teal-950/40 " +
                        "border-2 border-dashed border-teal-500/80 dark:border-teal-400/65 " +
                        "shadow-[inset_0_0_0_1px_rgba(13,148,136,0.18)] dark:shadow-[inset_0_0_0_1px_rgba(45,212,191,0.12)]";

                      if (cell.holiday) {
                        cellBg = "bg-sky-50 dark:bg-sky-950/20";
                        accent = "border-l-[3px] border-sky-500";
                        statusLabel = cell.holidayName || "Holiday";
                      } else if (cell.leave) {
                        cellBg = "bg-violet-50 dark:bg-violet-950/25";
                        accent = "border-l-[3px] border-violet-500";
                        statusLabel = formatLeaveLabel(cell.leaveType);
                      } else if (cell.weekOff) {
                        cellBg = weekOffShell;
                        accent = "";
                        statusLabel = "Week off";
                      } else if (cell.present) {
                        cellBg = "bg-emerald-50/90 dark:bg-emerald-950/15";
                        accent = "border-l-[3px] border-emerald-500";
                      } else if (cell.incomplete) {
                        cellBg = "bg-amber-50 dark:bg-amber-950/20";
                        accent = "border-l-[3px] border-amber-500";
                        statusLabel = "Clocked in";
                      } else if (cell.afterResign) {
                        cellBg = "bg-slate-100/90 dark:bg-zinc-900/45";
                        accent = "";
                        statusLabel = "After resign";
                      } else if (cell.beforeJoining) {
                        cellBg = "bg-slate-100/90 dark:bg-zinc-900/45";
                        accent = "";
                        statusLabel = "Before joining";
                      } else if (cell.absent) {
                        cellBg = "bg-rose-50 dark:bg-rose-950/20";
                        accent = "border-l-[3px] border-rose-500";
                        statusLabel = "Absent";
                      } else if (isWeekendCol && !isEmpty) {
                        cellBg =
                          "bg-indigo-50/90 dark:bg-indigo-950/25 " +
                          "bg-[linear-gradient(160deg,rgba(99,102,241,0.07)_0%,transparent_42%)]";
                      } else if (!isEmpty && isWorkdayCol) {
                        cellBg =
                          "bg-white dark:bg-zinc-900/55 " +
                          "shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]";
                      }

                      const titleParts: string[] = [];
                      if (cell.day > 0) {
                        titleParts.push(`${MONTH_NAMES[month]} ${cell.day}, ${year}`);
                        if (cell.holiday) titleParts.push(`Holiday: ${cell.holidayName || "Holiday"}`);
                        if (cell.leave) titleParts.push(formatLeaveLabel(cell.leaveType));
                        if (cell.weekOff) titleParts.push("Scheduled week off");
                        if (cell.afterResign) titleParts.push("After last employment day");
                        if (cell.beforeJoining) titleParts.push("Before joining date");
                        if (cell.absent) titleParts.push("Absent");
                        if (!cell.weekOff && cell.present && cell.durationLabel) titleParts.push(`Worked ${cell.durationLabel}`);
                        if (cell.incomplete) titleParts.push("Open punch — still clocked in");
                        if (isWeekendCol && !cell.weekOff && !cell.holiday && !cell.leave) titleParts.push("Weekend");
                      }

                      return (
                        <div
                          key={idx}
                          title={titleParts.join(" · ")}
                          className={
                            "min-h-[88px] p-2.5 sm:min-h-[96px] flex flex-col transition-colors " +
                            (isToday ? "ring-2 ring-primary ring-inset z-[1] " : "") +
                            (isEmpty || isFuture ? "opacity-60 " : "") +
                            cellBg +
                            " " +
                            accent +
                            (isToday && !cell.weekOff ? " bg-primary/[0.06] dark:bg-primary/10 " : "")
                          }
                        >
                          {cell.day > 0 && (
                            <>
                              <div className="flex items-start justify-between gap-1">
                                <span
                                  className={
                                    "text-[0.8125rem] font-semibold tabular-nums " +
                                    (isToday ? "text-primary" : "text-defaulttextcolor dark:text-white/85")
                                  }
                                >
                                  {cell.day}
                                </span>
                                <div className="flex flex-wrap justify-end gap-0.5">
                                  {cell.holiday && (
                                    <span className="rounded px-1 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide bg-sky-500/15 text-sky-700 dark:text-sky-300">
                                      Hol
                                    </span>
                                  )}
                                  {cell.leave && (
                                    <span className="rounded px-1 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide bg-violet-500/15 text-violet-700 dark:text-violet-300">
                                      Lv
                                    </span>
                                  )}
                                  {cell.weekOff && !cell.holiday && !cell.leave && (
                                    <span className="rounded-md px-1.5 py-0.5 text-[0.5625rem] font-extrabold uppercase tracking-wide bg-teal-600 text-white shadow-sm dark:bg-teal-500">
                                      WO
                                    </span>
                                  )}
                                  {isWeekendCol && !cell.weekOff && !cell.holiday && !cell.leave && (
                                    <span className="rounded px-1 py-0.5 text-[0.5625rem] font-semibold text-indigo-500/90 dark:text-indigo-300/90">
                                      {col === 0 ? "Sun" : "Sat"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="mt-1 flex-1 flex flex-col gap-0.5 min-h-0">
                                {cell.holiday && (
                                  <p className="text-[0.6875rem] font-semibold leading-snug text-sky-800 dark:text-sky-200 line-clamp-2">
                                    {cell.holidayName || "Holiday"}
                                  </p>
                                )}
                                {cell.leave && (
                                  <p className="text-[0.6875rem] font-semibold leading-snug text-violet-800 dark:text-violet-200 line-clamp-2">
                                    {formatLeaveLabel(cell.leaveType)}
                                  </p>
                                )}
                                {cell.weekOff && !cell.holiday && !cell.leave && (
                                  <p className="text-[0.6875rem] font-semibold text-teal-800 dark:text-teal-200">
                                    Scheduled off
                                  </p>
                                )}
                                {cell.afterResign && !cell.holiday && !cell.leave && !cell.present && !cell.incomplete && (
                                  <p className="text-[0.6875rem] font-medium text-[#64748b] dark:text-white/45">After resign</p>
                                )}
                                {cell.beforeJoining && !cell.holiday && !cell.leave && !cell.present && !cell.incomplete && (
                                  <p className="text-[0.6875rem] font-medium text-[#64748b] dark:text-white/45">Before joining</p>
                                )}
                                {cell.absent && (
                                  <p className="text-[0.6875rem] font-semibold text-rose-700 dark:text-rose-300">Absent</p>
                                )}
                                {!cell.weekOff && cell.present && cell.durationLabel && (
                                  <p className="mt-auto text-[0.75rem] font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                                    {cell.durationLabel}
                                  </p>
                                )}
                                {cell.incomplete && (
                                  <p className="mt-auto text-[0.6875rem] font-semibold text-amber-800 dark:text-amber-200">
                                    <i className="ri-timer-line me-0.5" />
                                    Active
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
