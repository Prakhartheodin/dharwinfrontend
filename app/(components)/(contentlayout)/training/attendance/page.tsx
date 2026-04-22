"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import * as attendanceApi from "@/shared/lib/api/attendance";
import { createBackdatedAttendanceRequest, createBackdatedAttendanceRequestMe } from "@/shared/lib/api/backdated-attendance-requests";
import { createLeaveRequest } from "@/shared/lib/api/leave-requests";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";
import { useAuth } from "@/shared/contexts/auth-context";
import { downloadCsv } from "@/shared/lib/csv-export";
import AdminTrackView from "./_components/AdminTrackView";
import AttendanceDashboard from "./_components/AttendanceDashboard";
import { capDayTotalMs, countsTowardWorkedMs, sessionDurationMsForDisplay } from "@/shared/lib/attendance-display";
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Calendar year dropdown range (inclusive) */
const CALENDAR_YEAR_START = 2020;
const CALENDAR_YEAR_END = 2150;

export default function AttendanceTracking() {
  const { user, isPlatformSuperUser } = useAuth();
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
  const [isUserBased, setIsUserBased] = useState(false);
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
  const [myAttendanceViewMode, setMyAttendanceViewMode] = useState<"list" | "calendar">("calendar");
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
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [leaveRequestForm, setLeaveRequestForm] = useState<{ fromDate: string; toDate: string; leaveType: "casual" | "sick" | "unpaid"; notes: string }>({
    fromDate: "",
    toDate: "",
    leaveType: "casual",
    notes: "",
  });
  const [submittingLeaveRequest, setSubmittingLeaveRequest] = useState(false);

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
          } else {
            setMyWeekOff([]);
            setMyShift(null);
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
    if (typeof window === "undefined") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (status?.isPunchedIn) e.preventDefault(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status?.isPunchedIn]);

  const handlePunchIn = async () => {
    if (!myStudentId) return;
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
    const from = parseYmdLocal(fromDate);
    const to = parseYmdLocal(toDate);
    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
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
      const payload = {
        attendanceEntries: attendanceEntries.map((e) => ({ date: e.date, punchIn: e.punchIn, punchOut: e.punchOut, timezone: e.timezone })),
        notes: notes.trim() || undefined,
      };
      if (isUserBased) {
        await createBackdatedAttendanceRequestMe(payload);
      } else {
        await createBackdatedAttendanceRequest(myStudentId!, payload);
      }
      await Swal.fire({ icon: "success", title: "Request Submitted", text: "An admin will review it shortly.", confirmButtonText: "OK" });
      setShowRequestModal(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error).message ?? "Failed to submit request.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally { setSubmittingRequest(false); }
  };

  /* Leave request handlers - date range, leave type, notes; skip weekends/week-off like backdated */
  const openLeaveRequestModal = () => {
    setLeaveRequestForm({ fromDate: "", toDate: "", leaveType: "casual", notes: "" });
    setShowLeaveRequestModal(true);
  };
  const updateLeaveRequestForm = (field: keyof typeof leaveRequestForm, value: string) => {
    setLeaveRequestForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleSubmitLeaveRequest = async () => {
    if (!myStudentId) return;
    const { fromDate, toDate, leaveType, notes } = leaveRequestForm;
    if (!fromDate || !toDate) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Please select From date and To date." });
      return;
    }
    const from = parseYmdLocal(fromDate);
    const to = parseYmdLocal(toDate);
    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Invalid date range." });
      return;
    }
    if (to < from) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "To date must be on or after From date." });
      return;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const dates: string[] = [];
    const current = new Date(from);
    current.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    while (current <= end) {
      if (!isWeekOffDay(current)) {
        dates.push(`${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`);
      }
      current.setDate(current.getDate() + 1);
    }
    if (dates.length === 0) {
      await Swal.fire({ icon: "warning", title: "No working days", text: "The selected range has no working days (weekends/week-off excluded)." });
      return;
    }
    setSubmittingLeaveRequest(true);
    try {
      await createLeaveRequest(myStudentId, {
        dates,
        leaveType,
        notes: notes.trim() || undefined,
      });
      await Swal.fire({ icon: "success", title: "Request Submitted", text: "Your leave request has been submitted. An admin will review it shortly.", confirmButtonText: "OK" });
      setShowLeaveRequestModal(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error).message ?? "Failed to submit leave request.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSubmittingLeaveRequest(false);
    }
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
  }, [user?.roleIds, myStudentId, isPlatformSuperUser]);

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
      /** Past scheduled workdays with no punch / leave / holiday row: treat as absent (same idea as StudentAttendanceOverlay). */
      const inferredAbsent =
        isPast &&
        !isTodayCell &&
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
  }, [attendanceList, myCalendarYear, myCalendarMonth, myWeekOff]);

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
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md bg-defaulttextcolor text-white px-4 py-3 shadow-lg text-[0.8125rem]">
          <i className="ri-information-line" />
          {toastMessage}
        </div>
      )}

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
                            onClick={status?.isPunchedIn ? handlePunchOut : handlePunchIn}
                            disabled={punchLoading}
                            className={(status?.isPunchedIn ? "ti-btn-danger" : "ti-btn-success") + " ti-btn ti-btn-wave inline-flex items-center gap-1.5 !py-2 !px-5 !text-[0.8125rem] whitespace-nowrap"}
                            title={status?.isPunchedIn ? "Punch Out" : "Punch In"}
                          >
                            {punchLoading ? (
                              <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> {status?.isPunchedIn ? "Punching Out..." : "Punching In..."}</span>
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
                        <span className="flex items-center gap-1.5 text-[#8c9097] dark:text-white/50"><span className="h-2.5 w-2.5 rounded-full bg-[#8c9097] dark:bg-white/40" /> Week Off</span>
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
                        <div className="grid grid-cols-7">
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
                            else if (cell.weekOff) { cellBg = "bg-gray-50 dark:bg-white/5"; dotColor = "bg-[#8c9097] dark:bg-white/40"; }

                            return (
                              <div
                                key={idx}
                                className={"min-h-[76px] p-2 border border-defaultborder/40 transition-colors " + (isToday ? "ring-2 ring-primary ring-inset bg-primary/10 " : "") + (isEmpty || isFuture ? "bg-gray-50/50 dark:bg-white/5 " : "") + cellBg}
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
                                    {cell.weekOff && <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 font-medium">Week Off</span>}
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
                onExportCsv={exportTrackCsv}
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
                    <div className="inline-flex rounded-xl border border-defaultborder/80 bg-gray-50/60 dark:bg-white/5 p-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setHistoryRange("7d")}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg py-2 px-3 text-[0.75rem] font-semibold transition-all duration-200 ${historyRange === "7d" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor dark:text-white/80 hover:text-defaulttextcolor hover:bg-white/80 dark:hover:bg-white/10"}`}
                      >
                        <span>7 days</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryRange("30d")}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg py-2 px-3 text-[0.75rem] font-semibold transition-all duration-200 ${historyRange === "30d" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor dark:text-white/80 hover:text-defaulttextcolor hover:bg-white/80 dark:hover:bg-white/10"}`}
                      >
                        <span>30 days</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryRange("all")}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg py-2 px-3 text-[0.75rem] font-semibold transition-all duration-200 ${historyRange === "all" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor dark:text-white/80 hover:text-defaulttextcolor hover:bg-white/80 dark:hover:bg-white/10"}`}
                      >
                        <span>All time</span>
                      </button>
                    </div>
                    <div className="inline-flex items-center rounded-xl border border-defaultborder/80 bg-gray-50/60 dark:bg-white/5 p-0.5">
                      <button
                        type="button"
                        onClick={exportHistoryCsv}
                        disabled={filteredHistoryList.length === 0}
                        title="Export CSV"
                        aria-label="Export attendance history as CSV"
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
        <div className="fixed inset-0 z-[105] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="backdated-modal-title">
          <style>{`
            @keyframes backdated-modal-backdrop { from { opacity: 0; } to { opacity: 1; } }
            @keyframes backdated-modal-enter {
              from { opacity: 0; transform: scale(0.96) translateY(-8px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes backdated-modal-stagger { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
            .backdated-modal-backdrop { animation: backdated-modal-backdrop 0.2s ease-out forwards; }
            .backdated-modal-panel { animation: backdated-modal-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
            .backdated-modal-stagger-1 { animation: backdated-modal-stagger 0.35s ease-out 0.05s both; }
            .backdated-modal-stagger-2 { animation: backdated-modal-stagger 0.35s ease-out 0.1s both; }
            .backdated-modal-stagger-3 { animation: backdated-modal-stagger 0.35s ease-out 0.15s both; }
            .backdated-modal-stagger-4 { animation: backdated-modal-stagger 0.35s ease-out 0.2s both; }
            .backdated-modal-stagger-5 { animation: backdated-modal-stagger 0.35s ease-out 0.25s both; }
          `}</style>
          <div className="flex min-h-full items-start justify-center p-4 pt-[8vh] pb-8">
            <div
              className="fixed inset-0 bg-black/55 backdrop-blur-[2px] backdated-modal-backdrop"
              onClick={() => { if (!submittingRequest) setShowRequestModal(false); }}
              aria-hidden
            />
            <div className="relative w-full max-w-[28rem] flex flex-col max-h-[85vh] backdated-modal-panel rounded-2xl border border-defaultborder/80 bg-white dark:bg-bodybg shadow-xl dark:shadow-black/30 overflow-hidden">
              {/* Header with accent – primary to match trigger icon */}
              <div className="relative border-b border-defaultborder/60 bg-gradient-to-br from-primary/10 to-transparent dark:from-primary/20 dark:to-transparent">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" aria-hidden />
                <div className="flex items-start justify-between gap-4 pl-5 pr-4 py-5">
                  <div className="flex items-start gap-4 min-w-0">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 dark:bg-primary/25 text-primary shadow-inner">
                      <i className="ri-calendar-check-line text-[1.5rem]" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 id="backdated-modal-title" className="text-lg font-semibold tracking-tight text-defaulttextcolor dark:text-white">
                        Request Backdated Attendance
                      </h2>
                      <p className="mt-1 text-sm text-defaulttextcolor/65 dark:text-white/55">
                        Submit for past dates you missed. An admin will review.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (!submittingRequest) setShowRequestModal(false); }}
                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label="Close"
                  >
                    <i className="ri-close-line text-xl" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                <div className="backdated-modal-stagger-1 flex items-start gap-3 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30 p-3.5">
                  <i className="ri-information-line text-primary text-lg shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-defaulttextcolor/85 dark:text-white/75 leading-relaxed">
                    Enter a date range (From and To). Punch In and Punch Out will be applied to all <strong>working days</strong>. Weekends are excluded.
                  </p>
                </div>

                <div className="backdated-modal-stagger-2 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Dates</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="backdated-from-date" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">From <span className="text-rose-500">*</span></label>
                      <input
                        id="backdated-from-date"
                        type="date"
                        value={requestForm.fromDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => updateRequestForm("fromDate", e.target.value)}
                        className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="backdated-to-date" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">To <span className="text-rose-500">*</span></label>
                      <input
                        id="backdated-to-date"
                        type="date"
                        value={requestForm.toDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => updateRequestForm("toDate", e.target.value)}
                        className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="backdated-modal-stagger-2 space-y-2">
                  <label htmlFor="backdated-timezone" className="block text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Timezone (candidate&apos;s)</label>
                  <div id="backdated-timezone" className="rounded-xl border border-defaultborder/80 bg-gray-50/80 dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor/90 dark:text-white/80">
                    {requestForm.timezone || candidateTimezone}
                  </div>
                </div>

                <div className="backdated-modal-stagger-3 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Punch times</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="backdated-punch-in" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">Punch In <span className="text-rose-500">*</span></label>
                      <input
                        id="backdated-punch-in"
                        type="time"
                        value={requestForm.punchInTime}
                        onChange={(e) => updateRequestForm("punchInTime", e.target.value)}
                        className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="backdated-punch-out" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">Punch Out <span className="text-rose-500">*</span></label>
                      <input
                        id="backdated-punch-out"
                        type="time"
                        value={requestForm.punchOutTime}
                        onChange={(e) => updateRequestForm("punchOutTime", e.target.value)}
                        className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="backdated-modal-stagger-4 space-y-2">
                  <label htmlFor="backdated-notes" className="block text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Notes <span className="font-normal normal-case text-defaulttextcolor/50">(optional)</span></label>
                  <input
                    id="backdated-notes"
                    type="text"
                    value={requestForm.notes}
                    onChange={(e) => updateRequestForm("notes", e.target.value)}
                    placeholder="e.g. Reason for backdated entry…"
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="backdated-modal-stagger-5 flex items-center justify-end gap-3 border-t border-defaultborder/60 bg-defaultborder/5 dark:bg-white/5 px-5 py-4">
                <button
                  type="button"
                  onClick={() => { if (!submittingRequest) setShowRequestModal(false); }}
                  className="rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                  disabled={submittingRequest}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  className="rounded-xl bg-primary hover:bg-primary/90 active:bg-primary/80 text-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center gap-2"
                  disabled={submittingRequest}
                >
                  {submittingRequest ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line text-base" aria-hidden />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REQUEST LEAVE MODAL ═══ */}
      {showLeaveRequestModal && myStudentId && (
        <div className="fixed inset-0 z-[105] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="leave-modal-title">
          <style>{`
            @keyframes leave-modal-backdrop { from { opacity: 0; } to { opacity: 1; } }
            @keyframes leave-modal-enter {
              from { opacity: 0; transform: scale(0.96) translateY(-8px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes leave-modal-stagger { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
            .leave-modal-backdrop { animation: leave-modal-backdrop 0.2s ease-out forwards; }
            .leave-modal-panel { animation: leave-modal-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
            .leave-modal-stagger-1 { animation: leave-modal-stagger 0.35s ease-out 0.05s both; }
            .leave-modal-stagger-2 { animation: leave-modal-stagger 0.35s ease-out 0.1s both; }
            .leave-modal-stagger-3 { animation: leave-modal-stagger 0.35s ease-out 0.15s both; }
            .leave-modal-stagger-4 { animation: leave-modal-stagger 0.35s ease-out 0.2s both; }
            .leave-modal-stagger-5 { animation: leave-modal-stagger 0.35s ease-out 0.25s both; }
            .leave-type-card:focus-visible { outline: 2px solid rgba(14, 165, 233, 0.6); outline-offset: 2px; }
          `}</style>
          <div className="flex min-h-full items-start justify-center p-4 pt-[8vh] pb-8">
            <div
              className="fixed inset-0 bg-black/55 backdrop-blur-[2px] leave-modal-backdrop"
              onClick={() => { if (!submittingLeaveRequest) setShowLeaveRequestModal(false); }}
              aria-hidden
            />
            <div className="relative w-full max-w-[28rem] flex flex-col max-h-[85vh] leave-modal-panel rounded-2xl border border-defaultborder/80 bg-white dark:bg-bodybg shadow-xl dark:shadow-black/30 overflow-hidden">
              {/* Header with accent */}
              <div className="relative border-b border-defaultborder/60 bg-gradient-to-br from-sky-50/80 to-transparent dark:from-sky-950/20 dark:to-transparent">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-sky-600 dark:from-sky-500 dark:to-sky-700" aria-hidden />
                <div className="flex items-start justify-between gap-4 pl-5 pr-4 py-5">
                  <div className="flex items-start gap-4 min-w-0">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 shadow-inner">
                      <i className="ri-hotel-bed-line text-[1.5rem]" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 id="leave-modal-title" className="text-lg font-semibold tracking-tight text-defaulttextcolor dark:text-white">
                        Request Leave
                      </h2>
                      <p className="mt-1 text-sm text-defaulttextcolor/65 dark:text-white/55">
                        Working days only · Admin will review in Settings » Attendance » Leave Requests
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (!submittingLeaveRequest) setShowLeaveRequestModal(false); }}
                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    aria-label="Close"
                  >
                    <i className="ri-close-line text-xl" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                <div className="leave-modal-stagger-1 flex items-start gap-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/15 border border-sky-200/40 dark:border-sky-700/30 p-3.5">
                  <i className="ri-calendar-event-line text-sky-600 dark:text-sky-400 text-lg shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-defaulttextcolor/85 dark:text-white/75 leading-relaxed">
                    Pick a date range. Only <strong>working days</strong> are included; weekends and your week-off are skipped.
                  </p>
                </div>

                <div className="leave-modal-stagger-2 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Dates</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="leave-from-date" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">From <span className="text-rose-500">*</span></label>
                      <input
                        id="leave-from-date"
                        type="date"
                        value={leaveRequestForm.fromDate}
                        onChange={(e) => updateLeaveRequestForm("fromDate", e.target.value)}
                        className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="leave-to-date" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">To <span className="text-rose-500">*</span></label>
                      <input
                        id="leave-to-date"
                        type="date"
                        value={leaveRequestForm.toDate}
                        onChange={(e) => updateLeaveRequestForm("toDate", e.target.value)}
                        className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="leave-modal-stagger-3 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Leave type</span>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Leave type">
                    {[
                      { value: "casual" as const, label: "Casual", icon: "ri-sun-line", bg: "bg-sky-50 dark:bg-sky-500/10 border-sky-200/60 dark:border-sky-500/30", active: "bg-sky-100 dark:bg-sky-500/20 border-sky-400/60 text-sky-800 dark:text-sky-200" },
                      { value: "sick" as const, label: "Sick", icon: "ri-heart-pulse-line", bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200/60 dark:border-orange-500/30", active: "bg-orange-100 dark:bg-orange-500/20 border-orange-400/60 text-orange-800 dark:text-orange-200" },
                      { value: "unpaid" as const, label: "Unpaid", icon: "ri-bank-card-line", bg: "bg-slate-100 dark:bg-slate-500/10 border-slate-200/60 dark:border-slate-500/30", active: "bg-slate-200/80 dark:bg-slate-500/25 border-slate-400/60 text-slate-800 dark:text-slate-200" },
                    ].map(({ value, label, icon, bg, active }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateLeaveRequestForm("leaveType", value)}
                        className={`leave-type-card flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all duration-200 hover:border-defaulttextcolor/20 dark:hover:border-white/20 ${leaveRequestForm.leaveType === value ? `${active} border-current` : `${bg} border-transparent text-defaulttextcolor/80 dark:text-white/70`}`}
                      >
                        <i className={`${icon} text-lg`} aria-hidden />
                        <span className="text-xs font-semibold">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="leave-modal-stagger-4 space-y-2">
                  <label htmlFor="leave-notes" className="block text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Notes <span className="font-normal normal-case text-defaulttextcolor/50">(optional)</span></label>
                  <input
                    id="leave-notes"
                    type="text"
                    value={leaveRequestForm.notes}
                    onChange={(e) => updateLeaveRequestForm("notes", e.target.value)}
                    placeholder="e.g. Family trip, medical appointment…"
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="leave-modal-stagger-5 flex items-center justify-end gap-3 border-t border-defaultborder/60 bg-defaultborder/5 dark:bg-white/5 px-5 py-4">
                <button
                  type="button"
                  onClick={() => { if (!submittingLeaveRequest) setShowLeaveRequestModal(false); }}
                  className="rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                  disabled={submittingLeaveRequest}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitLeaveRequest}
                  className="rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center gap-2"
                  disabled={submittingLeaveRequest}
                >
                  {submittingLeaveRequest ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line text-base" aria-hidden />
                      Submit request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
