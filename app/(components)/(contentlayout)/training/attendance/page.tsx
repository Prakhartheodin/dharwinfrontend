"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import * as attendanceApi from "@/shared/lib/api/attendance";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasStudentsManage } from "@/shared/lib/attendance-access";
import { downloadCsv } from "@/shared/lib/csv-export";
import AdminTrackView from "./_components/AdminTrackView";
import AttendanceDashboard from "./_components/AttendanceDashboard";
import HolidayPunchBlockNotice from "./_components/HolidayPunchBlockNotice";
import BackdatedAttendanceRequestModal from "./_components/BackdatedAttendanceRequestModal";
import LeaveRequestModal from "./_components/LeaveRequestModal";
import { capDayTotalMs, countsTowardWorkedMs, sessionDurationMsForDisplay } from "@/shared/lib/attendance-display";
import { InlineStatusToast } from "@/shared/components/InlineStatusToast";

const POLL_INTERVAL_MS = 30000;
const TRACK_POLL_MS = 10000;
const ELAPSED_UPDATE_MS = 1000;
const SEARCH_DEBOUNCE_MS = 350;
const AUTO_PUNCH_OUT_HOURS = 12;
const AUTO_PUNCH_OUT_WARNING_BEFORE_MS = 15 * 60 * 1000;
const HISTORY_PAGE_SIZE = 20;
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatHistoryMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Local calendar year/month (1–12). Uses Intl parts — not UTC — so "Current month" matches the user's calendar. */
function getLocalCalendarMonthYear(date = new Date()): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { year, month };
}

function getDetectedTimezone(): string {
  if (typeof window === "undefined") return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function parseYmdLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getHolidayNameFromNotes(notes?: string): string {
  if (!notes?.trim()) return "";
  const prefix = "Holiday: ";
  return notes.trim().startsWith(prefix) ? notes.trim().slice(prefix.length).trim() : notes.trim();
}

/** Get leave type (casual/sick/unpaid) from record: leaveType field or parse "Leave: Casual" from notes. */
function getLeaveTypeFromRecord(r: { leaveType?: string | null; notes?: string | null }): string {
  if (r.leaveType && ["casual", "sick", "unpaid"].includes(r.leaveType)) return r.leaveType;
  const notes = r.notes?.trim() || "";
  const match = notes.match(/^Leave:\s*(Casual|Sick|Unpaid)/i);
  return match ? match[1].toLowerCase() : "";
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { timeZone: "UTC", weekday: "short", year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

const tz = (zone: string) => zone || "UTC";

function formatTimeInTimezone(dateStr: string | null, timezone: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString(undefined, { timeZone: tz(timezone), dateStyle: "short", timeStyle: "medium" });
  } catch {
    return new Date(dateStr).toLocaleString();
  }
}

function formatTimeOnlyInTimezone(dateStr: string | null, timezone: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleTimeString(undefined, { timeZone: tz(timezone), hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return new Date(dateStr).toLocaleTimeString();
  }
}

function formatDurationFromMs(ms: number | null): string {
  if (ms == null || ms <= 0) return "—";
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getLocalDateKey(isoDateStr: string): string {
  if (!isoDateStr) return "";
  const d = new Date(isoDateStr);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAME_MAP = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Calendar year dropdown range (inclusive) */
const CALENDAR_YEAR_START = 2020;
const CALENDAR_YEAR_END = 2150;

export default function AttendanceTracking() {
  const { user, isPlatformSuperUser, permissions, permissionsLoaded, isAdministrator } = useAuth();
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
  const [isUserBased, setIsUserBased] = useState(false);
  const [myWeekOff, setMyWeekOff] = useState<string[]>([]);
  const [myJoiningDateStart, setMyJoiningDateStart] = useState<Date | null>(null);
  const [myShift, setMyShift] = useState<{ name?: string; startTime?: string; endTime?: string; timezone?: string } | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [status, setStatus] = useState<attendanceApi.PunchStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceList, setAttendanceList] = useState<attendanceApi.AttendanceRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [trackList, setTrackList] = useState<attendanceApi.AttendanceTrackItem[]>([]);
  const [trackListLoading, setTrackListLoading] = useState(false);
  const [historyList, setHistoryList] = useState<attendanceApi.AttendanceTrackHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyYear, setHistoryYear] = useState(() => getLocalCalendarMonthYear().year);
  const [historyMonth, setHistoryMonth] = useState(() => getLocalCalendarMonthYear().month);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState<attendanceApi.AttendanceTrackHistoryPagination>({
    page: 1,
    limit: HISTORY_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [trackSearch, setTrackSearch] = useState("");
  const [debouncedTrackSearch, setDebouncedTrackSearch] = useState("");
  const [attendanceView, setAttendanceView] = useState<"track" | "history" | "dashboard">("track");
  const [canTrackAll, setCanTrackAll] = useState(false);
  const [canPunchOutOthers, setCanPunchOutOthers] = useState(false);
  const [punchOutLoadingId, setPunchOutLoadingId] = useState<string | null>(null);
  const elapsedRef = useRef<number>(0);
  const [elapsedDisplay, setElapsedDisplay] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [autoWarningShown, setAutoWarningShown] = useState(false);
  const prevPunchedInRef = useRef<boolean | null>(null);
  const [summaryStats, setSummaryStats] = useState<attendanceApi.AttendanceStatistics | null>(null);
  const [myAttendanceViewMode, setMyAttendanceViewMode] = useState<"list" | "calendar">("calendar");
  const [myCalendarYear, setMyCalendarYear] = useState(() => new Date().getFullYear());
  const [myCalendarMonth, setMyCalendarMonth] = useState(() => new Date().getMonth());
  const [trackLiveTick, setTrackLiveTick] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [todayIsHoliday, setTodayIsHoliday] = useState(false);
  const [todayHolidayTitle, setTodayHolidayTitle] = useState<string | null>(null);

  /* ─── data fetching ─── */
  const fetchStatus = useCallback(async (id: string) => {
    setStatusLoading(true);
    try {
      const res = isUserBased ? await attendanceApi.getPunchInOutStatusMe() : await attendanceApi.getPunchInOutStatus(id);
      setStatus(res);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [isUserBased]);

  const fetchList = useCallback(
    async (id: string, params?: attendanceApi.ListAttendanceParams) => {
      setListLoading(true);
      try {
        const res = isUserBased
          ? await attendanceApi.listAttendanceMe(params ?? { limit: 500, page: 1 })
          : await attendanceApi.listAttendance(id, params ?? { limit: 500, page: 1 });
        setAttendanceList(res.results ?? []);
      } catch {
        setAttendanceList([]);
      } finally {
        setListLoading(false);
      }
    },
    [isUserBased]
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoadingStudent(true);
      setError(null);
      try {
        const identity = await attendanceApi.getMyStudentForAttendance();
        const id = identity && ((identity as { id?: string }).id ?? (identity as { _id?: string })._id);
        if (!cancelled && id) {
          setMyStudentId(id);
          setIsUserBased(identity.type === "user");
          if (identity.type !== "user") {
            const wo = (identity as { weekOff?: string[] }).weekOff;
            if (Array.isArray(wo)) setMyWeekOff(wo);
            const shift = (identity as { shift?: { name?: string; startTime?: string; endTime?: string; timezone?: string } }).shift;
            setMyShift(shift && typeof shift === "object" ? shift : null);
            const joiningRaw = (identity as { joiningDate?: string | Date | null }).joiningDate;
            if (joiningRaw) {
              const parsed =
                typeof joiningRaw === "string"
                  ? parseYmdLocal(joiningRaw.slice(0, 10))
                  : new Date(joiningRaw);
              setMyJoiningDateStart(parsed && !Number.isNaN(parsed.getTime()) ? parsed : null);
            } else {
              setMyJoiningDateStart(null);
            }
          } else {
            setMyWeekOff([]);
            setMyShift(null);
            setMyJoiningDateStart(null);
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const s = (e as { response?: { status?: number } })?.response?.status;
          if (s === 401) setError("Session expired or not authenticated. Please log in again.");
          else if (s !== 404) setError("Failed to load your profile.");
        }
      } finally {
        if (!cancelled) setLoadingStudent(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const refetchMyMonth = useCallback(() => {
    if (!myStudentId) return;
    const last = new Date(myCalendarYear, myCalendarMonth + 1, 0);
    const startDate = `${myCalendarYear}-${String(myCalendarMonth + 1).padStart(2, "0")}-01`;
    const endDate = `${myCalendarYear}-${String(myCalendarMonth + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
    fetchList(myStudentId, { startDate, endDate, limit: 500, page: 1 });
  }, [myStudentId, myCalendarYear, myCalendarMonth, fetchList]);

  useEffect(() => {
    if (!myStudentId) return;
    fetchStatus(myStudentId); refetchMyMonth();
    const id = setInterval(() => fetchStatus(myStudentId), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [myStudentId, myAttendanceViewMode, myCalendarYear, myCalendarMonth, fetchStatus, refetchMyMonth]);

  useEffect(() => {
    if (!myStudentId) {
      setTodayIsHoliday(false);
      setTodayHolidayTitle(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const holidayData = await attendanceApi.getMyUpcomingHolidays({
          limit: 5,
          timezone: getDetectedTimezone(),
        });
        if (cancelled) return;
        setTodayIsHoliday(Boolean(holidayData.todayIsHoliday));
        setTodayHolidayTitle(holidayData.todayHolidayTitle ?? null);
      } catch {
        if (!cancelled) {
          setTodayIsHoliday(false);
          setTodayHolidayTitle(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [myStudentId]);

  useEffect(() => {
    if (!status?.isPunchedIn || !status?.record?.punchIn) { setElapsedDisplay(""); return; }
    const update = () => {
      const start = new Date(status!.record!.punchIn).getTime();
      elapsedRef.current = Date.now() - start;
      setElapsedDisplay(formatDuration(elapsedRef.current));
      const limitMs = AUTO_PUNCH_OUT_HOURS * 60 * 60 * 1000;
      if (!autoWarningShown && elapsedRef.current >= limitMs - AUTO_PUNCH_OUT_WARNING_BEFORE_MS) {
        setAutoWarningShown(true);
        setToastMessage("You'll be auto punched out in about 15 minutes.");
      }
    };
    update();
    const id = setInterval(update, ELAPSED_UPDATE_MS);
    return () => clearInterval(id);
  }, [status, autoWarningShown]);

  useEffect(() => {
    if (status?.isPunchedIn === false && prevPunchedInRef.current === true) { setToastMessage("You have been punched out."); setAutoWarningShown(false); }
    prevPunchedInRef.current = status?.isPunchedIn ?? null;
  }, [status?.isPunchedIn]);

  useEffect(() => {
    if (!myStudentId) return;
    if (isUserBased) {
      attendanceApi.getAttendanceStatisticsMe().then(setSummaryStats).catch(() => setSummaryStats(null));
    } else {
      attendanceApi.getAttendanceStatistics(myStudentId).then(setSummaryStats).catch(() => setSummaryStats(null));
    }
  }, [myStudentId, isUserBased]);

  useEffect(() => { if (toastMessage) { const t = setTimeout(() => setToastMessage(null), 5000); return () => clearTimeout(t); } }, [toastMessage]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTrackSearch(trackSearch), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trackSearch]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyYear, historyMonth, debouncedTrackSearch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (status?.isPunchedIn) e.preventDefault(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status?.isPunchedIn]);

  const handlePunchIn = async () => {
    if (!myStudentId) return;
    if (todayIsHoliday) {
      setError(
        todayHolidayTitle
          ? `Punch in/out is not allowed on ${todayHolidayTitle}.`
          : "Punch in/out is not allowed on assigned holidays."
      );
      return;
    }
    setPunchLoading(true);
    setError(null);
    try {
      if (isUserBased) {
        await attendanceApi.punchInAttendanceMe({ timezone: getDetectedTimezone() });
      } else {
        await attendanceApi.punchInAttendance(myStudentId, { timezone: getDetectedTimezone() });
      }
      await fetchStatus(myStudentId);
      refetchMyMonth();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Punch in failed.");
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!myStudentId) return;
    if (todayIsHoliday) {
      setError(
        todayHolidayTitle
          ? `Punch in/out is not allowed on ${todayHolidayTitle}.`
          : "Punch in/out is not allowed on assigned holidays."
      );
      return;
    }
    setPunchLoading(true);
    setError(null);
    try {
      if (isUserBased) {
        await attendanceApi.punchOutAttendanceMe({ punchOutTime: new Date().toISOString() });
      } else {
        await attendanceApi.punchOutAttendance(myStudentId, { punchOutTime: new Date().toISOString() });
      }
      await fetchStatus(myStudentId);
      refetchMyMonth();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Punch out failed.");
    } finally {
      setPunchLoading(false);
    }
  };

  /* Backdated request handlers - From/To date range, candidate timezone, skip weekends */
  const defaultTimezone = getDetectedTimezone();
  const candidateTimezone = myShift?.timezone || defaultTimezone;
  const weekOffDays = myWeekOff ?? [];
  const openRequestModal = () => {
    setShowRequestModal(true);
  };

  const openLeaveRequestModal = () => {
    setShowLeaveRequestModal(true);
  };

  /* Admin data: canTrackAll = only for Administrator or students.manage (not for agents with attendance.manage) */
  useEffect(() => {
    if (myStudentId !== null) {
      setCanTrackAll(false);
      return;
    }
    if (isPlatformSuperUser) {
      setCanTrackAll(true);
      setCanPunchOutOthers(true);
      return;
    }
    if (!user?.roleIds?.length) {
      if (permissionsLoaded) {
        setCanTrackAll(hasStudentsManage(permissions, isAdministrator));
      } else {
        setCanTrackAll(false);
      }
      return;
    }
    let cancelled = false;
    rolesApi.listRoles({ limit: 100 }).then((res) => {
      const roles = (res.results ?? []) as Role[];
      const roleMap = new Map(roles.map((r) => [r.id, r]));
      let admin = false;
      const perms = new Set<string>();
      (user!.roleIds as string[]).forEach((id) => {
        const role = roleMap.get(id);
        if (!role) return;
        role.permissions?.forEach((p) => perms.add(p));
        if (role.name === "Administrator") admin = true;
      });
      const roleStudentsManage = Array.from(perms).some((p) => p === "students.manage" || p.startsWith("students.manage"));
      const authStudentsManage =
        permissionsLoaded && hasStudentsManage(permissions, isAdministrator);
      const canSeeAdminTrack = admin || roleStudentsManage || authStudentsManage;
      if (!cancelled) {
        setCanTrackAll(canSeeAdminTrack);
        setCanPunchOutOthers(
          admin ||
            roleStudentsManage ||
            authStudentsManage ||
            Array.from(perms).some(
              (p) =>
                p === "attendance.manage" ||
                p === "training.attendance:view,create,edit" ||
                (p.includes("training.attendance") && (p.includes("create") || p.includes("edit")))
            )
        );
      }
    }).catch(() => { if (!cancelled) { setCanTrackAll(false); setCanPunchOutOthers(false); } });
    return () => { cancelled = true; };
  }, [user, myStudentId, isPlatformSuperUser, permissions, permissionsLoaded, isAdministrator]);

  useEffect(() => {
    if (myStudentId !== null || !canTrackAll) return;
    let cancelled = false;
    setTrackListLoading(true);
    attendanceApi.getAttendanceTrackList({ search: debouncedTrackSearch || undefined })
      .then((res) => { if (!cancelled) setTrackList(res.results ?? []); })
      .catch(() => { if (!cancelled) setTrackList([]); })
      .finally(() => { if (!cancelled) setTrackListLoading(false); });
    return () => { cancelled = true; };
  }, [myStudentId, canTrackAll, debouncedTrackSearch]);

  const buildHistoryParams = useCallback(
    (page = historyPage): attendanceApi.AttendanceTrackHistoryParams => ({
      year: historyYear,
      month: historyMonth,
      page,
      limit: HISTORY_PAGE_SIZE,
      search: debouncedTrackSearch || undefined,
    }),
    [historyYear, historyMonth, historyPage, debouncedTrackSearch]
  );

  const handleAdminPunchOut = useCallback(async (studentId: string) => {
    setPunchOutLoadingId(studentId);
    try {
      await attendanceApi.punchOutAttendance(studentId, {});
      await attendanceApi.getAttendanceTrackList({ search: debouncedTrackSearch || undefined }).then((res) => setTrackList(res.results ?? []));
      attendanceApi.getAttendanceTrackHistory(buildHistoryParams()).then((res) => {
        setHistoryList(res.data ?? []);
        setHistoryPagination(res.pagination);
      });
    } catch { /* keep as is */ } finally { setPunchOutLoadingId(null); }
  }, [buildHistoryParams, debouncedTrackSearch]);

  const fetchHistoryList = useCallback(() => {
    if (!canTrackAll || myStudentId !== null) return;
    setHistoryLoading(true);
    attendanceApi
      .getAttendanceTrackHistory(buildHistoryParams())
      .then((res) => {
        setHistoryList(res.data ?? []);
        setHistoryPagination(res.pagination);
      })
      .catch(() => {
        setHistoryList([]);
        setHistoryPagination({ page: 1, limit: HISTORY_PAGE_SIZE, total: 0, totalPages: 0 });
      })
      .finally(() => setHistoryLoading(false));
  }, [canTrackAll, myStudentId, buildHistoryParams]);

  useEffect(() => { fetchHistoryList(); }, [fetchHistoryList]);

  const switchToHistory = useCallback(() => { setAttendanceView("history"); fetchHistoryList(); }, [fetchHistoryList]);
  const switchToDashboard = useCallback(() => { setAttendanceView("dashboard"); fetchHistoryList(); }, [fetchHistoryList]);

  const fetchTrackList = useCallback((silent = false) => {
    if (myStudentId !== null) return;
    if (!silent) setTrackListLoading(true);
    attendanceApi.getAttendanceTrackList({ search: debouncedTrackSearch || undefined }).then((res) => setTrackList(res.results ?? [])).catch(() => setTrackList([])).finally(() => { if (!silent) setTrackListLoading(false); });
  }, [myStudentId, debouncedTrackSearch]);

  const switchToTrack = useCallback(() => { setAttendanceView("track"); fetchTrackList(); }, [fetchTrackList]);

  useEffect(() => {
    if (attendanceView !== "track" || !trackList.some((r) => r.isPunchedIn)) return;
    const id = setInterval(() => setTrackLiveTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [attendanceView, trackList, trackLiveTick]);

  useEffect(() => {
    if (!canTrackAll || myStudentId !== null || attendanceView !== "track") return;
    const id = setInterval(() => fetchTrackList(true), TRACK_POLL_MS);
    return () => clearInterval(id);
  }, [canTrackAll, myStudentId, attendanceView, fetchTrackList]);

  /* CSV exports */
  const exportMyAttendanceCsv = useCallback(() => {
    const rows = attendanceList.map((r) => {
      const t = r.timezone ?? "UTC";
      return { Date: formatDate(r.date), Day: r.day ?? "", PunchIn: formatTimeOnlyInTimezone(r.punchIn, t), PunchOut: r.punchOut ? formatTimeOnlyInTimezone(r.punchOut, t) : "", Duration: r.duration != null ? formatDuration(r.duration) : "" };
    });
    downloadCsv(`my-attendance-${new Date().toISOString().slice(0, 10)}.csv`, [{ key: "Date", label: "Date" }, { key: "Day", label: "Day" }, { key: "PunchIn", label: "Punch In" }, { key: "PunchOut", label: "Punch Out" }, { key: "Duration", label: "Duration" }], rows);
  }, [attendanceList]);

  /* List: sort by attendance date desc so leave appears on its actual date (not before) */
  const sortedAttendanceList = useMemo(() => {
    return [...attendanceList].sort((a, b) => {
      const ta = new Date(a.date ?? 0).getTime();
      const tb = new Date(b.date ?? 0).getTime();
      if (tb !== ta) return tb - ta;
      const pa = a.punchIn ? new Date(a.punchIn).getTime() : 0;
      const pb = b.punchIn ? new Date(b.punchIn).getTime() : 0;
      return pb - pa;
    });
  }, [attendanceList]);

  /* List table: hide future leave and holidays (show only up to today) */
  const listAttendanceForTable = useMemo(() => {
    const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
    return sortedAttendanceList.filter((r) => {
      const status = (r as { status?: string }).status;
      if (status !== "Leave" && status !== "Holiday") return true;
      const dateKey = getLocalDateKey(r.date ?? "");
      return dateKey <= todayKey;
    });
  }, [sortedAttendanceList]);

  const buildHistoryExportParams = useCallback((): attendanceApi.AttendanceHistoryExportParams => ({
    year: historyYear,
    month: historyMonth,
    search: debouncedTrackSearch || undefined,
  }), [historyYear, historyMonth, debouncedTrackSearch]);

  const goToPreviousHistoryMonth = useCallback(() => {
    if (historyMonth === 1) {
      setHistoryYear((y) => y - 1);
      setHistoryMonth(12);
    } else {
      setHistoryMonth((m) => m - 1);
    }
  }, [historyMonth]);

  const goToNextHistoryMonth = useCallback(() => {
    if (historyMonth === 12) {
      setHistoryYear((y) => y + 1);
      setHistoryMonth(1);
    } else {
      setHistoryMonth((m) => m + 1);
    }
  }, [historyMonth]);

  const goToCurrentHistoryMonth = useCallback(() => {
    const { year, month } = getLocalCalendarMonthYear();
    setHistoryYear(year);
    setHistoryMonth(month);
  }, []);

  const exportTrackExcel = useCallback(
    async (punchStatus: "all" | "in" | "out") => {
      try {
        await attendanceApi.downloadAttendanceTrackExport({
          search: debouncedTrackSearch || undefined,
          punchStatus: punchStatus === "all" ? undefined : punchStatus,
        });
      } catch {
        alert("Export failed. Check permissions and try again.");
      }
    },
    [debouncedTrackSearch]
  );

  const exportHistoryExcel = useCallback(async () => {
    try {
      await attendanceApi.downloadAttendanceHistoryExport(buildHistoryExportParams());
    } catch {
      alert("Export failed. Check permissions and try again.");
    }
  }, [buildHistoryExportParams]);

  const filteredHistoryList = historyList;

  const canPunch = !!myStudentId;
  const punchBlockedByHoliday = canPunch && todayIsHoliday;
  const isCandidateOnly = canPunch && !canTrackAll;

  /* Calendar */
  const getMyAttendanceCalendarData = useCallback((): Array<{ day: number; date: Date; present: boolean; incomplete: boolean; holiday: boolean; leave: boolean; leaveType: string; absent: boolean; weekOff: boolean; durationLabel: string; holidayName: string }> => {
    const year = myCalendarYear; const month = myCalendarMonth;
    const firstDay = new Date(year, month, 1); const startDayOfWeek = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0); const daysInMonth = lastDay.getDate();
    const effectiveWeekOffDays = myWeekOff.length > 0 ? myWeekOff : ["Saturday", "Sunday"];
    const weekOffSet = new Set(effectiveWeekOffDays.map((d) => d.trim()));
    const byDate: Record<string, { present: boolean; incomplete: boolean; holiday: boolean; leave: boolean; leaveType: string; absent: boolean; totalMs: number; holidayName: string }> = {};
    attendanceList.forEach((r) => {
      const dateKey = getLocalDateKey(r.date ?? ""); if (!dateKey) return;
      const hasOut = !!r.punchOut; const ms = sessionDurationMsForDisplay(r);
      const recStatus = r.status;
      if (!byDate[dateKey]) byDate[dateKey] = { present: false, incomplete: false, holiday: false, leave: false, leaveType: "", absent: false, totalMs: 0, holidayName: "" };
      if (recStatus === "Holiday") { byDate[dateKey].holiday = true; byDate[dateKey].holidayName = getHolidayNameFromNotes(r.notes) || "Holiday"; }
      else if (recStatus === "Leave") { byDate[dateKey].leave = true; byDate[dateKey].leaveType = getLeaveTypeFromRecord(r); }
      else if (recStatus === "Absent") { byDate[dateKey].absent = true; }
      else if (hasOut && countsTowardWorkedMs(recStatus)) { byDate[dateKey].present = true; byDate[dateKey].totalMs += ms; }
      else { byDate[dateKey].incomplete = true; }
    });
    const cells: Array<{ day: number; date: Date; present: boolean; incomplete: boolean; holiday: boolean; leave: boolean; leaveType: string; absent: boolean; weekOff: boolean; durationLabel: string; holidayName: string }> = [];
    for (let i = 0; i < startDayOfWeek; i++) cells.push({ day: 0, date: new Date(year, month, -startDayOfWeek + 1 + i), present: false, incomplete: false, holiday: false, leave: false, leaveType: "", absent: false, weekOff: false, durationLabel: "", holidayName: "" });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const info = byDate[dateKey] || { present: false, incomplete: false, holiday: false, leave: false, leaveType: "", absent: false, totalMs: 0, holidayName: "" };
      const dayName = DAY_NAME_MAP[date.getDay()];
      const isWeekOff = weekOffSet.has(dayName);
      const isPast = date < todayStart;
      const isTodayCell = date.getTime() === todayStart.getTime();
      const isBeforeJoining =
        myJoiningDateStart != null && date.getTime() < myJoiningDateStart.getTime();
      /** Past scheduled workdays with no punch / leave / holiday row: treat as absent (same idea as StudentAttendanceOverlay). */
      const inferredAbsent =
        isPast &&
        !isTodayCell &&
        !isBeforeJoining &&
        !isWeekOff &&
        !info.holiday &&
        !info.leave &&
        !info.present &&
        !info.incomplete;
      const cellAbsent = info.absent || inferredAbsent;
      const displayMs = info.holiday || info.leave ? 0 : capDayTotalMs(info.totalMs);
      cells.push({ day, date, present: info.present, incomplete: info.incomplete && !info.present, holiday: info.holiday, leave: info.leave, leaveType: info.leaveType, absent: cellAbsent, weekOff: isWeekOff, durationLabel: displayMs > 0 ? formatDuration(displayMs) : "", holidayName: info.holidayName });
    }
    return cells;
  }, [attendanceList, myCalendarYear, myCalendarMonth, myWeekOff, myJoiningDateStart]);

  const refreshMyAttendanceList = useCallback(() => { refetchMyMonth(); }, [refetchMyMonth]);

  /* ═══ RENDER ═══ */
  return (
    <Fragment>
      <Seo title={isCandidateOnly ? "Attendance" : "Attendance Tracking"} />

      {/* Sticky Active Banner */}
      {canPunch && status?.isPunchedIn && (
        <div className="sticky top-0 z-10 mx-4 mb-5 sm:mb-6">
          <div className="flex items-center gap-3 rounded-md bg-success/10 border border-success/20 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
              </span>
              <span className="text-[0.8125rem] font-medium text-success">
                {"You're clocked in"}
              </span>
              <span className="text-[0.9375rem] font-semibold text-success">{elapsedDisplay}</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && <InlineStatusToast message={toastMessage} />}

      <div className="container mx-auto mt-5 w-full max-w-full sm:mt-6">
        {/* Loading / Error */}
        {loadingStudent && (
          <div className="py-12 flex flex-col items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-2 text-[0.8125rem] text-[#8c9097]">Loading your profile...</p>
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-md border border-danger/30 bg-danger/5 px-4 py-3">
            <i className="ri-error-warning-line text-danger text-[1.25rem]" />
            <span className="text-[0.8125rem] text-danger">{error}</span>
          </div>
        )}

        {/* ═══ STUDENT / CANDIDATE VIEW ═══ */}
        {canPunch && (
          <>
            {/* Summary Stats */}
            {summaryStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5 sm:gap-6 mb-6">
                {[
                  { label: "Total Days", value: String(summaryStats.totalDays), icon: "ri-calendar-check-line", color: "primary" },
                  { label: "Total Hours", value: String(summaryStats.totalHours), icon: "ri-time-line", color: "secondary" },
                  { label: "This Week", value: (summaryStats.totalHoursWeek ?? "—") + "h", icon: "ri-calendar-todo-line", color: "info" },
                  { label: "This Month", value: (summaryStats.totalHoursMonth ?? "—") + "h", icon: "ri-calendar-2-line", color: "success" },
                  { label: "Avg Session", value: summaryStats.averageSessionMinutes != null ? summaryStats.averageSessionMinutes + "m" : "—", icon: "ri-timer-line", color: "warning" },
                  { label: "Late / Early", value: (summaryStats.latePunchInCount ?? 0) + " / " + (summaryStats.earlyPunchOutCount ?? 0), icon: "ri-alarm-warning-line", color: "danger" },
                ].map((s, i) => (
                  <div key={i} className="box !mb-0">
                    <div className="box-body !p-3 flex items-center gap-2.5">
                      <span className={"avatar avatar-sm rounded-md bg-" + s.color + "/10 text-" + s.color}>
                        <i className={s.icon + " text-[0.9rem]"} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0 truncate">{s.label}</p>
                        <p className="text-[1rem] font-semibold text-defaulttextcolor dark:text-white mb-0">{s.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Punch Clock Card */}
            <div className="grid grid-cols-12 gap-6 mb-6">
              <div className="col-span-12 lg:col-span-7">
                <div className="box !mb-0">
                  <div className="box-header !flex-col !items-stretch gap-3 sm:!flex-row sm:items-center sm:justify-between sm:gap-3 min-w-0">
                    <div className="box-title !me-0 flex min-w-0 items-center gap-2 shrink-0">
                      <i className="ri-fingerprint-line text-primary text-[1.1rem] shrink-0" aria-hidden />
                      <span className="truncate">Time Clock</span>
                    </div>
                    {/*
                      Single toolbar (not separate outlined buttons): avoids ti-btn-sm 28px trap,
                      adds comfortable padding, one border, primary-toned actions with a divider.
                    */}
                    <div
                      role="toolbar"
                      aria-label="Attendance requests"
                      className="flex w-full min-w-0 flex-nowrap overflow-hidden rounded-xl border border-defaultborder/80 bg-white shadow-sm dark:border-white/10 dark:bg-bodybg sm:ms-auto sm:max-w-full sm:w-auto"
                    >
                      <button
                        type="button"
                        onClick={openRequestModal}
                        className="flex min-h-[2.75rem] min-w-0 flex-1 items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.06] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 dark:hover:bg-primary/10"
                        title="Request backdated attendance for past dates"
                      >
                        <i className="ri-history-line shrink-0 text-[1.15rem] opacity-90" aria-hidden />
                        <span className="min-w-0 pr-1 leading-snug tracking-tight">
                          Backdated attendance
                        </span>
                      </button>
                      {myStudentId ? (
                        <>
                          <div
                            className="w-px shrink-0 self-stretch bg-defaultborder/55 dark:bg-white/15"
                            aria-hidden
                          />
                          <button
                            type="button"
                            onClick={openLeaveRequestModal}
                            className="flex min-h-[2.75rem] min-w-0 flex-1 items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.06] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 dark:hover:bg-primary/10 sm:flex-none sm:whitespace-nowrap"
                            title="Submit a leave request for approval"
                          >
                            <i className="ri-hotel-bed-line shrink-0 text-[1.15rem] opacity-90" aria-hidden />
                            <span className="min-w-0 pr-1 leading-snug tracking-tight">Leave request</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="box-body space-y-4">
                    <HolidayPunchBlockNotice
                      todayIsHoliday={todayIsHoliday}
                      todayHolidayTitle={todayHolidayTitle}
                    />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* Status indicator */}
                      <div className={"flex-shrink-0 flex items-center justify-center h-20 w-20 rounded-full border-[3px] " + (status?.isPunchedIn ? "border-success bg-success/5" : "border-defaultborder bg-gray-50 dark:bg-black/10")}>
                        {status?.isPunchedIn ? (
                          <i className="ri-play-circle-fill text-[2rem] text-success" />
                        ) : (
                          <i className="ri-pause-circle-line text-[2rem] text-[#8c9097]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {status?.isPunchedIn ? (
                            <span className="inline-flex items-center gap-1.5 badge bg-success/10 text-success !rounded-full !text-[0.75rem] !py-1 !px-2.5">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                              </span>
                              Active
                            </span>
                          ) : (
                            <span className="badge bg-gray-100 dark:bg-white/10 text-[#8c9097] !rounded-full !text-[0.75rem] !py-1 !px-2.5">
                              {statusLoading ? "Checking..." : "Inactive"}
                            </span>
                          )}
                          {status?.isPunchedIn && status?.record?.punchIn && (
                            <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                              Since {formatTimeOnlyInTimezone(status.record.punchIn, status.record.timezone ?? "UTC")}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={status?.isPunchedIn ? handlePunchOut : handlePunchIn}
                            disabled={punchLoading || punchBlockedByHoliday}
                            className={
                              (punchBlockedByHoliday
                                ? "ti-btn-light opacity-60 cursor-not-allowed"
                                : status?.isPunchedIn
                                  ? "ti-btn-danger"
                                  : "ti-btn-success") +
                              " ti-btn ti-btn-wave inline-flex items-center gap-1.5 !py-2 !px-5 !text-[0.8125rem] whitespace-nowrap"
                            }
                            title={
                              punchBlockedByHoliday
                                ? todayHolidayTitle
                                  ? `${todayHolidayTitle} — punch disabled`
                                  : "Holiday — punch disabled"
                                : status?.isPunchedIn
                                  ? "Punch Out"
                                  : "Punch In"
                            }
                          >
                            {punchLoading ? (
                              <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> {status?.isPunchedIn ? "Punching Out..." : "Punching In..."}</span>
                            ) : punchBlockedByHoliday ? (
                              <span className="inline-flex items-center gap-1.5"><i className="ri-calendar-close-line" /> Holiday</span>
                            ) : status?.isPunchedIn ? (
                              <span className="inline-flex items-center gap-1.5"><i className="ri-logout-box-r-line" /> Punch Out</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5"><i className="ri-login-box-line" /> Punch In</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Assigned shift card */}
              <div className="col-span-12 lg:col-span-5">
                <div className="box !mb-0 h-full">
                  <div className="box-header">
                    <div className="box-title">Assigned Shift</div>
                  </div>
                  <div className="box-body flex flex-col justify-center">
                    <div className="text-center">
                      {myShift?.name ? (
                        <>
                          <p className="text-[2rem] font-bold text-defaulttextcolor dark:text-white mb-1">
                            {myShift.name}
                          </p>
                          <p className="text-[0.9375rem] text-[#8c9097] dark:text-white/50">
                            {(myShift.startTime ?? "—")} – {(myShift.endTime ?? "—")}
                          </p>
                        </>
                      ) : (
                        <p className="text-[1rem] text-[#8c9097] dark:text-white/50 mb-0">No shift assigned</p>
                      )}
                      {status?.isPunchedIn && elapsedDisplay && (
                        <div className="mt-3 pt-3 border-t border-defaultborder/50">
                          <span className="text-[1.5rem] font-bold text-success">{elapsedDisplay}</span>
                          <p className="text-[0.6875rem] text-[#8c9097] mt-0.5">elapsed today</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* My Attendance */}
            <div className="box mb-6">
              <div className="box-header flex flex-wrap items-center justify-between gap-3">
                <div className="box-title">My Attendance</div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* View toggle – pill with clear active state */}
                  <div className="inline-flex rounded-xl border border-defaultborder/80 bg-gray-50/60 dark:bg-white/5 p-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setMyAttendanceViewMode("list")}
                      className={"inline-flex items-center gap-2 whitespace-nowrap rounded-lg py-2 px-3.5 text-[0.75rem] font-semibold transition-all duration-200 " + (myAttendanceViewMode === "list" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor dark:text-white/80 hover:text-defaulttextcolor hover:bg-white/80 dark:hover:bg-white/10")}
                    >
                      <i className="ri-list-unordered text-[0.9rem]" />
                      <span>List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMyAttendanceViewMode("calendar")}
                      className={"inline-flex items-center gap-2 whitespace-nowrap rounded-lg py-2 px-3.5 text-[0.75rem] font-semibold transition-all duration-200 " + (myAttendanceViewMode === "calendar" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor dark:text-white/80 hover:text-defaulttextcolor hover:bg-white/80 dark:hover:bg-white/10")}
                    >
                      <i className="ri-calendar-line text-[0.9rem]" />
                      <span>Calendar</span>
                    </button>
                  </div>
                  <div className="h-5 w-px bg-defaultborder/80 flex-shrink-0 hidden sm:block" aria-hidden="true" />
                  {/* Action pair: refresh + export – same container and affordance */}
                  <div className="inline-flex items-center rounded-xl border border-defaultborder/80 bg-gray-50/60 dark:bg-white/5 p-0.5">
                    <button
                      type="button"
                      onClick={refreshMyAttendanceList}
                      disabled={listLoading}
                      title="Refresh list"
                      aria-label="Refresh attendance list"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-defaulttextcolor/80 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-defaulttextcolor/80 active:scale-95"
                    >
                      <i className={"ri-refresh-line text-[1.1rem]" + (listLoading ? " animate-spin" : "")} />
                    </button>
                    <button
                      type="button"
                      onClick={exportMyAttendanceCsv}
                      disabled={attendanceList.length === 0}
                      title="Export CSV"
                      aria-label="Export attendance as CSV"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-primary border-l border-defaultborder/60 hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent active:scale-95"
                    >
                      <i className="ri-download-2-line text-[1.1rem]" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="box-body !p-0">
                {/* List View */}
                {myAttendanceViewMode === "list" && (
                  <>
                    {listLoading && attendanceList.length === 0 ? (
                      <div className="p-5 space-y-3">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div key={n} className="flex items-center gap-4 animate-pulse">
                            <div className="h-4 w-20 rounded bg-black/5 dark:bg-white/10" />
                            <div className="h-4 w-12 rounded bg-black/5 dark:bg-white/10" />
                            <div className="h-5 w-16 rounded-full bg-black/5 dark:bg-white/10" />
                            <div className="h-4 w-20 rounded bg-black/5 dark:bg-white/10 ml-auto" />
                            <div className="h-4 w-20 rounded bg-black/5 dark:bg-white/10" />
                            <div className="h-4 w-14 rounded bg-black/5 dark:bg-white/10" />
                          </div>
                        ))}
                      </div>
                    ) : attendanceList.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/5">
                          <i className="ri-calendar-check-line text-[1.5rem] text-primary/40" />
                        </div>
                        <p className="text-[0.8125rem] text-[#8c9097]">No attendance records yet</p>
                        <p className="text-[0.75rem] text-[#8c9097]/70">Punch in to start tracking</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-b-md">
                        <table className="w-full min-w-full border-collapse">
                          <thead>
                            <tr className="border-b border-defaultborder bg-gray-50/90 dark:bg-white/5">
                              <th className="text-start py-3.5 pl-5 pr-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/50">Date</th>
                              <th className="text-start py-3.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/50">Day</th>
                              <th className="text-start py-3.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/50">Status</th>
                              <th className="text-end py-3.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/50 tabular-nums">Punch In</th>
                              <th className="text-end py-3.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/50 tabular-nums">Punch Out</th>
                              <th className="text-end py-3.5 pr-5 pl-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/50 tabular-nums">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {listAttendanceForTable.map((r, idx) => {
                              const recordTz = r.timezone ?? "UTC";
                              const recStatus = (r as { status?: string }).status;
                              const isHolidayOrLeave = recStatus === "Holiday" || recStatus === "Leave";
                              const rowBg = isHolidayOrLeave ? "bg-info/[0.04]" : idx % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-gray-50/40 dark:bg-white/[0.02]";
                              return (
                                <tr key={r.id} className={"border-b border-defaultborder/60 dark:border-defaultborder/10 transition-colors duration-150 " + rowBg + " hover:bg-primary/[0.03] dark:hover:bg-primary/5"}>
                                  <td className="py-3.5 pl-5 pr-3 text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white whitespace-nowrap">{formatDate(r.date)}</td>
                                  <td className="py-3.5 px-3 text-[0.8125rem] text-defaulttextcolor/70 dark:text-white/70 whitespace-nowrap">{r.day ?? "—"}</td>
                                  <td className="py-3.5 px-3">
                                    {recStatus === "Holiday" ? (
                                      <span className="inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info/10 px-2.5 py-1 text-[0.6875rem] font-semibold text-info">
                                        <i className="ri-sun-line text-[0.65rem]" />
                                        {(r as { notes?: string }).notes ? getHolidayNameFromNotes((r as { notes?: string }).notes) || "Holiday" : "Holiday"}
                                      </span>
                                    ) : recStatus === "Leave" ? (
                                      <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-[0.6875rem] font-semibold text-secondary">
                                        <i className="ri-hotel-bed-line text-[0.65rem]" />
                                        {(() => { const lt = getLeaveTypeFromRecord(r); return lt ? `Leave (${lt.charAt(0).toUpperCase() + lt.slice(1)})` : "Leave"; })()}
                                      </span>
                                    ) : recStatus === "Absent" ? (
                                      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[0.6875rem] font-semibold text-danger">
                                        <i className="ri-close-circle-line text-[0.65rem]" />Absent
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[0.6875rem] font-semibold text-success">
                                        <i className="ri-checkbox-circle-line text-[0.65rem]" />Present
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-3 text-end text-[0.8125rem] text-defaulttextcolor dark:text-white tabular-nums whitespace-nowrap">{isHolidayOrLeave ? "—" : formatTimeOnlyInTimezone(r.punchIn, recordTz)}</td>
                                  <td className="py-3.5 px-3 text-end text-[0.8125rem] text-defaulttextcolor dark:text-white tabular-nums whitespace-nowrap">{isHolidayOrLeave ? "—" : (r.punchOut ? formatTimeOnlyInTimezone(r.punchOut, recordTz) : <span className="text-defaulttextcolor/60 italic">Active</span>)}</td>
                                  <td className="py-3.5 pr-5 pl-3 text-end">
                                    <span className={"text-[0.8125rem] font-semibold tabular-nums " + (!isHolidayOrLeave && !r.punchOut && status?.isPunchedIn && status?.record?.id === r.id ? "text-success" : "text-defaulttextcolor dark:text-white")}>
                                      {isHolidayOrLeave ? "—" : r.punchOut ? (r.duration != null ? formatDuration(r.duration) : "—") : status?.isPunchedIn && status?.record?.id === r.id ? elapsedDisplay || "..." : "—"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {/* Calendar View */}
                {myAttendanceViewMode === "calendar" && (
                  <div className="p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                        {MONTH_NAMES[myCalendarMonth]} {myCalendarYear}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Nav: Prev / Today / Next as one control */}
                        <div className="inline-flex items-center rounded-xl border border-defaultborder/70 bg-gray-50/80 dark:bg-white/5 p-0.5 shadow-sm">
                          <button
                            type="button"
                            onClick={() => { const prev = myCalendarMonth === 0 ? 11 : myCalendarMonth - 1; setMyCalendarMonth(prev); if (myCalendarMonth === 0) setMyCalendarYear((y) => y - 1); }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-defaulttextcolor/80 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 transition-all duration-200 active:scale-95"
                            aria-label="Previous month"
                          >
                            <i className="ri-arrow-left-s-line text-[1.1rem]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setMyCalendarYear(new Date().getFullYear()); setMyCalendarMonth(new Date().getMonth()); }}
                            disabled={myCalendarYear === new Date().getFullYear() && myCalendarMonth === new Date().getMonth()}
                            className={"mx-0.5 inline-flex h-8 items-center rounded-lg px-3 text-[0.75rem] font-medium transition-all duration-200 active:scale-[0.98] disabled:cursor-default disabled:active:scale-100 " + (myCalendarYear === new Date().getFullYear() && myCalendarMonth === new Date().getMonth() ? "bg-primary/15 text-primary dark:bg-primary/25 cursor-default" : "bg-primary text-white hover:bg-primary/90 shadow-sm")}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => { const next = myCalendarMonth === 11 ? 0 : myCalendarMonth + 1; setMyCalendarMonth(next); if (myCalendarMonth === 11) setMyCalendarYear((y) => y + 1); }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-defaulttextcolor/80 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 transition-all duration-200 active:scale-95"
                            aria-label="Next month"
                          >
                            <i className="ri-arrow-right-s-line text-[1.1rem]" />
                          </button>
                        </div>
                        {/* Year: styled to match nav */}
                        <div className="relative inline-flex items-center">
                          <i className="ri-calendar-line absolute left-2.5 text-[0.8rem] text-defaulttextcolor/50 pointer-events-none" aria-hidden />
                          <select
                            value={myCalendarYear}
                            onChange={(e) => setMyCalendarYear(parseInt(e.target.value, 10))}
                            className="h-8 min-w-[4.5rem] rounded-xl border border-defaultborder/70 bg-gray-50/80 dark:bg-white/5 pl-7 pr-8 py-0 text-[0.75rem] font-medium text-defaulttextcolor dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 cursor-pointer [&::-ms-expand]:hidden !bg-no-repeat [background-image:none]"
                            style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                            aria-label="Select year"
                          >
                            {Array.from({ length: CALENDAR_YEAR_END - CALENDAR_YEAR_START + 1 }, (_, i) => CALENDAR_YEAR_START + i).map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                          <i className="ri-arrow-down-s-line absolute right-2 text-[0.75rem] text-defaulttextcolor/50 pointer-events-none" aria-hidden />
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 text-[0.6875rem]">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Present</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Incomplete</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-info" /> Holiday</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-secondary" /> Leave</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger" /> Absent</span>
                      {myWeekOff.length > 0 && (
                        <span className="flex items-center gap-1.5 text-gray-600 dark:text-white/70"><span className="h-2.5 w-2.5 rounded-full bg-gray-500 dark:bg-white/50" /> Week Off</span>
                      )}
                    </div>

                    {listLoading && attendanceList.length === 0 ? (
                      <div className="py-8 text-center text-[#8c9097]">Loading calendar...</div>
                    ) : (
                      <div className="rounded-md border border-defaultborder overflow-hidden">
                        <div className="grid grid-cols-7 bg-gray-50 dark:bg-white/5">
                          {DAY_HEADERS.map((d) => (
                            <div key={d} className="py-2 text-center text-[0.6875rem] font-semibold text-[#8c9097] dark:text-white/50 uppercase tracking-wider">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 bg-white dark:bg-bodybg">
                          {getMyAttendanceCalendarData().map((cell, idx) => {
                            const today = new Date(); today.setHours(0, 0, 0, 0);
                            const cellDate = new Date(cell.date); cellDate.setHours(0, 0, 0, 0);
                            const isToday = cellDate.getTime() === today.getTime();
                            const isEmpty = cell.day === 0;
                            const isFuture = cellDate > today;

                            /* Match admin/student calendar: same neutral gray for week off as header row; status tints aligned with rest of UI */
                            let cellBg = "";
                            let dotColor = "";
                            if (cell.holiday) { cellBg = "bg-info/10 dark:bg-info/15"; dotColor = "bg-info"; }
                            else if (cell.leave) { cellBg = "bg-secondary/10 dark:bg-secondary/15"; dotColor = "bg-secondary"; }
                            else if (cell.absent) { cellBg = "bg-danger/10 dark:bg-danger/15"; dotColor = "bg-danger"; }
                            else if (cell.present) { cellBg = "bg-success/10 dark:bg-success/15"; dotColor = "bg-success"; }
                            else if (cell.incomplete) { cellBg = "bg-warning/10 dark:bg-warning/15"; dotColor = "bg-warning"; }
                            else if (cell.weekOff) { cellBg = "bg-gray-100 dark:bg-white/10"; dotColor = "bg-gray-500 dark:bg-white/50"; }

                            return (
                              <div
                                key={idx}
                                className={"min-h-[76px] p-2 border border-defaultborder/40 transition-colors " + (isToday ? "ring-2 ring-primary ring-inset bg-primary/10 " : "") + (isEmpty || isFuture ? "bg-gray-50/50 dark:bg-white/5 " : !cellBg ? "bg-white dark:bg-bodybg " : "") + cellBg}
                              >
                                {cell.day > 0 && (
                                  <div className="flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={"text-[0.75rem] font-medium " + (isToday ? "text-primary font-bold" : "text-defaulttextcolor/80 dark:text-white/70")}>
                                        {cell.day}
                                      </span>
                                      {dotColor && <span className={"h-1.5 w-1.5 rounded-full flex-shrink-0 " + dotColor} />}
                                    </div>
                                    {cell.holiday && (
                                      <span className="text-[0.65rem] text-info font-medium truncate">{cell.holidayName || "Holiday"}</span>
                                    )}
                                    {cell.leave && (
                                      <span className="text-[0.65rem] text-secondary font-medium">
                                        {cell.leaveType === "casual" ? "Casual" : cell.leaveType === "sick" ? "Sick" : cell.leaveType === "unpaid" ? "Unpaid" : "Leave"}
                                      </span>
                                    )}
                                    {cell.absent && <span className="text-[0.65rem] text-danger font-medium">Absent</span>}
                                    {cell.weekOff && <span className="text-[0.6875rem] text-gray-600 dark:text-white/70 font-medium">Week Off</span>}
                                    {!cell.weekOff && cell.present && cell.durationLabel && (
                                      <span className="text-[0.65rem] text-success font-semibold mt-auto">{cell.durationLabel}</span>
                                    )}
                                    {cell.incomplete && <span className="text-[0.65rem] text-warning font-medium">Active</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ═══ ADMIN VIEW ═══ */}
        {!canPunch && !loadingStudent && (canTrackAll || trackList.length > 0) && (
          <>
            {/* Tab Navigation */}
            <div className="mb-4">
              <div className="inline-flex rounded-md border border-defaultborder overflow-hidden">
                {([
                  { key: "track" as const, label: "Live Track", icon: "ri-radar-line", onClick: switchToTrack },
                  { key: "history" as const, label: "History", icon: "ri-history-line", onClick: switchToHistory },
                  { key: "dashboard" as const, label: "Dashboard", icon: "ri-dashboard-line", onClick: switchToDashboard },
                ]).map((tab, i) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={tab.onClick}
                    className={"!py-2 !px-4 text-[0.8125rem] font-medium transition-colors " + (i > 0 ? "border-l border-defaultborder " : "") + (attendanceView === tab.key ? "bg-primary text-white" : "bg-white dark:bg-bodybg text-defaulttextcolor dark:text-white hover:bg-gray-50 dark:hover:bg-black/10")}
                  >
                    <i className={tab.icon + " me-1.5"} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {attendanceView === "track" && (
              <AdminTrackView
                trackList={trackList}
                trackListLoading={trackListLoading}
                canPunchOutOthers={canPunchOutOthers}
                punchOutLoadingId={punchOutLoadingId}
                search={trackSearch}
                onSearchChange={setTrackSearch}
                onPunchOut={handleAdminPunchOut}
                onExportExcel={(punchStatus) => void exportTrackExcel(punchStatus)}
                formatTimeInTimezone={formatTimeInTimezone}
                formatDuration={formatDuration}
                formatDurationFromMs={formatDurationFromMs}
              />
            )}

            {attendanceView === "history" && (
              <div className="box">
                <div className="box-header flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                    <h3 className="text-base font-semibold text-defaulttextcolor dark:text-white tracking-tight mb-0">Attendance History</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9097] dark:text-white/50 text-[0.95rem] pointer-events-none" aria-hidden />
                      <input
                        type="text"
                        placeholder="Search by name, email, or employee ID…"
                        value={trackSearch}
                        onChange={(e) => setTrackSearch(e.target.value)}
                        aria-label="Search attendance history"
                        className="w-full min-w-[200px] sm:min-w-[240px] max-w-[280px] rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 pl-9 pr-3.5 py-2.5 text-[0.8125rem] text-defaulttextcolor placeholder:text-defaulttextcolor/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      />
                    </div>
                    <div className="h-5 w-px bg-defaultborder/80 flex-shrink-0 hidden sm:block" aria-hidden />
                    <div className="inline-flex items-center gap-1 rounded-xl border border-defaultborder/80 bg-gray-50/60 dark:bg-white/5 p-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={goToPreviousHistoryMonth}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-defaulttextcolor/80 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-200"
                        aria-label="Previous month"
                      >
                        <i className="ri-arrow-left-s-line text-[1.1rem]" aria-hidden />
                      </button>
                      <select
                        value={historyMonth}
                        onChange={(e) => setHistoryMonth(Number(e.target.value))}
                        aria-label="History month"
                        className="rounded-lg border-0 bg-transparent py-2 px-2 text-[0.75rem] font-semibold text-defaulttextcolor dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {MONTH_NAMES.map((name, idx) => (
                          <option key={name} value={idx + 1}>{name}</option>
                        ))}
                      </select>
                      <select
                        value={historyYear}
                        onChange={(e) => setHistoryYear(Number(e.target.value))}
                        aria-label="History year"
                        className="rounded-lg border-0 bg-transparent py-2 px-2 text-[0.75rem] font-semibold text-defaulttextcolor dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={goToNextHistoryMonth}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-defaulttextcolor/80 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-200"
                        aria-label="Next month"
                      >
                        <i className="ri-arrow-right-s-line text-[1.1rem]" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={goToCurrentHistoryMonth}
                        className="inline-flex items-center whitespace-nowrap rounded-lg py-2 px-3 text-[0.75rem] font-semibold text-defaulttextcolor dark:text-white/80 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-200"
                      >
                        Current month
                      </button>
                    </div>
                    <div className="inline-flex items-center rounded-xl border border-defaultborder/80 bg-gray-50/60 dark:bg-white/5 p-0.5">
                      <button
                        type="button"
                        onClick={() => void exportHistoryExcel()}
                        disabled={filteredHistoryList.length === 0}
                        title="Export Excel"
                        aria-label="Export attendance history as Excel"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-defaulttextcolor/80 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-defaulttextcolor/80 active:scale-95"
                      >
                        <i className="ri-download-2-line text-[1.1rem]" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="box-body !p-0">
                  {historyLoading ? (
                    <div className="p-5 space-y-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} className="flex items-center gap-4 animate-pulse">
                          <div className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/10" />
                          <div className="h-4 flex-1 rounded bg-black/5 dark:bg-white/10" />
                          <div className="h-4 w-20 rounded bg-black/5 dark:bg-white/10" />
                          <div className="h-4 w-20 rounded bg-black/5 dark:bg-white/10" />
                        </div>
                      ))}
                    </div>
                  ) : filteredHistoryList.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/5">
                        <i className="ri-history-line text-[1.5rem] text-primary/40" />
                      </div>
                      <p className="text-[0.8125rem] text-[#8c9097]">
                        {debouncedTrackSearch
                          ? "No matches for your search"
                          : `No attendance records found for ${formatHistoryMonthLabel(historyYear, historyMonth)}.`}
                      </p>
                    </div>
                  ) : (
                    <>
                    <div className="table-responsive">
                      <table className="table table-hover whitespace-nowrap min-w-full">
                        <thead>
                          <tr className="border-b border-defaultborder dark:border-defaultborder/10">
                            <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Student</th>
                            <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Employee ID</th>
                            <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Date</th>
                            <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Day</th>
                            <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Punch In</th>
                            <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Punch Out</th>
                            <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Duration</th>
                            <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">TZ</th>
                            <th className="!text-center !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHistoryList.map((row) => {
                            const initials = (row.studentName || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                            const isActive = !row.punchOut;
                            return (
                              <tr key={row.id} className="border-b border-defaultborder dark:border-defaultborder/10 hover:bg-gray-50/50 dark:hover:bg-light/5 transition-colors">
                                <td className="!py-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="avatar avatar-xs avatar-rounded bg-primary/10 text-primary text-[0.55rem] font-bold">{initials}</span>
                                    <div>
                                      <p className="text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white mb-0">{row.studentName}</p>
                                      <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">{row.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="!py-3 text-[0.8125rem] text-defaulttextcolor dark:text-white">{row.employeeId || "—"}</td>
                                <td className="!py-3 text-[0.8125rem] text-defaulttextcolor dark:text-white">{formatDate(row.date)}</td>
                                <td className="!py-3 text-[0.8125rem] text-[#8c9097]">{row.day ?? "—"}</td>
                                <td className="!py-3 text-[0.8125rem] text-defaulttextcolor dark:text-white">{formatTimeInTimezone(row.punchIn, row.timezone)}</td>
                                <td className="!py-3 text-[0.8125rem]">
                                  {isActive ? <span className="text-warning italic">In progress</span> : <span className="text-defaulttextcolor dark:text-white">{formatTimeInTimezone(row.punchOut, row.timezone)}</span>}
                                </td>
                                <td className="!py-3">
                                  <span className={"text-[0.8125rem] font-medium " + (isActive ? "text-warning" : "text-defaulttextcolor dark:text-white")}>
                                    {isActive ? "In progress" : formatDurationFromMs(row.durationMs ?? null)}
                                  </span>
                                </td>
                                <td className="!py-3 text-[0.6875rem] text-[#8c9097]">{row.timezone}</td>
                                <td className="!py-3 !text-center">
                                  {row.studentId && row.studentExists ? (
                                    <Link href={"/training/attendance/student/" + row.studentId} className="ti-btn ti-btn-icon ti-btn-xs ti-btn-soft-primary ti-btn-wave" title="View Student">
                                      <i className="ri-eye-line" />
                                    </Link>
                                  ) : (
                                    <span className="text-[#8c9097]/40">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {historyPagination.totalPages > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-defaultborder dark:border-defaultborder/10 px-4 py-3">
                        <p className="text-[0.75rem] text-[#8c9097] mb-0">
                          Showing {(historyPagination.page - 1) * historyPagination.limit + 1}–{Math.min(historyPagination.page * historyPagination.limit, historyPagination.total)} of {historyPagination.total}
                        </p>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                            disabled={historyPagination.page <= 1}
                            className="ti-btn ti-btn-sm ti-btn-soft-primary disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="px-2 text-[0.75rem] text-defaulttextcolor dark:text-white">
                            Page {historyPagination.page} of {historyPagination.totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setHistoryPage((p) => Math.min(historyPagination.totalPages, p + 1))}
                            disabled={historyPagination.page >= historyPagination.totalPages}
                            className="ti-btn ti-btn-sm ti-btn-soft-primary disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                    </>
                  )}
                </div>
              </div>
            )}

            {attendanceView === "dashboard" && (
              <AttendanceDashboard
                historyList={filteredHistoryList}
                historyLoading={historyLoading}
                historySearch={trackSearch}
                setHistorySearch={setTrackSearch}
                historyMonthLabel={formatHistoryMonthLabel(historyYear, historyMonth)}
                historyTotal={historyPagination.total}
              />
            )}
          </>
        )}

        {/* No Access */}
        {!canPunch && !loadingStudent && !canTrackAll && trackList.length === 0 && !trackListLoading && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/5">
              <i className="ri-user-unfollow-line text-[2rem] text-primary/30" />
            </div>
            <h3 className="text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white">No student profile found</h3>
            <p className="mt-1 text-[0.8125rem] text-[#8c9097]">Contact an administrator to get access to attendance tracking.</p>
          </div>
        )}
      </div>

      {/* ═══ BACKDATED REQUEST MODAL ═══ */}
      <BackdatedAttendanceRequestModal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        studentId={myStudentId}
        isUserBased={isUserBased}
        candidateTimezone={candidateTimezone}
        weekOffDays={weekOffDays}
      />

      {/* ═══ REQUEST LEAVE MODAL ═══ */}
      <LeaveRequestModal
        open={showLeaveRequestModal}
        onClose={() => setShowLeaveRequestModal(false)}
        studentId={myStudentId}
        weekOffDays={weekOffDays}
      />
    </Fragment>
  );
}
