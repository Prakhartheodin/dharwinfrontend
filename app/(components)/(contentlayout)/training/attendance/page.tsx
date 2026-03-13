"use client";

import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import * as attendanceApi from "@/shared/lib/api/attendance";
import { createBackdatedAttendanceRequest } from "@/shared/lib/api/backdated-attendance-requests";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";
import { useAuth } from "@/shared/contexts/auth-context";
import { downloadCsv } from "@/shared/lib/csv-export";
import AdminTrackView from "./_components/AdminTrackView";
import AttendanceDashboard from "./_components/AttendanceDashboard";
import Swal from "sweetalert2";

const POLL_INTERVAL_MS = 30000;
const TRACK_POLL_MS = 10000;
const ELAPSED_UPDATE_MS = 1000;
const SEARCH_DEBOUNCE_MS = 350;
const AUTO_PUNCH_OUT_HOURS = 12;
const AUTO_PUNCH_OUT_WARNING_BEFORE_MS = 15 * 60 * 1000;

function getDetectedTimezone(): string {
  if (typeof window === "undefined") return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
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

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
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
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendanceTracking() {
  const { user } = useAuth();
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
  const [myWeekOff, setMyWeekOff] = useState<string[]>([]);
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
  const [historyRange, setHistoryRange] = useState<"7d" | "30d" | "all">("30d");
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
  const [myAttendanceViewMode, setMyAttendanceViewMode] = useState<"list" | "calendar">("list");
  const [myCalendarYear, setMyCalendarYear] = useState(() => new Date().getFullYear());
  const [myCalendarMonth, setMyCalendarMonth] = useState(() => new Date().getMonth());
  const [trackLiveTick, setTrackLiveTick] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState<{ fromDate: string; toDate: string; punchInTime: string; punchOutTime: string; notes: string; timezone: string }>({
    fromDate: "",
    toDate: "",
    punchInTime: "",
    punchOutTime: "",
    notes: "",
    timezone: "UTC",
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  /* ─── data fetching (unchanged logic) ─── */
  const fetchStatus = useCallback(async (studentId: string) => {
    setStatusLoading(true);
    try { const res = await attendanceApi.getPunchInOutStatus(studentId); setStatus(res); } catch { setStatus(null); } finally { setStatusLoading(false); }
  }, []);

  const fetchList = useCallback(async (studentId: string, params?: attendanceApi.ListAttendanceParams) => {
    setListLoading(true);
    try { const res = await attendanceApi.listAttendance(studentId, params ?? { limit: 500, page: 1 }); setAttendanceList(res.results ?? []); } catch { setAttendanceList([]); } finally { setListLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingStudent(true); setError(null);
      try {
        const student = await attendanceApi.getMyStudentForAttendance();
        if (!cancelled && student?.id) {
          setMyStudentId(student.id);
          const wo = (student as { weekOff?: string[] }).weekOff;
          if (Array.isArray(wo)) setMyWeekOff(wo);
          const shift = (student as { shift?: { name?: string; startTime?: string; endTime?: string; timezone?: string } }).shift;
          setMyShift(shift && typeof shift === "object" ? shift : null);
        }
      } catch (e: unknown) {
        if (!cancelled) { const s = (e as { response?: { status?: number } })?.response?.status; if (s !== 404) setError("Failed to load your profile."); }
      } finally { if (!cancelled) setLoadingStudent(false); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

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
  }, [status?.isPunchedIn, status?.record?.punchIn, autoWarningShown]);

  useEffect(() => {
    if (status?.isPunchedIn === false && prevPunchedInRef.current === true) { setToastMessage("You have been punched out."); setAutoWarningShown(false); }
    prevPunchedInRef.current = status?.isPunchedIn ?? null;
  }, [status?.isPunchedIn]);

  useEffect(() => {
    if (!myStudentId) return;
    attendanceApi.getAttendanceStatistics(myStudentId).then(setSummaryStats).catch(() => setSummaryStats(null));
  }, [myStudentId]);

  useEffect(() => { if (toastMessage) { const t = setTimeout(() => setToastMessage(null), 5000); return () => clearTimeout(t); } }, [toastMessage]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTrackSearch(trackSearch), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trackSearch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (status?.isPunchedIn) e.preventDefault(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status?.isPunchedIn]);

  const handlePunchIn = async () => {
    if (!myStudentId) return; setPunchLoading(true); setError(null);
    try { await attendanceApi.punchInAttendance(myStudentId, { timezone: getDetectedTimezone() }); await fetchStatus(myStudentId); refetchMyMonth(); }
    catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Punch in failed."); }
    finally { setPunchLoading(false); }
  };

  const handlePunchOut = async () => {
    if (!myStudentId) return; setPunchLoading(true); setError(null);
    try { await attendanceApi.punchOutAttendance(myStudentId, { punchOutTime: new Date().toISOString() }); await fetchStatus(myStudentId); refetchMyMonth(); }
    catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Punch out failed."); }
    finally { setPunchLoading(false); }
  };

  /* Backdated request handlers - From/To date range, candidate timezone, skip weekends */
  const defaultTimezone = getDetectedTimezone();
  const candidateTimezone = myShift?.timezone || defaultTimezone;
  const weekOffDays = myWeekOff ?? [];
  const isWeekOffDay = useCallback(
    (date: Date) => {
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      if (weekOffDays.length === 0) return dayName === "Saturday" || dayName === "Sunday";
      return weekOffDays.includes(dayName);
    },
    [weekOffDays]
  );
  const openRequestModal = () => {
    setRequestForm({ fromDate: "", toDate: "", punchInTime: "", punchOutTime: "", notes: "", timezone: candidateTimezone });
    setShowRequestModal(true);
  };
  const updateRequestForm = (field: keyof typeof requestForm, value: string) => {
    setRequestForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleSubmitRequest = async () => {
    if (!myStudentId) return;
    const { fromDate, toDate, punchInTime, punchOutTime, notes, timezone } = requestForm;
    if (!fromDate || !toDate || !punchInTime || !punchOutTime) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Please fill in From date, To date, Punch In, and Punch Out." });
      return;
    }
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Invalid date range." });
      return;
    }
    if (to < from) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "To date must be on or after From date." });
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (from >= today) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "From date must be in the past." });
      return;
    }
    const pIn = punchInTime.includes(":") ? punchInTime : punchInTime + ":00";
    const pOut = punchOutTime.includes(":") ? punchOutTime : punchOutTime + ":00";
    const pad = (n: number) => String(n).padStart(2, "0");
    const attendanceEntries: Array<{ date: string; punchIn: string; punchOut: string; timezone: string }> = [];
    const current = new Date(from);
    current.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    while (current <= end) {
      if (!isWeekOffDay(current)) {
        const dateKey = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
        const punchInDt = new Date(dateKey + "T" + pIn);
        let punchOutDt = new Date(dateKey + "T" + pOut);
        if (punchOutDt <= punchInDt) punchOutDt = new Date(punchOutDt.getTime() + 86400000);
        attendanceEntries.push({
          date: dateKey,
          punchIn: punchInDt.toISOString(),
          punchOut: punchOutDt.toISOString(),
          timezone: timezone || candidateTimezone,
        });
      }
      current.setDate(current.getDate() + 1);
    }
    if (attendanceEntries.length === 0) {
      await Swal.fire({ icon: "warning", title: "No working days", text: "The selected date range has no working days (weekends excluded)." });
      return;
    }
    setSubmittingRequest(true);
    try {
      await createBackdatedAttendanceRequest(myStudentId, {
        attendanceEntries: attendanceEntries.map((e) => ({ date: e.date, punchIn: e.punchIn, punchOut: e.punchOut, timezone: e.timezone })),
        notes: notes.trim() || undefined,
      });
      await Swal.fire({ icon: "success", title: "Request Submitted", text: "An admin will review it shortly.", confirmButtonText: "OK" });
      setShowRequestModal(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error).message ?? "Failed to submit request.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally { setSubmittingRequest(false); }
  };

  /* Admin data: canTrackAll = only for Administrator or students.manage (not for agents with attendance.manage) */
  useEffect(() => {
    if (!user?.roleIds?.length || myStudentId !== null) {
      setCanTrackAll(false);
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
      const hasStudentsManage = Array.from(perms).some((p) => p === "students.manage" || p.startsWith("students.manage"));
      const canSeeAdminTrack = admin || hasStudentsManage;
      if (!cancelled) {
        setCanTrackAll(canSeeAdminTrack);
        setCanPunchOutOthers(admin || hasStudentsManage || Array.from(perms).some((p) => p === "attendance.manage" || p === "training.attendance:view,create,edit" || (p.includes("training.attendance") && (p.includes("create") || p.includes("edit")))));
      }
    }).catch(() => { if (!cancelled) { setCanTrackAll(false); setCanPunchOutOthers(false); } });
    return () => { cancelled = true; };
  }, [user?.roleIds, myStudentId]);

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

  const handleAdminPunchOut = useCallback(async (studentId: string) => {
    setPunchOutLoadingId(studentId);
    try {
      await attendanceApi.punchOutAttendance(studentId, {});
      await attendanceApi.getAttendanceTrackList({ search: debouncedTrackSearch || undefined }).then((res) => setTrackList(res.results ?? []));
      const params = historyRange === "7d" ? { startDate: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), search: debouncedTrackSearch || undefined } : historyRange === "30d" ? { startDate: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), search: debouncedTrackSearch || undefined } : { search: debouncedTrackSearch || undefined };
      attendanceApi.getAttendanceTrackHistory(params).then((res) => setHistoryList(res.results ?? []));
    } catch { /* keep as is */ } finally { setPunchOutLoadingId(null); }
  }, [historyRange, debouncedTrackSearch]);

  const fetchHistoryList = useCallback(() => {
    if (!canTrackAll || myStudentId !== null) return;
    const params = historyRange === "7d" ? { startDate: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), limit: 500, search: debouncedTrackSearch || undefined }
      : historyRange === "30d" ? { startDate: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), limit: 500, search: debouncedTrackSearch || undefined } : { limit: 500, search: debouncedTrackSearch || undefined };
    setHistoryLoading(true);
    attendanceApi.getAttendanceTrackHistory(params).then((res) => setHistoryList(res.results ?? [])).catch(() => setHistoryList([])).finally(() => setHistoryLoading(false));
  }, [canTrackAll, myStudentId, historyRange, debouncedTrackSearch]);

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

  const exportTrackCsv = useCallback((list?: attendanceApi.AttendanceTrackItem[]) => {
    const data = list ?? trackList;
    const rows = data.map((row) => ({ Name: row.studentName, "Employee ID": row.employeeId ?? "", Email: row.email, Status: row.isPunchedIn ? "Punched In" : "Punched Out", "Punch In": row.punchIn ? formatTimeInTimezone(row.punchIn, row.timezone) : "", "Punch Out": row.punchOut ? formatTimeInTimezone(row.punchOut, row.timezone) : "", Duration: row.isPunchedIn ? "In progress" : formatDurationFromMs(row.durationMs ?? null), Timezone: row.timezone }));
    downloadCsv(`track-attendance-${new Date().toISOString().slice(0, 10)}.csv`, [{ key: "Name", label: "Name" }, { key: "Employee ID", label: "Employee ID" }, { key: "Email", label: "Email" }, { key: "Status", label: "Status" }, { key: "Punch In", label: "Punch In" }, { key: "Punch Out", label: "Punch Out" }, { key: "Duration", label: "Duration" }, { key: "Timezone", label: "Timezone" }], rows);
  }, [trackList]);

  const filteredHistoryList = historyList;

  const exportHistoryCsv = useCallback(() => {
    const rows = filteredHistoryList.map((row) => ({ Name: row.studentName, "Employee ID": row.employeeId ?? "", Email: row.email, Date: formatDate(row.date), Day: row.day ?? "", "Punch In": row.punchIn ? formatTimeInTimezone(row.punchIn, row.timezone) : "", "Punch Out": row.punchOut ? formatTimeInTimezone(row.punchOut, row.timezone) : "", Duration: formatDurationFromMs(row.durationMs ?? null), Timezone: row.timezone }));
    downloadCsv(`attendance-history-${new Date().toISOString().slice(0, 10)}.csv`, [{ key: "Name", label: "Name" }, { key: "Employee ID", label: "Employee ID" }, { key: "Email", label: "Email" }, { key: "Date", label: "Date" }, { key: "Day", label: "Day" }, { key: "Punch In", label: "Punch In" }, { key: "Punch Out", label: "Punch Out" }, { key: "Duration", label: "Duration" }, { key: "Timezone", label: "Timezone" }], rows);
  }, [filteredHistoryList]);

  const canPunch = !!myStudentId;
  const isCandidateOnly = canPunch && !canTrackAll;

  /* Calendar */
  const DAY_NAME_MAP = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const getMyAttendanceCalendarData = useCallback((): Array<{ day: number; date: Date; present: boolean; incomplete: boolean; holiday: boolean; leave: boolean; absent: boolean; weekOff: boolean; totalHours: number; holidayName: string }> => {
    const year = myCalendarYear; const month = myCalendarMonth;
    const firstDay = new Date(year, month, 1); const startDayOfWeek = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0); const daysInMonth = lastDay.getDate();
    const weekOffSet = new Set(myWeekOff.map((d) => d.trim()));
    const byDate: Record<string, { present: boolean; incomplete: boolean; holiday: boolean; leave: boolean; absent: boolean; totalMs: number; holidayName: string }> = {};
    attendanceList.forEach((r) => {
      const dateKey = getLocalDateKey(r.date ?? ""); if (!dateKey) return;
      const hasOut = !!r.punchOut; const ms = (r.duration ?? 0) || 0;
      const recStatus = r.status;
      if (!byDate[dateKey]) byDate[dateKey] = { present: false, incomplete: false, holiday: false, leave: false, absent: false, totalMs: 0, holidayName: "" };
      if (recStatus === "Holiday") { byDate[dateKey].holiday = true; byDate[dateKey].holidayName = getHolidayNameFromNotes(r.notes) || "Holiday"; }
      else if (recStatus === "Leave") { byDate[dateKey].leave = true; }
      else if (recStatus === "Absent") { byDate[dateKey].absent = true; }
      else if (hasOut) { byDate[dateKey].present = true; byDate[dateKey].totalMs += ms; }
      else { byDate[dateKey].incomplete = true; }
    });
    const cells: Array<{ day: number; date: Date; present: boolean; incomplete: boolean; holiday: boolean; leave: boolean; absent: boolean; weekOff: boolean; totalHours: number; holidayName: string }> = [];
    for (let i = 0; i < startDayOfWeek; i++) cells.push({ day: 0, date: new Date(year, month, -startDayOfWeek + 1 + i), present: false, incomplete: false, holiday: false, leave: false, absent: false, weekOff: false, totalHours: 0, holidayName: "" });
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const info = byDate[dateKey] || { present: false, incomplete: false, holiday: false, leave: false, absent: false, totalMs: 0, holidayName: "" };
      const dayName = DAY_NAME_MAP[date.getDay()];
      const isWeekOff = weekOffSet.has(dayName) && !info.present && !info.holiday && !info.leave && !info.incomplete;
      cells.push({ day, date, present: info.present, incomplete: info.incomplete && !info.present, holiday: info.holiday, leave: info.leave, absent: info.absent, weekOff: isWeekOff, totalHours: Math.round((info.totalMs / 3600000) * 100) / 100, holidayName: info.holidayName });
    }
    return cells;
  }, [attendanceList, myCalendarYear, myCalendarMonth, myWeekOff]);

  const refreshMyAttendanceList = useCallback(() => { refetchMyMonth(); }, [refetchMyMonth]);

  /* ═══ RENDER ═══ */
  return (
    <Fragment>
      <Seo title={isCandidateOnly ? "Attendance" : "Attendance Tracking"} />
      <Pageheader
        currentpage={isCandidateOnly ? "Attendance" : "Attendance Tracking"}
        activepage={isCandidateOnly ? "Attendance" : "Training Management"}
        mainpage={isCandidateOnly ? "Attendance" : "Attendance Tracking"}
      />

      {/* Sticky Active Banner */}
      {canPunch && status?.isPunchedIn && (
        <div className="sticky top-0 z-10 mx-4 mb-4">
          <div className="flex items-center justify-between gap-3 rounded-md bg-success/10 border border-success/20 px-4 py-2.5">
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
            <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50">
              <i className="ri-global-line me-1" />
              {getDetectedTimezone()}
            </span>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md bg-defaulttextcolor text-white px-4 py-3 shadow-lg text-[0.8125rem]">
          <i className="ri-information-line" />
          {toastMessage}
        </div>
      )}

      <div className="container w-full max-w-full mx-auto">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
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
                  <div className="box-header flex items-center justify-between">
                    <div className="box-title flex items-center gap-2">
                      <i className="ri-fingerprint-line text-primary text-[1.1rem]" />
                      Time Clock
                    </div>
                    <button
                      type="button"
                      onClick={openRequestModal}
                      className="ti-btn ti-btn-icon ti-btn-sm ti-btn-outline-primary flex-shrink-0"
                      title="Backdate Request"
                    >
                      <i className="ri-calendar-check-line" />
                    </button>
                  </div>
                  <div className="box-body">
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
                            className="ti-btn ti-btn-success ti-btn-wave inline-flex items-center gap-1.5 !py-2 !px-5 !text-[0.8125rem] whitespace-nowrap"
                            onClick={handlePunchIn}
                            disabled={punchLoading || !!status?.isPunchedIn}
                          >
                            {punchLoading && !status?.isPunchedIn ? (
                              <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Punching In...</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5"><i className="ri-login-box-line" /> Punch In</span>
                            )}
                          </button>
                          <button
                            type="button"
                            className="ti-btn ti-btn-danger ti-btn-wave inline-flex items-center gap-1.5 !py-2 !px-5 !text-[0.8125rem] whitespace-nowrap"
                            onClick={handlePunchOut}
                            disabled={punchLoading || !status?.isPunchedIn}
                          >
                            {punchLoading && status?.isPunchedIn ? (
                              <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Punching Out...</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5"><i className="ri-logout-box-r-line" /> Punch Out</span>
                            )}
                          </button>
                        </div>
                        <p className="mt-2 text-[0.6875rem] text-[#8c9097] dark:text-white/50">
                          <i className="ri-global-line me-1" />{getDetectedTimezone()}
                        </p>
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
                          {myShift.timezone && (
                            <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mt-1">
                              <i className="ri-global-line me-1" />
                              {myShift.timezone}
                            </p>
                          )}
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
                  {/* View toggle */}
                  <div className="inline-flex rounded-md border border-defaultborder overflow-hidden flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setMyAttendanceViewMode("list")}
                      className={"inline-flex items-center gap-1.5 whitespace-nowrap !py-1 !px-3 text-[0.75rem] font-medium transition-colors " + (myAttendanceViewMode === "list" ? "bg-primary text-white" : "bg-white dark:bg-bodybg text-defaulttextcolor dark:text-white hover:bg-gray-50")}
                    >
                      <i className="ri-list-unordered" />
                      <span>List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMyAttendanceViewMode("calendar")}
                      className={"inline-flex items-center gap-1.5 whitespace-nowrap !py-1 !px-3 text-[0.75rem] font-medium transition-colors border-l border-defaultborder " + (myAttendanceViewMode === "calendar" ? "bg-primary text-white" : "bg-white dark:bg-bodybg text-defaulttextcolor dark:text-white hover:bg-gray-50")}
                    >
                      <i className="ri-calendar-line" />
                      <span>Calendar</span>
                    </button>
                  </div>
                  <div className="h-5 w-px bg-defaultborder flex-shrink-0 hidden sm:block" aria-hidden="true" />
                  <button type="button" className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light flex-shrink-0" onClick={refreshMyAttendanceList} disabled={listLoading} title="Refresh">
                    <i className={"ri-refresh-line" + (listLoading ? " animate-spin" : "")} />
                  </button>
                  <button type="button" className="ti-btn ti-btn-icon ti-btn-sm ti-btn-outline-primary flex-shrink-0" onClick={exportMyAttendanceCsv} disabled={attendanceList.length === 0} title="Export CSV">
                    <i className="ri-download-2-line" />
                  </button>
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
                      <div className="table-responsive">
                        <table className="table table-hover whitespace-nowrap min-w-full">
                          <thead>
                            <tr className="border-b border-defaultborder dark:border-defaultborder/10">
                              <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Date</th>
                              <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Day</th>
                              <th className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Status</th>
                              <th className="!text-end !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Punch In</th>
                              <th className="!text-end !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Punch Out</th>
                              <th className="!text-end !text-[0.75rem] !font-semibold text-[#8c9097] !py-3">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceList.map((r) => {
                              const recordTz = r.timezone ?? "UTC";
                              const recStatus = (r as { status?: string }).status;
                              const isHolidayOrLeave = recStatus === "Holiday" || recStatus === "Leave";
                              return (
                                <tr key={r.id} className={"border-b border-defaultborder dark:border-defaultborder/10 transition-colors " + (isHolidayOrLeave ? "bg-info/[0.02]" : "hover:bg-gray-50/50 dark:hover:bg-light/5")}>
                                  <td className="!py-3 text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white">{formatDate(r.date)}</td>
                                  <td className="!py-3 text-[0.8125rem] text-[#8c9097]">{r.day ?? "—"}</td>
                                  <td className="!py-3">
                                    {recStatus === "Holiday" ? (
                                      <span className="badge bg-info/10 text-info !rounded-full !text-[0.6875rem]">
                                        <i className="ri-sun-line me-1 text-[0.55rem]" />
                                        {(r as { notes?: string }).notes ? getHolidayNameFromNotes((r as { notes?: string }).notes) || "Holiday" : "Holiday"}
                                      </span>
                                    ) : recStatus === "Leave" ? (
                                      <span className="badge bg-secondary/10 text-secondary !rounded-full !text-[0.6875rem]">
                                        <i className="ri-hotel-bed-line me-1 text-[0.55rem]" />Leave
                                      </span>
                                    ) : recStatus === "Absent" ? (
                                      <span className="badge bg-danger/10 text-danger !rounded-full !text-[0.6875rem]">
                                        <i className="ri-close-circle-line me-1 text-[0.55rem]" />Absent
                                      </span>
                                    ) : (
                                      <span className="badge bg-success/10 text-success !rounded-full !text-[0.6875rem]">
                                        <i className="ri-checkbox-circle-line me-1 text-[0.55rem]" />Present
                                      </span>
                                    )}
                                  </td>
                                  <td className="!py-3 !text-end text-[0.8125rem] text-defaulttextcolor dark:text-white">{isHolidayOrLeave ? "—" : formatTimeOnlyInTimezone(r.punchIn, recordTz)}</td>
                                  <td className="!py-3 !text-end text-[0.8125rem] text-defaulttextcolor dark:text-white">{isHolidayOrLeave ? "—" : (r.punchOut ? formatTimeOnlyInTimezone(r.punchOut, recordTz) : <span className="text-[#8c9097] italic">Active</span>)}</td>
                                  <td className="!py-3 !text-end">
                                    <span className={"text-[0.8125rem] font-medium " + (!isHolidayOrLeave && !r.punchOut && status?.isPunchedIn && status?.record?.id === r.id ? "text-success" : "text-defaulttextcolor dark:text-white")}>
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
                      <h4 className="text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white">
                        {MONTH_NAMES[myCalendarMonth]} {myCalendarYear}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => { const prev = myCalendarMonth === 0 ? 11 : myCalendarMonth - 1; setMyCalendarMonth(prev); if (myCalendarMonth === 0) setMyCalendarYear((y) => y - 1); }} className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light !rounded-full">
                          <i className="ri-arrow-left-s-line" />
                        </button>
                        <button
                          type="button"
                          className="ti-btn ti-btn-sm ti-btn-soft-primary !py-1 !px-3 !text-[0.75rem]"
                          onClick={() => { setMyCalendarYear(new Date().getFullYear()); setMyCalendarMonth(new Date().getMonth()); }}
                        >
                          Today
                        </button>
                        <button type="button" onClick={() => { const next = myCalendarMonth === 11 ? 0 : myCalendarMonth + 1; setMyCalendarMonth(next); if (myCalendarMonth === 11) setMyCalendarYear((y) => y + 1); }} className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light !rounded-full">
                          <i className="ri-arrow-right-s-line" />
                        </button>
                        <select className="form-control !w-auto !py-1 !px-2 !text-[0.75rem] !rounded-md" value={myCalendarYear} onChange={(e) => setMyCalendarYear(parseInt(e.target.value, 10))}>
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
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
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> Week Off</span>
                      )}
                    </div>

                    {listLoading && attendanceList.length === 0 ? (
                      <div className="py-8 text-center text-[#8c9097]">Loading calendar...</div>
                    ) : (
                      <div className="rounded-md border border-defaultborder overflow-hidden">
                        <div className="grid grid-cols-7 bg-gray-50/80 dark:bg-black/10">
                          {DAY_HEADERS.map((d) => (
                            <div key={d} className="py-2 text-center text-[0.6875rem] font-semibold text-[#8c9097] dark:text-white/50 uppercase tracking-wider">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7">
                          {getMyAttendanceCalendarData().map((cell, idx) => {
                            const today = new Date(); today.setHours(0, 0, 0, 0);
                            const cellDate = new Date(cell.date); cellDate.setHours(0, 0, 0, 0);
                            const isToday = cellDate.getTime() === today.getTime();
                            const isEmpty = cell.day === 0;
                            const isFuture = cellDate > today;

                            let cellBg = "";
                            let dotColor = "";
                            if (cell.holiday) { cellBg = "bg-info/[0.06]"; dotColor = "bg-info"; }
                            else if (cell.leave) { cellBg = "bg-secondary/[0.06]"; dotColor = "bg-secondary"; }
                            else if (cell.absent) { cellBg = "bg-danger/[0.06]"; dotColor = "bg-danger"; }
                            else if (cell.present) { cellBg = "bg-success/[0.04]"; dotColor = "bg-success"; }
                            else if (cell.incomplete) { cellBg = "bg-warning/[0.04]"; dotColor = "bg-warning"; }
                            else if (cell.weekOff) { cellBg = "bg-gray-100/60 dark:bg-white/5"; dotColor = "bg-gray-400"; }

                            return (
                              <div
                                key={idx}
                                className={"min-h-[76px] p-2 border border-defaultborder/40 transition-colors " + (isToday ? "ring-2 ring-primary ring-inset bg-primary/[0.02] " : "") + (isEmpty || isFuture ? "bg-gray-50/30 dark:bg-black/5 " : "") + cellBg}
                              >
                                {cell.day > 0 && (
                                  <div className="flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={"text-[0.75rem] font-medium " + (isToday ? "text-primary font-bold" : "text-defaulttextcolor/80 dark:text-white/70")}>
                                        {cell.day}
                                      </span>
                                      {dotColor && <span className={"h-1.5 w-1.5 rounded-full " + dotColor} />}
                                    </div>
                                    {cell.holiday && (
                                      <span className="text-[0.55rem] text-info font-medium truncate">{cell.holidayName || "Holiday"}</span>
                                    )}
                                    {cell.leave && <span className="text-[0.55rem] text-secondary font-medium">Leave</span>}
                                    {cell.absent && <span className="text-[0.55rem] text-danger font-medium">Absent</span>}
                                    {cell.weekOff && <span className="text-[0.55rem] text-gray-400 font-medium">Week Off</span>}
                                    {cell.present && cell.totalHours > 0 && (
                                      <span className="text-[0.6rem] text-success font-semibold mt-auto">{cell.totalHours}h</span>
                                    )}
                                    {cell.incomplete && <span className="text-[0.55rem] text-warning font-medium">Active</span>}
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
                onExportCsv={exportTrackCsv}
                formatTimeInTimezone={formatTimeInTimezone}
                formatDuration={formatDuration}
                formatDurationFromMs={formatDurationFromMs}
              />
            )}

            {attendanceView === "history" && (
              <div className="box">
                <div className="box-header flex flex-wrap items-center justify-between gap-3">
                  <div className="box-title">Attendance History</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8c9097] dark:text-white/50 text-[0.9rem] pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search by name, email, or employee ID..."
                        value={trackSearch}
                        onChange={(e) => setTrackSearch(e.target.value)}
                        className="form-control !pl-9 !py-1.5 !text-[0.8125rem] !rounded-md !border-defaultborder dark:!border-defaultborder/10 !w-[200px] sm:!w-[220px]"
                      />
                    </div>
                    <select
                      className="form-control !w-auto !py-1.5 !px-3 !text-[0.75rem] !rounded-md"
                      value={historyRange}
                      onChange={(e) => setHistoryRange((e.target.value as "7d" | "30d" | "all") || "30d")}
                    >
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="all">All time</option>
                    </select>
                    <button type="button" className="ti-btn ti-btn-icon ti-btn-sm ti-btn-outline-primary flex-shrink-0" onClick={exportHistoryCsv} disabled={filteredHistoryList.length === 0} title="Export CSV">
                      <i className="ri-download-2-line" />
                    </button>
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
                        {historyList.length === 0 ? "No records in this period" : "No matches for your search"}
                      </p>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
            )}

            {attendanceView === "dashboard" && (
              <AttendanceDashboard historyList={filteredHistoryList} historyLoading={historyLoading} historySearch={trackSearch} setHistorySearch={setTrackSearch} />
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
      {showRequestModal && myStudentId && (
        <div className="fixed inset-0 z-[105] overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-[5vh]">
            <div className="fixed inset-0 bg-black/50" onClick={() => { if (!submittingRequest) setShowRequestModal(false); }} />
            <div className="relative w-full max-w-2xl rounded-md bg-white dark:bg-bodybg shadow-lg flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-defaultborder px-5 py-4">
                <div>
                  <h6 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white">
                    <i className="ri-calendar-check-line text-primary" />
                    Request Backdated Attendance
                  </h6>
                  <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-0.5 mb-0">Submit for past dates you missed. An admin will review.</p>
                </div>
                <button type="button" onClick={() => { if (!submittingRequest) setShowRequestModal(false); }} className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light !rounded-full">
                  <i className="ri-close-line" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="flex items-start gap-2 rounded-md bg-info/5 border border-info/20 p-3">
                  <i className="ri-information-line text-info mt-0.5" />
                  <p className="text-[0.75rem] text-defaulttextcolor dark:text-white/80 mb-0">
                    Enter a date range (From and To). Punch In and Punch Out will be applied to all working days. Weekends are excluded.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label mb-1 text-[0.75rem] font-medium text-[#8c9097]">From date <span className="text-danger">*</span></label>
                    <input type="date" value={requestForm.fromDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => updateRequestForm("fromDate", e.target.value)} className="form-control !rounded-md !text-[0.8125rem]" />
                  </div>
                  <div>
                    <label className="form-label mb-1 text-[0.75rem] font-medium text-[#8c9097]">To date <span className="text-danger">*</span></label>
                    <input type="date" value={requestForm.toDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => updateRequestForm("toDate", e.target.value)} className="form-control !rounded-md !text-[0.8125rem]" />
                  </div>
                </div>

                <div>
                  <label className="form-label mb-1 text-[0.75rem] font-medium text-[#8c9097]">Timezone (candidate&apos;s)</label>
                  <div className="form-control !rounded-md !text-[0.8125rem] !bg-gray-50 dark:!bg-black/10">{requestForm.timezone || candidateTimezone}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label mb-1 text-[0.75rem] font-medium text-[#8c9097]">Punch In <span className="text-danger">*</span></label>
                    <input type="time" value={requestForm.punchInTime} onChange={(e) => updateRequestForm("punchInTime", e.target.value)} className="form-control !rounded-md !text-[0.8125rem]" />
                  </div>
                  <div>
                    <label className="form-label mb-1 text-[0.75rem] font-medium text-[#8c9097]">Punch Out <span className="text-danger">*</span></label>
                    <input type="time" value={requestForm.punchOutTime} onChange={(e) => updateRequestForm("punchOutTime", e.target.value)} className="form-control !rounded-md !text-[0.8125rem]" />
                  </div>
                </div>

                <div>
                  <label className="form-label mb-1 text-[0.75rem] font-medium text-[#8c9097]">Notes <span className="text-[0.6875rem] font-normal">(optional)</span></label>
                  <input type="text" value={requestForm.notes} onChange={(e) => updateRequestForm("notes", e.target.value)} placeholder="Reason for backdated entry..." className="form-control !rounded-md !text-[0.8125rem]" />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-defaultborder px-5 py-4">
                <button type="button" onClick={() => { if (!submittingRequest) setShowRequestModal(false); }} className="ti-btn ti-btn-light" disabled={submittingRequest}>
                  Cancel
                </button>
                <button type="button" onClick={handleSubmitRequest} className="ti-btn ti-btn-primary ti-btn-wave" disabled={submittingRequest}>
                  {submittingRequest ? (
                    <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Submitting...</span>
                  ) : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
