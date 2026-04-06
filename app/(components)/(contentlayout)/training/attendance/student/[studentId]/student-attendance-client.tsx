"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as attendanceApi from "@/shared/lib/api/attendance";
import * as studentsApi from "@/shared/lib/api/students";
import { listCandidates } from "@/shared/lib/api/candidates";
import { createBackdatedAttendanceRequest } from "@/shared/lib/api/backdated-attendance-requests";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";
import Swal from "sweetalert2";
import {
  capDayTotalMs,
  countsTowardWorkedMs,
  sessionDurationMsForDisplay,
} from "@/shared/lib/attendance-display";

const POLL_INTERVAL_MS = 30000;
const POLL_INTERVAL_PUNCHED_IN_MS = 15000;
const ELAPSED_UPDATE_MS = 1000;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const CALENDAR_YEAR_START = 2020;
const CALENDAR_YEAR_END = 2150;

function formatDurationHours(ms: number): number {
  if (ms <= 0) return 0;
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

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

/** Format time in record's timezone so punch in/out are consistent with auto punch-out. */
function formatTimeOnlyInTimezone(dateStr: string | null, timezone: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleTimeString(undefined, {
      timeZone: timezone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return new Date(dateStr).toLocaleTimeString();
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Get YYYY-MM-DD in local time for an ISO date string (for display) */
function getLocalDateKey(isoDateStr: string): string {
  if (!isoDateStr) return "";
  const d = new Date(isoDateStr);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** joiningDate / resignDate (ISO) → local calendar day (same as attendance overlays). */
function parseCalendarDayLocal(raw: string | null | undefined): Date | null {
  if (raw == null || String(raw).trim() === "") return null;
  const ymd = String(raw).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function StudentAttendancePage() {
  const params = useParams();
  const studentId = typeof params.studentId === "string" ? params.studentId : "";
  const [student, setStudent] = useState<studentsApi.Student | null>(null);
  /** Local midnight of last employment day from linked ATS candidate (candidate.resignDate). */
  const [resignDateEnd, setResignDateEnd] = useState<Date | null>(null);
  const [status, setStatus] = useState<attendanceApi.PunchStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceList, setAttendanceList] = useState<attendanceApi.AttendanceRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [elapsedDisplay, setElapsedDisplay] = useState("");
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [canRegularize, setCanRegularize] = useState(false);
  const [showBackDateModal, setShowBackDateModal] = useState(false);
  const [backDateMode, setBackDateMode] = useState<"range" | "entries">("entries");
  const [backDateRangeForm, setBackDateRangeForm] = useState<{ fromDate: string; toDate: string; punchInTime: string; punchOutTime: string; notes: string; timezone: string }>({
    fromDate: "",
    toDate: "",
    punchInTime: "",
    punchOutTime: "",
    notes: "",
    timezone: "UTC",
  });
  const [backDateEntries, setBackDateEntries] = useState<Array<{ date: string; punchInTime: string; punchOutTime: string; notes: string; timezone: string }>>([]);
  const [addingBackDate, setAddingBackDate] = useState(false);
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
  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [addLeaveForm, setAddLeaveForm] = useState<{ fromDate: string; toDate: string; leaveType: "casual" | "sick" | "unpaid"; notes: string }>({
    fromDate: "",
    toDate: "",
    leaveType: "casual",
    notes: "",
  });
  const [addingLeave, setAddingLeave] = useState(false);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const { user, isPlatformSuperUser, isAdministrator: authIsAdministrator } = useAuth();

  const fetchStatus = useCallback(async () => {
    if (!studentId) return;
    setStatusLoading(true);
    try {
      const res = await attendanceApi.getPunchInOutStatus(studentId);
      setStatus(res);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [studentId]);

  const fetchList = useCallback(
    async (params?: attendanceApi.ListAttendanceParams) => {
      if (!studentId) return;
      setListLoading(true);
      try {
        const res = await attendanceApi.listAttendance(studentId, params ?? { limit: 500, page: 1 });
        setAttendanceList(res.results ?? []);
      } catch {
        setAttendanceList([]);
      } finally {
        setListLoading(false);
      }
    },
    [studentId]
  );

  const refetchForMonth = useCallback(() => {
    const last = new Date(calendarYear, calendarMonth + 1, 0);
    const startDate = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-01`;
    const endDate = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
    fetchList({ startDate, endDate, limit: 500, page: 1 });
  }, [calendarYear, calendarMonth, fetchList]);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    studentsApi.getStudent(studentId).then((s) => {
      if (!cancelled) setStudent(s);
    }).catch(() => {
      if (!cancelled) setError("Student not found.");
    });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  useEffect(() => {
    if (!student?.user?.id) {
      setResignDateEnd(null);
      return;
    }
    let cancelled = false;
    listCandidates({ owner: student.user.id, limit: 1, page: 1 })
      .then((res) => {
        if (cancelled) return;
        const c = res.results?.[0];
        setResignDateEnd(parseCalendarDayLocal(c?.resignDate ?? undefined));
      })
      .catch(() => {
        if (!cancelled) setResignDateEnd(null);
      });
    return () => {
      cancelled = true;
    };
  }, [student?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    attendanceApi.getMyStudentForAttendance()
      .then((s) => {
        if (!cancelled && s?.id) setMyStudentId(s.id);
      })
      .catch(() => {
        if (!cancelled) setMyStudentId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isPlatformSuperUser || authIsAdministrator) {
      setCanRegularize(true);
      return;
    }
    if (!user?.roleIds?.length) {
      setCanRegularize(false);
      return;
    }
    let cancelled = false;
    rolesApi.listRoles({ limit: 100 }).then((res) => {
      const roles = (res.results ?? []) as Role[];
      const map = new Map(roles.map((r) => [r.id, r]));
      const admin = (user!.roleIds as string[]).some((id) => map.get(id)?.name === "Administrator");
      const hasManage = (user!.roleIds as string[]).some((id) => {
        const role = map.get(id);
        return role?.permissions?.some((p) => p === "students.manage" || p.startsWith("students.manage"));
      });
      if (!cancelled) setCanRegularize(admin || !!hasManage);
    }).catch(() => {
      if (!cancelled) setCanRegularize(false);
    });
    return () => { cancelled = true; };
  }, [user?.roleIds, isPlatformSuperUser, authIsAdministrator]);

  useEffect(() => {
    if (!studentId) return;
    fetchStatus();
    refetchForMonth();
    const pollMs = status?.isPunchedIn ? POLL_INTERVAL_PUNCHED_IN_MS : POLL_INTERVAL_MS;
    const id = setInterval(fetchStatus, pollMs);
    return () => clearInterval(id);
  }, [studentId, viewMode, calendarYear, calendarMonth, fetchStatus, refetchForMonth, status?.isPunchedIn]);

  useEffect(() => {
    if (!studentId) return;
    const onVisible = () => {
      fetchStatus();
      refetchForMonth();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [studentId, viewMode, calendarYear, calendarMonth, refetchForMonth, fetchStatus]);

  useEffect(() => {
    if (!status?.isPunchedIn || !status?.record?.punchIn) {
      setElapsedDisplay("");
      return;
    }
    const punchInMs = new Date(status.record.punchIn).getTime();
    const tick = () => {
      setElapsedDisplay(attendanceApi.formatElapsedSession(Date.now() - punchInMs));
    };
    tick();
    const id = setInterval(tick, ELAPSED_UPDATE_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [status?.isPunchedIn, status?.record?.punchIn]);

  const handlePunchIn = async () => {
    if (!studentId) return;
    setPunchLoading(true);
    setError(null);
    try {
      const res = await attendanceApi.punchInAttendance(studentId, { timezone: getDetectedTimezone() });
      const rec = res.data;
      const punchInIso =
        typeof rec.punchIn === "string" ? rec.punchIn : new Date(rec.punchIn as unknown as string).toISOString();
      const dateIso =
        typeof rec.date === "string" ? rec.date : new Date(rec.date as unknown as string).toISOString();
      setStatus((prev) => ({
        isPunchedIn: true,
        record: {
          id: rec.id,
          punchIn: punchInIso,
          timezone: rec.timezone ?? getDetectedTimezone(),
          date: dateIso,
        },
        elapsedPreview: prev?.elapsedPreview ?? null,
        shift: prev?.shift,
      }));
      await fetchStatus();
      refetchForMonth();
      void Swal.fire({
        icon: "success",
        title: "Punched in",
        timer: 2200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Punch in failed.");
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!studentId) return;
    setPunchLoading(true);
    setError(null);
    try {
      const res = await attendanceApi.punchOutAttendance(studentId, { punchOutTime: new Date().toISOString() });
      const rec = res.data;
      const dur = rec.duration ?? 0;
      const tz = rec.timezone ?? "UTC";
      const po = rec.punchOut;
      await fetchStatus();
      refetchForMonth();
      await Swal.fire({
        icon: "success",
        title: "Punched out",
        html: `<p class="mb-2">Recorded: <strong>${formatDuration(dur)}</strong> (${formatDurationHours(dur)} h)</p><p class="text-sm opacity-80">Out at ${formatTimeOnlyInTimezone(po, tz)}</p>`,
        confirmButtonText: "OK",
      });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Punch out failed.");
    } finally {
      setPunchLoading(false);
    }
  };

  const defaultTimezone = getDetectedTimezone();
  const candidateTimezone = student?.shift?.timezone || defaultTimezone;

  const openRegularizationModal = () => {
    const tz = student?.shift?.timezone || defaultTimezone;
    setBackDateMode("entries");
    setBackDateRangeForm({ fromDate: "", toDate: "", punchInTime: "", punchOutTime: "", notes: "", timezone: tz });
    setBackDateEntries([{ date: "", punchInTime: "", punchOutTime: "", notes: "", timezone: tz }]);
    setShowBackDateModal(true);
  };
  const openAddLeaveModal = () => {
    setAddLeaveForm({ fromDate: "", toDate: "", leaveType: "casual", notes: "" });
    setShowAddLeaveModal(true);
  };
  const updateAddLeaveForm = (field: keyof typeof addLeaveForm, value: string) => {
    setAddLeaveForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleSubmitAddLeave = async () => {
    if (!studentId) return;
    const { fromDate, toDate, leaveType, notes } = addLeaveForm;
    if (!fromDate || !toDate) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Please select From date and To date." });
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
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateKeys: string[] = [];
    const current = new Date(from);
    current.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    while (current <= end) {
      if (!isWeekOffDay(current)) {
        dateKeys.push(`${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`);
      }
      current.setDate(current.getDate() + 1);
    }
    if (dateKeys.length === 0) {
      await Swal.fire({ icon: "warning", title: "No working days", text: "The selected range has no working days (weekends/week-off excluded)." });
      return;
    }
    setAddingLeave(true);
    try {
      const datesIso = dateKeys.map((d) => new Date(d + "T00:00:00.000Z").toISOString());
      const result = await attendanceApi.assignLeavesToStudents([studentId], datesIso, leaveType, notes.trim() || undefined);
      await Swal.fire({
        icon: "success",
        title: "Done",
        text: result?.data?.attendanceRecordsCreated != null ? `Added ${result.data.attendanceRecordsCreated} leave record(s).` : "Leave added.",
        confirmButtonText: "OK",
      });
      setShowAddLeaveModal(false);
      refetchForMonth();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error).message ?? "Failed to add leave.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setAddingLeave(false);
    }
  };
  const openRequestModal = () => {
    setRequestForm({
      fromDate: "",
      toDate: "",
      punchInTime: "",
      punchOutTime: "",
      notes: "",
      timezone: candidateTimezone,
    });
    setShowRequestModal(true);
  };
  const updateRequestForm = (field: keyof typeof requestForm, value: string) => {
    setRequestForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitRequest = async () => {
    if (!studentId) return;
    const { fromDate, toDate, punchInTime, punchOutTime, notes, timezone } = requestForm;
    if (!fromDate || !toDate || !punchInTime || !punchOutTime) {
      await Swal.fire({
        icon: "warning",
        title: "Validation",
        text: "Please fill in From date, To date, Punch In, and Punch Out.",
        confirmButtonText: "OK",
      });
      return;
    }
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Invalid date range.", confirmButtonText: "OK" });
      return;
    }
    if (to < from) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "To date must be on or after From date.", confirmButtonText: "OK" });
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (from >= today) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "From date must be in the past.", confirmButtonText: "OK" });
      return;
    }
    const punchInStr = punchInTime.includes(":") ? punchInTime : `${punchInTime}:00`;
    const punchOutStr = punchOutTime.includes(":") ? punchOutTime : `${punchOutTime}:00`;
    const attendanceEntries: Array<{ date: string; punchIn: string; punchOut: string; timezone: string }> = [];
    const current = new Date(from);
    current.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    while (current <= end) {
      if (!isWeekOffDay(current)) {
        const dateKey = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
        const punchInDateTime = new Date(`${dateKey}T${punchInStr}`);
        let punchOutDateTime = new Date(`${dateKey}T${punchOutStr}`);
        if (punchOutDateTime <= punchInDateTime) punchOutDateTime = new Date(punchOutDateTime.getTime() + 86400000);
        attendanceEntries.push({
          date: dateKey,
          punchIn: punchInDateTime.toISOString(),
          punchOut: punchOutDateTime.toISOString(),
          timezone: timezone || candidateTimezone,
        });
      }
      current.setDate(current.getDate() + 1);
    }
    if (attendanceEntries.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "No working days",
        text: "The selected date range has no working days (weekends are excluded).",
        confirmButtonText: "OK",
      });
      return;
    }
    setSubmittingRequest(true);
    try {
      await createBackdatedAttendanceRequest(studentId, {
        attendanceEntries: attendanceEntries.map((e) => ({
          date: e.date,
          punchIn: e.punchIn,
          punchOut: e.punchOut,
          timezone: e.timezone,
        })),
        notes: notes.trim() || undefined,
      });
      await Swal.fire({
        icon: "success",
        title: "Request Submitted",
        text: "Your backdated attendance request has been submitted. An admin will review it shortly.",
        confirmButtonText: "OK",
      });
      setShowRequestModal(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error).message ?? "Failed to submit request.";
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setSubmittingRequest(false);
    }
  };
  const addBackDateEntry = () => {
    setBackDateEntries((prev) => [...prev, { date: "", punchInTime: "", punchOutTime: "", notes: "", timezone: defaultTimezone }]);
  };
  const removeBackDateEntry = (index: number) => {
    if (backDateEntries.length > 1) setBackDateEntries((prev) => prev.filter((_, i) => i !== index));
  };
  const updateBackDateEntry = (index: number, field: keyof typeof backDateEntries[0], value: string) => {
    setBackDateEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const handleSubmitBackDate = async () => {
    if (!studentId) return;

    let attendanceEntries: Array<{ date: string; punchIn: string; punchOut: string; timezone: string; notes?: string }>;

    if (backDateMode === "range") {
      const { fromDate, toDate, punchInTime, punchOutTime, notes, timezone } = backDateRangeForm;
      if (!fromDate || !toDate || !punchInTime || !punchOutTime) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "Please fill in From date, To date, Punch In, and Punch Out.", confirmButtonText: "OK" });
        return;
      }
      const from = new Date(fromDate);
      const to = new Date(toDate);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "Invalid date range.", confirmButtonText: "OK" });
        return;
      }
      if (to < from) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "To date must be on or after From date.", confirmButtonText: "OK" });
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (from >= today) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "From date must be in the past.", confirmButtonText: "OK" });
        return;
      }
      const tz = timezone || defaultTimezone;
      const pIn = punchInTime.includes(":") ? punchInTime : `${punchInTime}:00`;
      const pOut = punchOutTime.includes(":") ? punchOutTime : `${punchOutTime}:00`;
      const pad = (n: number) => String(n).padStart(2, "0");
      attendanceEntries = [];
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
            timezone: tz,
            notes: notes?.trim() || undefined,
          });
        }
        current.setDate(current.getDate() + 1);
      }
      if (attendanceEntries.length === 0) {
        await Swal.fire({ icon: "warning", title: "No working days", text: "The selected date range has no working days (weekends/week-off excluded).", confirmButtonText: "OK" });
        return;
      }
    } else {
      const valid = backDateEntries.filter((e) => e.date && e.punchInTime && e.punchOutTime);
      if (valid.length === 0) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "Add at least one entry with date, punch-in and punch-out time.", confirmButtonText: "OK" });
        return;
      }
      const invalid = backDateEntries.filter((e) => e.date && (!e.punchInTime || !e.punchOutTime));
      if (invalid.length > 0) {
        await Swal.fire({ icon: "warning", title: "Validation", text: "Entries with a date must have both punch-in and punch-out times.", confirmButtonText: "OK" });
        return;
      }
      attendanceEntries = valid.map((entry) => {
        const punchInStr = entry.punchInTime.includes(":") ? entry.punchInTime : `${entry.punchInTime}:00`;
        const punchOutStr = entry.punchOutTime.includes(":") ? entry.punchOutTime : `${entry.punchOutTime}:00`;
        const punchInDateTime = new Date(`${entry.date}T${punchInStr}`);
        let punchOutDateTime = new Date(`${entry.date}T${punchOutStr}`);
        if (punchOutDateTime <= punchInDateTime) punchOutDateTime = new Date(punchOutDateTime.getTime() + 86400000);
        return {
          date: new Date(entry.date).toISOString().slice(0, 10),
          punchIn: punchInDateTime.toISOString(),
          punchOut: punchOutDateTime.toISOString(),
          timezone: entry.timezone || defaultTimezone,
          notes: entry.notes || undefined,
        };
      });
    }

    setAddingBackDate(true);
    try {
      const result = await attendanceApi.regularizeAttendance(studentId, attendanceEntries);
      await Swal.fire({
        icon: "success",
        title: "Done",
        text: result.message ?? `Added ${result.createdOrUpdated ?? 0} attendance record(s).`,
        confirmButtonText: "OK",
      });
      setShowBackDateModal(false);
      refetchForMonth();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error).message ?? "Failed to add attendance.";
      await Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonText: "OK" });
    } finally {
      setAddingBackDate(false);
    }
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      { "Date (YYYY-MM-DD)": "2024-01-15", "Punch In Time (HH:MM)": "09:00", "Punch Out Time (HH:MM)": "17:00", "Timezone": "UTC", "Notes (Optional)": "Sample entry" },
      { "Date (YYYY-MM-DD)": "2024-01-16", "Punch In Time (HH:MM)": "09:30", "Punch Out Time (HH:MM)": "18:00", "Timezone": "Asia/Kolkata", "Notes (Optional)": "Another sample" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    (ws as { "!cols"?: { wch: number }[] })["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }];
    XLSX.writeFile(wb, "attendance_template.xlsx");
  };

  const handleExcelImport = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      if (!jsonData || jsonData.length === 0) {
        await Swal.fire({ icon: "error", title: "Invalid File", text: "The Excel file is empty or invalid.", confirmButtonText: "OK" });
        return;
      }
      type Row = Record<string, unknown>;
      const entries: Array<{ date: string; punchInTime: string; punchOutTime: string; notes: string; timezone: string }> = [];
      const errors: string[] = [];
      const getVal = (row: Row, ...keys: string[]) => {
        for (const k of keys) {
          const v = row[k];
          if (v !== undefined && v !== null && v !== "") return String(v).trim();
        }
        return "";
      };
      (jsonData as Row[]).forEach((row: Row, index: number) => {
        const rowNum = index + 2;
        const date = getVal(row, "Date (YYYY-MM-DD)", "Date", "date");
        const punchInTime = getVal(row, "Punch In Time (HH:MM)", "Punch In Time", "Punch In", "punchInTime");
        const punchOutTime = getVal(row, "Punch Out Time (HH:MM)", "Punch Out Time", "Punch Out", "punchOutTime");
        const timezone = getVal(row, "Timezone", "timezone") || defaultTimezone;
        const notes = getVal(row, "Notes (Optional)", "Notes", "notes");
        if (!date) { errors.push(`Row ${rowNum}: Date is required`); return; }
        if (!punchInTime) { errors.push(`Row ${rowNum}: Punch In Time is required`); return; }
        if (!punchOutTime) { errors.push(`Row ${rowNum}: Punch Out Time is required`); return; }
        let formattedDate = "";
        try {
          const rawDate = row["Date (YYYY-MM-DD)"] ?? row["Date"] ?? row["date"];
          if (typeof rawDate === "number") {
            const excelEpoch = new Date(1899, 11, 30);
            const excelDate = new Date(excelEpoch.getTime() + rawDate * 86400000);
            formattedDate = excelDate.toISOString().split("T")[0];
          } else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            formattedDate = date;
          } else if (date) {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) { errors.push(`Row ${rowNum}: Invalid date - ${date}`); return; }
            formattedDate = dateObj.toISOString().split("T")[0];
          } else {
            errors.push(`Row ${rowNum}: Date is required`);
            return;
          }
        } catch {
          errors.push(`Row ${rowNum}: Invalid date - ${date}`);
          return;
        }
        let formattedPunchIn = "";
        let formattedPunchOut = "";
        try {
          const pad = (s: string) => s.padStart(2, "0");
          if (typeof (row["Punch In Time (HH:MM)"] ?? row["Punch In"]) === "number") {
            const n = Number(row["Punch In Time (HH:MM)"] ?? row["Punch In"]);
            const totalSeconds = Math.floor(n * 86400);
            formattedPunchIn = `${pad(String(Math.floor(totalSeconds / 3600)))}:${pad(String(Math.floor((totalSeconds % 3600) / 60)))}`;
          } else {
            const parts = punchInTime.split(":");
            formattedPunchIn = parts.length >= 2 ? `${pad(parts[0])}:${pad(parts[1])}` : "";
          }
          if (typeof (row["Punch Out Time (HH:MM)"] ?? row["Punch Out"]) === "number") {
            const n = Number(row["Punch Out Time (HH:MM)"] ?? row["Punch Out"]);
            const totalSeconds = Math.floor(n * 86400);
            formattedPunchOut = `${pad(String(Math.floor(totalSeconds / 3600)))}:${pad(String(Math.floor((totalSeconds % 3600) / 60)))}`;
          } else {
            const parts = punchOutTime.split(":");
            formattedPunchOut = parts.length >= 2 ? `${pad(parts[0])}:${pad(parts[1])}` : "";
          }
          if (!formattedPunchIn) errors.push(`Row ${rowNum}: Invalid punch-in time`);
          if (!formattedPunchOut) errors.push(`Row ${rowNum}: Invalid punch-out time`);
          if (!formattedPunchIn || !formattedPunchOut) return;
        } catch {
          errors.push(`Row ${rowNum}: Error parsing time`);
          return;
        }
        let punchOutDt = new Date(`${formattedDate}T${formattedPunchOut}`);
        const punchInDt = new Date(`${formattedDate}T${formattedPunchIn}`);
        if (punchOutDt <= punchInDt) punchOutDt = new Date(punchOutDt.getTime() + 86400000);
        if (punchOutDt <= punchInDt) {
          errors.push(`Row ${rowNum}: Punch-out must be after punch-in`);
          return;
        }
        entries.push({ date: formattedDate, punchInTime: formattedPunchIn, punchOutTime: formattedPunchOut, notes: notes || "", timezone });
      });
      if (errors.length > 0) {
        await Swal.fire({
          icon: "warning",
          title: "Import Errors",
          html: `Found ${errors.length} error(s):<br><br>${errors.slice(0, 10).join("<br>")}${errors.length > 10 ? "<br>... and more" : ""}`,
          confirmButtonText: "OK",
        });
      }
      if (entries.length > 0) {
        setBackDateEntries(entries);
        await Swal.fire({
          icon: "success",
          title: "Import Successful",
          text: `Imported ${entries.length} attendance ${entries.length === 1 ? "entry" : "entries"}.${errors.length > 0 ? " Some rows had errors and were skipped." : ""}`,
          confirmButtonText: "OK",
        });
      } else {
        await Swal.fire({ icon: "error", title: "No Valid Entries", text: "No valid attendance entries could be imported.", confirmButtonText: "OK" });
      }
      if (excelFileInputRef.current) excelFileInputRef.current.value = "";
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Import Failed",
        text: (err as Error)?.message ?? "Failed to import Excel file. Check the file format.",
        confirmButtonText: "OK",
      });
      if (excelFileInputRef.current) excelFileInputRef.current.value = "";
    }
  };

  const weekOffDays = student?.weekOff ?? [];
  const joiningDateStart = useMemo(
    () => parseCalendarDayLocal(student?.joiningDate ?? undefined),
    [student?.joiningDate]
  );

  const isWeekOffDay = useCallback(
    (date: Date) => {
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      if (weekOffDays.length === 0) {
        return dayName === "Saturday" || dayName === "Sunday";
      }
      return weekOffDays.includes(dayName);
    },
    [weekOffDays]
  );

  const isInactiveEmployment = useCallback(
    (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      if (joiningDateStart && d.getTime() < joiningDateStart.getTime()) return true;
      if (resignDateEnd && d.getTime() > resignDateEnd.getTime()) return true;
      return false;
    },
    [joiningDateStart, resignDateEnd]
  );

  /** Month stats for summary cards (same logic as Dharwrin candidate attendance). */
  const getMonthStatistics = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = calendarYear;
    const month = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const byDate: Record<
      string,
      { present: boolean; totalMs: number; status?: string; hasHolidayRecord: boolean; hasLeaveRecord: boolean }
    > = {};
    attendanceList.forEach((r) => {
      const dateKey = getLocalDateKey(r.date ?? "");
      if (!dateKey) return;
      const hasOut = !!r.punchOut;
      const ms = sessionDurationMsForDisplay(r);
      const status = (r as { status?: string }).status;
      if (!byDate[dateKey]) {
        byDate[dateKey] = { present: false, totalMs: 0, hasHolidayRecord: false, hasLeaveRecord: false };
      }
      if (status === "Holiday") byDate[dateKey].hasHolidayRecord = true;
      if (status === "Leave") byDate[dateKey].hasLeaveRecord = true;
      if (status) byDate[dateKey].status = status;
      if (hasOut && countsTowardWorkedMs(status)) {
        byDate[dateKey].present = true;
        byDate[dateKey].totalMs += ms;
      }
    });

    let totalDuration = 0;
    let presentDays = 0;
    let workingDays = 0;
    let leaveDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      if (date > today) continue;
      if (joiningDateStart && date.getTime() < joiningDateStart.getTime()) continue;
      if (resignDateEnd && date.getTime() > resignDateEnd.getTime()) continue;
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const info = byDate[dateKey];
      const isPresent = !!info?.present;
      const isWeekOff = isWeekOffDay(date);
      const isHoliday = !!info?.hasHolidayRecord || info?.status === "Holiday";
      const isLeave = !!info?.hasLeaveRecord || info?.status === "Leave";

      if (!isWeekOff && !isHoliday) {
        workingDays += 1;
        if (isPresent) presentDays += 1;
        if (isLeave) leaveDays += 1;
      }
      if (info) {
        const displayMs = isHoliday || isLeave ? 0 : capDayTotalMs(info.totalMs);
        totalDuration += displayMs;
      }
    }

    const totalHours = formatDurationHours(totalDuration);
    const absentDays = Math.max(0, workingDays - presentDays - leaveDays);
    return { totalHours, presentDays, absentDays, leaveDays };
  }, [attendanceList, calendarYear, calendarMonth, isWeekOffDay, joiningDateStart, resignDateEnd]);

  /** Parse holiday name from notes (backend stores "Holiday: {title}"). */
  const getHolidayNameFromNotes = (notes?: string): string => {
    if (!notes?.trim()) return "";
    const prefix = "Holiday: ";
    return notes.trim().startsWith(prefix) ? notes.trim().slice(prefix.length).trim() : notes.trim();
  };

  /** Leave type from record (leaveType or parse "Leave: Casual" etc. from notes). */
  const getLeaveTypeFromRecord = (r: { leaveType?: string | null; notes?: string | null }): string => {
    const lt = r.leaveType;
    if (lt === "casual" || lt === "sick" || lt === "unpaid") return lt;
    const n = r.notes?.trim() ?? "";
    if (n.startsWith("Leave: Casual") || n.includes("Leave: Casual")) return "casual";
    if (n.startsWith("Leave: Sick") || n.includes("Leave: Sick")) return "sick";
    if (n.startsWith("Leave: Unpaid") || n.includes("Leave: Unpaid")) return "unpaid";
    return "";
  };

  type DayCell = {
    day: number;
    date: Date;
    present: boolean;
    incomplete: boolean;
    totalHours: number;
    status?: string;
    holidayName?: string;
  };

  const getCalendarData = useCallback((): DayCell[] => {
    const year = calendarYear;
    const month = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const byDate: Record<
      string,
      {
        present: boolean;
        incomplete: boolean;
        totalMs: number;
        status?: string;
        holidayName?: string;
        hasHolidayRecord: boolean;
        hasLeaveRecord: boolean;
      }
    > = {};
    attendanceList.forEach((r) => {
      const dateKey = getLocalDateKey(r.date ?? "");
      if (!dateKey) return;

      // Skip attendance records that fall before the joining date
      if (joiningDateStart) {
        const recDate = new Date(dateKey + "T00:00:00");
        if (recDate.getTime() < joiningDateStart.getTime()) return;
      }

      const hasOut = !!r.punchOut;
      const ms = sessionDurationMsForDisplay(r);
      const status = (r as { status?: string }).status;
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          present: false,
          incomplete: false,
          totalMs: 0,
          hasHolidayRecord: false,
          hasLeaveRecord: false,
        };
      }
      if (status === "Holiday") byDate[dateKey].hasHolidayRecord = true;
      if (status === "Leave") byDate[dateKey].hasLeaveRecord = true;
      if (status) byDate[dateKey].status = status;
      if (status === "Holiday" && r.notes) {
        const name = getHolidayNameFromNotes(r.notes);
        if (name) byDate[dateKey].holidayName = name;
      }
      if (hasOut && countsTowardWorkedMs(status)) {
        byDate[dateKey].present = true;
        byDate[dateKey].totalMs += ms;
      } else if (status !== "Holiday" && status !== "Leave") {
        byDate[dateKey].incomplete = true;
      }
    });

    const cells: DayCell[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({
        day: 0,
        date: new Date(year, month, -startDayOfWeek + 1 + i),
        present: false,
        incomplete: false,
        totalHours: 0,
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const info = byDate[dateKey] || {
        present: false,
        incomplete: false,
        totalMs: 0,
        hasHolidayRecord: false,
        hasLeaveRecord: false,
      };

      // Force-clear attendance for days before joining date
      const cellDate = new Date(date);
      cellDate.setHours(0, 0, 0, 0);
      const isBeforeJoining = joiningDateStart != null && cellDate.getTime() < joiningDateStart.getTime();
      if (isBeforeJoining) {
        cells.push({
          day,
          date,
          present: false,
          incomplete: false,
          totalHours: 0,
          status: info.hasHolidayRecord ? "Holiday" : info.hasLeaveRecord ? "Leave" : undefined,
          holidayName: info.holidayName,
        });
        continue;
      }

      const resolvedStatus = info.hasHolidayRecord ? "Holiday" : info.hasLeaveRecord ? "Leave" : info.status;
      const displayMs =
        info.hasHolidayRecord || info.hasLeaveRecord ? 0 : capDayTotalMs(info.totalMs);
      const totalHours = formatDurationHours(displayMs);
      cells.push({
        day,
        date,
        present: info.present,
        incomplete: info.incomplete && !info.present,
        totalHours,
        status: resolvedStatus,
        holidayName: info.holidayName,
      });
    }
    return cells;
  }, [attendanceList, calendarYear, calendarMonth, joiningDateStart]);

  if (!studentId) {
    return (
      <Fragment>
        <Seo title="Attendance" />
        <div className="container mx-auto py-8 text-danger">Invalid student.</div>
      </Fragment>
    );
  }

  const monthStats = getMonthStatistics();

  return (
    <Fragment>
      <Seo title={student ? `Attendance – ${student.user?.name ?? student.user?.email}` : "Attendance"} />

      <div className="container w-full max-w-full mx-auto">
        {/* Header – same style as non-admin section headers */}
        <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-bodybg shadow-sm overflow-hidden mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-defaultborder/60 bg-gray-50/80 dark:bg-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
                <i className="ri-user-line text-xl" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                  Attendance – {student?.user?.name ?? "Student"}
                </h2>
                <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5">
                  {student?.user?.email ?? ""}
                </p>
                {(joiningDateStart || resignDateEnd) && (
                  <p className="text-[0.65rem] text-defaulttextcolor/50 dark:text-white/40 mt-1">
                    {joiningDateStart && (
                      <>
                        <i className="ri-login-circle-line me-0.5" aria-hidden />
                        From {formatLocalYmd(joiningDateStart)}
                      </>
                    )}
                    {joiningDateStart && resignDateEnd && " · "}
                    {resignDateEnd && (
                      <>
                        <i className="ri-logout-circle-line me-0.5" aria-hidden />
                        Until {formatLocalYmd(resignDateEnd)}
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canRegularize && (
                <button
                  type="button"
                  onClick={openRegularizationModal}
                  title="Add Back-Dated Attendance"
                  className="inline-flex items-center gap-2 rounded-xl border-0 bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 dark:focus:ring-offset-bodydark"
                >
                  <i className="ri-calendar-line text-[1.1rem]" aria-hidden />
                  <span>Regularization</span>
                </button>
              )}
              {canRegularize && (
                <button
                  type="button"
                  onClick={openAddLeaveModal}
                  title="Add leave for this student"
                  className="inline-flex items-center gap-2 rounded-xl border-0 bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-sky-700 hover:shadow active:bg-sky-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:ring-offset-2 dark:focus:ring-offset-bodydark"
                >
                  <i className="ri-calendar-event-line text-[1.1rem]" aria-hidden />
                  <span>Leave</span>
                </button>
              )}
              <Link
                href="/training/attendance"
                className="inline-flex items-center gap-2 rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor transition-colors hover:bg-defaultborder/20 hover:border-defaultborder dark:border-white/20 dark:hover:bg-white/10 dark:hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-defaultborder/30 focus:ring-offset-2 dark:focus:ring-offset-bodydark"
              >
                <i className="ri-close-line text-[1.1rem]" aria-hidden />
                <span>Close</span>
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm">
            {error}
          </div>
        )}

        {myStudentId === studentId && (
          <div className="grid grid-cols-12 gap-6 mb-6">
            <div className="col-span-12 lg:col-span-6">
              <div className="box">
                <div className="box-header !flex-col !items-stretch gap-3 sm:!flex-row sm:items-center sm:justify-between sm:gap-3 min-w-0">
                  <div className="box-title !me-0 min-w-0 shrink-0 truncate">Punch In / Out</div>
                  <div className="w-full min-w-0 sm:ms-auto sm:w-auto">
                    <div className="overflow-hidden rounded-xl border border-defaultborder/80 bg-white shadow-sm dark:border-white/10 dark:bg-bodybg">
                      <button
                        type="button"
                        onClick={openRequestModal}
                        className="flex min-h-[2.75rem] w-full min-w-0 items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 dark:hover:bg-primary/10 sm:w-auto sm:pr-5"
                        title="Request backdated attendance for past dates"
                      >
                        <i className="ri-history-line shrink-0 text-[1.15rem] opacity-90" aria-hidden />
                        <span className="min-w-0 pr-1 leading-snug tracking-tight">
                          Backdated attendance
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="box-body space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`badge ${status?.isPunchedIn ? "bg-success/10 text-success" : "bg-defaultborder text-defaulttextcolor"}`}
                    >
                      {statusLoading ? "…" : status?.isPunchedIn ? "Active (Punched In)" : "Inactive (Punched Out)"}
                    </span>
                    {status?.isPunchedIn && status?.record?.punchIn && (
                      <div className="text-sm text-defaulttextcolor/80">
                        <span className="text-[#8c9097] dark:text-white/45">Since </span>
                        {formatTimeOnlyInTimezone(status.record.punchIn, status.record.timezone ?? "UTC")}
                      </div>
                    )}
                  </div>
                  {status?.isPunchedIn && elapsedDisplay ? (
                    <div className="rounded-xl border border-defaultborder/75 bg-gray-50/70 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="flex items-start gap-3 border-b border-defaultborder/55 px-4 py-3.5 dark:border-white/10">
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                          <i className="ri-timer-flash-line text-[1.15rem]" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="mb-0 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-success">
                              Session in progress
                            </p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[0.65rem] font-semibold text-success">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                              </span>
                              Live
                            </span>
                          </div>
                          <p className="mb-0 mt-2 text-[1.5rem] font-bold tabular-nums tracking-tight text-defaulttextcolor dark:text-white sm:text-[1.625rem]">
                            {elapsedDisplay}
                          </p>
                          <p className="mb-0 mt-2 text-[0.6875rem] leading-relaxed text-defaulttextcolor/55 dark:text-white/45">
                            Elapsed since punch-in. Listed duration column shows the same until punch-out.
                          </p>
                        </div>
                      </div>
                      {status.shift &&
                        status.elapsedPreview &&
                        status.elapsedPreview.eligibleMs !== status.elapsedPreview.sessionMs && (
                          <div className="px-4 py-3">
                            <div className="rounded-lg border border-primary/15 bg-primary/[0.06] px-3 py-2 dark:bg-primary/10">
                              <p className="mb-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-primary">
                                Credited toward shift
                              </p>
                              <p className="mb-0 text-[0.9375rem] font-semibold tabular-nums text-defaulttextcolor dark:text-white">
                                {formatDuration(status.elapsedPreview.eligibleMs)}
                                <span className="ml-1.5 text-[0.65rem] font-normal text-defaulttextcolor/50">· syncs ~15s</span>
                              </p>
                            </div>
                          </div>
                        )}
                      {status.shift &&
                        status.elapsedPreview &&
                        status.elapsedPreview.eligibleMs === status.elapsedPreview.sessionMs && (
                          <p className="mb-0 border-t border-defaultborder/40 px-4 py-2.5 text-[0.75rem] text-defaulttextcolor/55 dark:border-white/10 dark:text-white/40">
                            Full session counts toward attendance for this shift.
                          </p>
                        )}
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary"
                      onClick={handlePunchIn}
                      disabled={punchLoading || status?.isPunchedIn}
                    >
                      {punchLoading ? "…" : "Punch In"}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-outline-danger"
                      onClick={handlePunchOut}
                      disabled={punchLoading || !status?.isPunchedIn}
                    >
                      {punchLoading ? "…" : "Punch Out"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary cards – match section card style (rounded-xl, shadow-sm, icon + label/value) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Working Hours", value: monthStats.totalHours + "h", icon: "ri-time-line", iconClass: "bg-secondary/10 text-secondary dark:bg-secondary/15" },
            { label: "Present Days", value: String(monthStats.presentDays), icon: "ri-check-line", iconClass: "bg-success/10 text-success dark:bg-success/15" },
            { label: "Absent Days", value: String(monthStats.absentDays), icon: "ri-close-line", iconClass: "bg-danger/10 text-danger dark:bg-danger/15" },
            { label: "Leave Days", value: String(monthStats.leaveDays), icon: "ri-calendar-line", iconClass: "bg-warning/10 text-warning dark:bg-warning/15" },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-defaultborder/80 bg-white dark:bg-bodybg shadow-sm overflow-hidden flex items-center gap-3 px-4 py-3.5 transition-colors duration-200 hover:border-defaultborder dark:hover:border-white/10"
            >
              <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg " + s.iconClass} aria-hidden>
                <i className={s.icon} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/50 mb-0.5 truncate">
                  {s.label}
                </p>
                <p className="text-base font-semibold tabular-nums text-defaulttextcolor dark:text-white mb-0 truncate">
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Shift Details – from student.shift (populated by API) */}
        <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-bodybg shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-defaultborder/60 bg-gray-50/80 dark:bg-white/5">
            <h5 className="font-semibold text-defaulttextcolor dark:text-white mb-0 flex items-center gap-2 text-sm">
              <i className="ri-time-line text-defaulttextcolor/70" />
              Shift Details
            </h5>
          </div>
          <div className="px-5 py-4">
            {student?.shift && typeof student.shift === "object" && (student.shift.name ?? student.shift.id ?? student.shift._id) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-defaulttextcolor/70">Name</span><div className="font-medium text-defaulttextcolor">{student.shift.name ?? "—"}</div></div>
                <div><span className="text-defaulttextcolor/70">Start – End</span><div className="font-medium text-defaulttextcolor">{(student.shift.startTime ?? "—") + " – " + (student.shift.endTime ?? "—")}</div></div>
                {student.shift.description ? <div className="sm:col-span-2"><span className="text-defaulttextcolor/70">Description</span><div className="font-medium text-defaulttextcolor">{student.shift.description}</div></div> : null}
              </div>
            ) : (
              <p className="text-defaulttextcolor/70 text-sm mb-0">No shift assigned</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-defaultborder/80 bg-white dark:bg-bodybg shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-defaultborder/60 bg-gray-50/80 dark:bg-white/5 flex flex-wrap items-center justify-between gap-4">
            <h5 className="font-semibold text-defaulttextcolor dark:text-white mb-0 flex items-center gap-2 text-sm">
              <i className="ri-calendar-line text-defaulttextcolor/70" />
              Attendance – {MONTH_NAMES[calendarMonth]} {calendarYear}
            </h5>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl border border-defaultborder/80 bg-gray-50/60 dark:bg-white/5 p-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg py-2 px-3.5 text-[0.75rem] font-semibold transition-all duration-200 ${viewMode === "list" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor dark:text-white/80 hover:text-defaulttextcolor hover:bg-white/80 dark:hover:bg-white/10"}`}
                >
                  <i className="ri-list-unordered text-[0.9rem]" />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg py-2 px-3.5 text-[0.75rem] font-semibold transition-all duration-200 ${viewMode === "calendar" ? "bg-primary text-white shadow-sm" : "text-defaulttextcolor dark:text-white/80 hover:text-defaulttextcolor hover:bg-white/80 dark:hover:bg-white/10"}`}
                >
                  <i className="ri-calendar-line text-[0.9rem]" />
                  <span>Calendar</span>
                </button>
              </div>
              <div className="h-5 w-px bg-defaultborder/80 flex-shrink-0 hidden sm:block" aria-hidden="true" />
              <div className="inline-flex items-center rounded-xl border border-defaultborder/80 bg-gray-50/60 dark:bg-white/5 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    fetchStatus();
                    refetchForMonth();
                  }}
                  disabled={listLoading}
                  title="Refresh attendance"
                  aria-label="Refresh attendance list"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-defaulttextcolor/80 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-defaulttextcolor/80 active:scale-95"
                >
                  <i className={"ri-refresh-line text-[1.1rem]" + (listLoading ? " animate-spin" : "")} />
                </button>
              </div>
            </div>
          </div>
          <div className={viewMode === "list" ? "!p-0" : "p-5"}>
            {viewMode === "list" && (
              <>
                {listLoading && attendanceList.length === 0 ? (
                  <div className="py-8 text-center text-defaulttextcolor/70">Loading…</div>
                ) : attendanceList.length === 0 ? (
                  <div className="py-8 text-center text-defaulttextcolor/70">No attendance records yet. Use Refresh if you just opened this page from View.</div>
                ) : (
                  <div className="overflow-hidden rounded-b-md">
                    <table className="min-w-full text-[0.8125rem]">
                      <thead>
                        <tr className="bg-gray-50/90 dark:bg-white/5 border-b border-defaultborder/80">
                          <th className="text-start py-3.5 pl-5 pr-5 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/70">Date</th>
                          <th className="text-start py-3.5 pl-5 pr-5 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/70">Day</th>
                          <th className="text-start py-3.5 pl-5 pr-5 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/70">Status</th>
                          <th className="text-end py-3.5 pl-5 pr-5 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/70 tabular-nums">Punch In</th>
                          <th className="text-end py-3.5 pl-5 pr-5 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/70 tabular-nums">Punch Out</th>
                          <th className="text-end py-3.5 pl-5 pr-5 text-[0.6875rem] font-semibold uppercase tracking-wider text-defaulttextcolor/70 tabular-nums">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceList.map((r, idx) => {
                          const recordTz = r.timezone ?? "UTC";
                          const recStatus = (r as { status?: string }).status;
                          const isHolidayOrLeave = recStatus === "Holiday" || recStatus === "Leave";
                          const leaveType = getLeaveTypeFromRecord(r);
                          const leaveLabel = leaveType ? "Leave (" + leaveType.charAt(0).toUpperCase() + leaveType.slice(1) + ")" : "Leave";
                          return (
                            <tr key={r.id} className={`border-b border-defaultborder/60 ${idx % 2 === 1 ? "bg-gray-50/50 dark:bg-white/[0.02]" : ""}`}>
                              <td className="py-3.5 pl-5 pr-5">{formatDate(r.date)}</td>
                              <td className="py-3.5 pl-5 pr-5">{r.day ?? "—"}</td>
                              <td className="py-3.5 pl-5 pr-5">
                                {recStatus === "Holiday" ? (
                                  <span className="inline-flex items-center rounded-full border border-info/30 bg-info/10 px-2.5 py-1 text-xs font-semibold text-info">{(r as { notes?: string }).notes ? getHolidayNameFromNotes((r as { notes?: string }).notes) || "Holiday" : "Holiday"}</span>
                                ) : recStatus === "Leave" ? (
                                  <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">{leaveLabel}</span>
                                ) : recStatus === "Absent" ? (
                                  <span className="inline-flex items-center rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger">Absent</span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Present</span>
                                )}
                              </td>
                              <td className="text-end py-3.5 pl-5 pr-5 tabular-nums">{isHolidayOrLeave ? "—" : formatTimeOnlyInTimezone(r.punchIn, recordTz)}</td>
                              <td className="text-end py-3.5 pl-5 pr-5 tabular-nums">{isHolidayOrLeave ? "—" : (r.punchOut ? formatTimeOnlyInTimezone(r.punchOut, recordTz) : (status?.isPunchedIn && status?.record?.id === r.id ? "Active" : "—"))}</td>
                              <td className="text-end py-3.5 pl-5 pr-5 tabular-nums">
                                {isHolidayOrLeave
                                  ? "—"
                                  : r.punchOut
                                    ? (r.duration != null ? formatDuration(r.duration) : "—")
                                    : status?.isPunchedIn && status?.record?.id === r.id
                                      ? elapsedDisplay || "…"
                                      : "—"}
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

            {viewMode === "calendar" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h4 className="text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white tracking-tight">
                    {MONTH_NAMES[calendarMonth]} {calendarYear}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-xl border border-defaultborder/70 bg-gray-50/80 dark:bg-white/5 p-0.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => { const prev = calendarMonth === 0 ? 11 : calendarMonth - 1; setCalendarMonth(prev); if (calendarMonth === 0) setCalendarYear((y) => y - 1); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-defaulttextcolor/80 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 transition-all duration-200 active:scale-95"
                        aria-label="Previous month"
                      >
                        <i className="ri-arrow-left-s-line text-[1.1rem]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCalendarYear(new Date().getFullYear()); setCalendarMonth(new Date().getMonth()); }}
                        disabled={calendarYear === new Date().getFullYear() && calendarMonth === new Date().getMonth()}
                        className={"mx-0.5 inline-flex h-8 items-center rounded-lg px-3 text-[0.75rem] font-medium transition-all duration-200 active:scale-[0.98] disabled:cursor-default disabled:active:scale-100 " + (calendarYear === new Date().getFullYear() && calendarMonth === new Date().getMonth() ? "bg-primary/15 text-primary dark:bg-primary/25 cursor-default" : "bg-primary text-white hover:bg-primary/90 shadow-sm")}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => { const next = calendarMonth === 11 ? 0 : calendarMonth + 1; setCalendarMonth(next); if (calendarMonth === 11) setCalendarYear((y) => y + 1); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-defaulttextcolor/80 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 transition-all duration-200 active:scale-95"
                        aria-label="Next month"
                      >
                        <i className="ri-arrow-right-s-line text-[1.1rem]" />
                      </button>
                    </div>
                    <div className="relative inline-flex items-center">
                      <i className="ri-calendar-line absolute left-2.5 text-[0.8rem] text-defaulttextcolor/50 pointer-events-none" aria-hidden />
                      <select
                        value={calendarYear}
                        onChange={(e) => setCalendarYear(parseInt(e.target.value, 10))}
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
                <div className="border border-defaultborder rounded-lg overflow-hidden">
                  <div className="grid grid-cols-7 bg-gray-50 dark:bg-white/5">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="p-2 text-center text-[0.75rem] font-medium text-defaulttextcolor/80">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 bg-white dark:bg-bodydark">
                    {getCalendarData().map((cell, idx) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const cellDate = new Date(cell.date);
                      cellDate.setHours(0, 0, 0, 0);
                      const isToday = cellDate.getTime() === today.getTime();
                      const isPast = cellDate < today;
                      const isFuture = cellDate > today;
                      const isEmpty = cell.day === 0;
                      const inactiveEmployment = cell.day > 0 && isInactiveEmployment(cell.date);
                      const beforeJoining =
                        cell.day > 0 &&
                        joiningDateStart != null &&
                        cellDate.getTime() < joiningDateStart.getTime();
                      const afterResign =
                        cell.day > 0 &&
                        resignDateEnd != null &&
                        cellDate.getTime() > resignDateEnd.getTime();
                      const isWeekOff = cell.day > 0 && isWeekOffDay(cell.date) && !inactiveEmployment;
                      const isHoliday = cell.status === "Holiday";
                      const isLeave = cell.status === "Leave";
                      return (
                        <div
                          key={idx}
                          className={`min-h-[72px] p-2 border border-defaultborder/50 ${
                            isToday ? "ring-2 ring-primary ring-inset" : ""
                          } ${
                            isEmpty
                              ? "bg-gray-50 dark:bg-white/5"
                              : inactiveEmployment && !isHoliday && !isLeave && !cell.present && !cell.incomplete
                                ? "bg-slate-50 dark:bg-white/[0.03]"
                                : isWeekOff
                                  ? "bg-gray-50 dark:bg-white/5"
                                  : isHoliday
                                    ? "bg-info/10"
                                    : isLeave
                                      ? "bg-secondary/10"
                                      : cell.present
                                        ? "bg-success/10"
                                        : cell.incomplete
                                          ? "bg-warning/10"
                                          : isPast
                                            ? "bg-danger/5"
                                            : isFuture
                                              ? "bg-gray-50 dark:bg-white/5"
                                              : "bg-white dark:bg-bodydark"
                          }`}
                        >
                          {cell.day > 0 && (
                            <div className="flex flex-col h-full">
                              <span
                                className={`text-sm font-medium ${
                                  isToday
                                    ? "text-primary font-semibold"
                                    : isWeekOff
                                      ? "text-defaulttextcolor/70 dark:text-white/50"
                                      : isHoliday
                                        ? "text-info"
                                        : isLeave
                                          ? "text-secondary"
                                          : cell.present
                                            ? "text-success"
                                            : cell.incomplete
                                              ? "text-warning"
                                              : isPast
                                                ? "text-danger"
                                                : "text-defaulttextcolor/70"
                                }`}
                              >
                                {cell.day}
                              </span>
                              {isToday && (
                                <span className="text-[0.7rem] text-primary font-medium mt-0.5">Today</span>
                              )}
                              {afterResign && !isHoliday && !isLeave && !cell.present && !cell.incomplete && (
                                <span className="text-[0.7rem] text-defaulttextcolor/50 dark:text-white/35 mt-0.5">After resign</span>
                              )}
                              {beforeJoining && !afterResign && !isHoliday && !isLeave && !cell.present && !cell.incomplete && (
                                <span className="text-[0.7rem] text-defaulttextcolor/50 dark:text-white/35 mt-0.5">Before joining</span>
                              )}
                              {isWeekOff && !isToday && (
                                <span className="text-[0.7rem] text-defaulttextcolor/60 dark:text-white/40 mt-0.5">Week-Off</span>
                              )}
                              {isHoliday && (
                                <span
                                  className="text-[0.7rem] text-info mt-0.5 block truncate max-w-full"
                                  title={cell.holidayName || "Holiday"}
                                >
                                  {cell.holidayName || "Holiday"}
                                </span>
                              )}
                              {isLeave && (
                                <span className="text-[0.7rem] text-secondary mt-0.5">Leave</span>
                              )}
                              {!beforeJoining && !afterResign && !inactiveEmployment && !isWeekOff && !isHoliday && !isLeave && cell.present && (
                                <>
                                  <span className="text-[0.7rem] text-success mt-0.5">Present</span>
                                  <span className="text-[0.7rem] text-success">{cell.totalHours.toFixed(1)}h</span>
                                </>
                              )}
                              {!beforeJoining && !afterResign && !inactiveEmployment && !isWeekOff && !isHoliday && !isLeave && cell.incomplete && (
                                <span className="text-[0.7rem] text-warning mt-0.5">Incomplete</span>
                              )}
                              {!beforeJoining && !afterResign && !inactiveEmployment && !isWeekOff && !isHoliday && !isLeave && !cell.present && !cell.incomplete && isPast && (
                                <span className="text-[0.7rem] text-danger/80 mt-0.5">Absent</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[0.6875rem]">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Present</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Incomplete</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-info" /> Holiday</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-secondary" /> Leave</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger" /> Absent</span>
                  <span className="flex items-center gap-1.5 text-[#8c9097] dark:text-white/50"><span className="h-2.5 w-2.5 rounded-full bg-[#8c9097] dark:bg-white/40" /> Week Off</span>
                </div>
                {listLoading && attendanceList.length === 0 && (
                  <div className="py-4 text-center text-defaulttextcolor/70 text-sm">Loading calendar…</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Back-Dated Attendance (Regularization) Modal */}
      {showBackDateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => { if (!addingBackDate) { setShowBackDateModal(false); if (excelFileInputRef.current) excelFileInputRef.current.value = ""; } }} aria-hidden />
            <div className="relative bg-white dark:bg-bodydark rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 sm:px-6 py-4 border-b border-defaultborder">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-defaulttextcolor">Add Back-Dated Attendance</h3>
                    <p className="text-sm font-medium text-primary mt-2">
                      Student: {student?.user?.name ?? "—"} ({student?.user?.email ?? "—"})
                    </p>
                    <p className="text-xs text-defaulttextcolor/70 mt-1">
                      Adding attendance for the student above
                    </p>
                  </div>
                  <button type="button" onClick={() => { if (!addingBackDate) { setShowBackDateModal(false); if (excelFileInputRef.current) excelFileInputRef.current.value = ""; } }} className="text-defaulttextcolor/70 hover:text-defaulttextcolor">
                    <i className="ri-close-line text-2xl" />
                  </button>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-sm text-defaulttextcolor me-1">Add by:</span>
                  <button
                    type="button"
                    onClick={() => setBackDateMode("range")}
                    title="By date range (From – To)"
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors shrink-0 ${backDateMode === "range" ? "bg-primary text-white border-primary" : "bg-white dark:bg-white/5 border-defaultborder text-defaulttextcolor hover:border-primary/50 hover:text-primary"}`}
                  >
                    <i className="ri-calendar-2-line text-lg" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackDateMode("entries")}
                    title="One entry per date"
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors shrink-0 ${backDateMode === "entries" ? "bg-primary text-white border-primary" : "bg-white dark:bg-white/5 border-defaultborder text-defaulttextcolor hover:border-primary/50 hover:text-primary"}`}
                  >
                    <i className="ri-list-unordered text-lg" aria-hidden />
                  </button>
                  <span className="text-xs text-[#8c9097] dark:text-white/50 ml-1">
                    {backDateMode === "range" ? "Date range (From – To)" : "One entry per date"}
                  </span>
                </div>

                {backDateMode === "range" && (
                  <div className="mb-4 p-4 border border-defaultborder rounded-lg bg-black/5 dark:bg-white/5">
                    <p className="text-sm text-defaulttextcolor mb-3">
                      Enter a date range (From and To). Punch In and Punch Out will be applied to all working days. Weekends are excluded (or the student&apos;s week-off if set).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">From date *</label>
                        <input
                          type="date"
                          value={backDateRangeForm.fromDate}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setBackDateRangeForm((prev) => ({ ...prev, fromDate: e.target.value }))}
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">To date *</label>
                        <input
                          type="date"
                          value={backDateRangeForm.toDate}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setBackDateRangeForm((prev) => ({ ...prev, toDate: e.target.value }))}
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">Timezone</label>
                        <div className="w-full px-3 py-2 border border-defaultborder rounded bg-black/5 dark:bg-white/5 text-defaulttextcolor text-sm">{backDateRangeForm.timezone || defaultTimezone}</div>
                      </div>
                      <div />
                      <div>
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">Punch In *</label>
                        <input
                          type="time"
                          value={backDateRangeForm.punchInTime}
                          onChange={(e) => setBackDateRangeForm((prev) => ({ ...prev, punchInTime: e.target.value }))}
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">Punch Out *</label>
                        <input
                          type="time"
                          value={backDateRangeForm.punchOutTime}
                          onChange={(e) => setBackDateRangeForm((prev) => ({ ...prev, punchOutTime: e.target.value }))}
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">Notes (optional)</label>
                        <input
                          type="text"
                          value={backDateRangeForm.notes}
                          onChange={(e) => setBackDateRangeForm((prev) => ({ ...prev, notes: e.target.value }))}
                          placeholder="Notes for this range"
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {backDateMode === "entries" && (
                  <>
                <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-defaulttextcolor">
                  <i className="ri-information-line me-2 text-primary" />
                  You can add multiple back-dated attendance entries. Each entry requires a date, punch-in time, and punch-out time.
                </div>

                <div className="mb-4 p-4 bg-black/5 dark:bg-white/5 rounded-lg border border-defaultborder">
                  <h4 className="text-sm font-semibold text-defaulttextcolor mb-3 flex items-center gap-2">
                    <i className="ri-file-excel-2-line text-lg text-success" />
                    Import from Excel
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={downloadExcelTemplate}
                      className="ti-btn bg-success text-white hover:bg-success/90 !py-2 !px-4 flex items-center justify-center gap-2"
                    >
                      <i className="ri-download-line" />
                      Download Template
                    </button>
                    <label className="ti-btn ti-btn-primary !py-2 !px-4 flex items-center justify-center gap-2 cursor-pointer mb-0">
                      <i className="ri-upload-line" />
                      Import Excel File
                      <input
                        ref={excelFileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleExcelImport(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-defaulttextcolor/70 mt-2">
                    Download the template, fill in your attendance data, and import it here. The template includes sample entries for reference.
                  </p>
                </div>

                {backDateEntries.map((entry, index) => (
                  <div key={index} className="p-4 border border-defaultborder rounded-lg bg-black/5 dark:bg-white/5 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-defaulttextcolor">Entry {index + 1}</span>
                      {backDateEntries.length > 1 && (
                        <button type="button" onClick={() => removeBackDateEntry(index)} className="text-danger hover:opacity-80" title="Remove">
                          <i className="ri-delete-bin-line text-lg" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">Date *</label>
                        <input
                          type="date"
                          value={entry.date}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => updateBackDateEntry(index, "date", e.target.value)}
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">Timezone</label>
                        <div className="w-full px-3 py-2 border border-defaultborder rounded bg-black/5 dark:bg-white/5 text-defaulttextcolor text-sm">{entry.timezone}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">Punch In *</label>
                        <input
                          type="time"
                          value={entry.punchInTime}
                          onChange={(e) => updateBackDateEntry(index, "punchInTime", e.target.value)}
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">Punch Out *</label>
                        <input
                          type="time"
                          value={entry.punchOutTime}
                          onChange={(e) => updateBackDateEntry(index, "punchOutTime", e.target.value)}
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">Notes (optional)</label>
                        <input
                          type="text"
                          value={entry.notes}
                          onChange={(e) => updateBackDateEntry(index, "notes", e.target.value)}
                          placeholder="Notes for this entry"
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addBackDateEntry}
                  className="w-full py-2 border-2 border-dashed border-defaultborder rounded-lg text-defaulttextcolor/70 hover:border-primary hover:text-primary flex items-center justify-center gap-2"
                >
                  <i className="ri-add-line" /> Add Another Entry
                </button>
                  </>
                )}
              </div>
              <div className="px-4 sm:px-6 py-3 border-t border-defaultborder flex justify-end gap-2">
                <button type="button" onClick={() => { if (!addingBackDate) { setShowBackDateModal(false); if (excelFileInputRef.current) excelFileInputRef.current.value = ""; } }} className="ti-btn ti-btn-light" disabled={addingBackDate}>
                  Cancel
                </button>
                <button type="button" onClick={handleSubmitBackDate} className="ti-btn ti-btn-primary" disabled={addingBackDate}>
                  {addingBackDate ? "Adding…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Leave Modal – same UI/UX as non-admin Request Leave modal */}
      {showAddLeaveModal && (
        <div className="fixed inset-0 z-[105] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="add-leave-modal-title">
          <style>{`
            @keyframes leave-modal-backdrop { from { opacity: 0; } to { opacity: 1; } }
            @keyframes leave-modal-enter { from { opacity: 0; transform: scale(0.96) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
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
            <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] leave-modal-backdrop" onClick={() => { if (!addingLeave) setShowAddLeaveModal(false); }} aria-hidden />
            <div className="relative w-full max-w-[28rem] flex flex-col max-h-[85vh] leave-modal-panel rounded-2xl border border-defaultborder/80 bg-white dark:bg-bodybg shadow-xl dark:shadow-black/30 overflow-hidden">
              <div className="relative border-b border-defaultborder/60 bg-gradient-to-br from-sky-50/80 to-transparent dark:from-sky-950/20 dark:to-transparent">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-sky-600 dark:from-sky-500 dark:to-sky-700" aria-hidden />
                <div className="flex items-start justify-between gap-4 pl-5 pr-4 py-5">
                  <div className="flex items-start gap-4 min-w-0">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 shadow-inner">
                      <i className="ri-hotel-bed-line text-[1.5rem]" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 id="add-leave-modal-title" className="text-lg font-semibold tracking-tight text-defaulttextcolor dark:text-white">Add Leave</h2>
                      <p className="mt-1 text-sm text-defaulttextcolor/65 dark:text-white/55">{student?.user?.name ?? "—"} ({student?.user?.email ?? "—"})</p>
                      <p className="mt-0.5 text-xs text-defaulttextcolor/55 dark:text-white/45">Working days only · Weekends and week-off excluded</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { if (!addingLeave) setShowAddLeaveModal(false); }} className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/50" aria-label="Close">
                    <i className="ri-close-line text-xl" />
                  </button>
                </div>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                <div className="leave-modal-stagger-1 flex items-start gap-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/15 border border-sky-200/40 dark:border-sky-700/30 p-3.5">
                  <i className="ri-calendar-event-line text-sky-600 dark:text-sky-400 text-lg shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-defaulttextcolor/85 dark:text-white/75 leading-relaxed">Pick a date range. Only <strong>working days</strong> are included; weekends and the student&apos;s week-off are skipped.</p>
                </div>
                <div className="leave-modal-stagger-2 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Dates</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="add-leave-from-date" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">From <span className="text-rose-500">*</span></label>
                      <input id="add-leave-from-date" type="date" value={addLeaveForm.fromDate} onChange={(e) => updateAddLeaveForm("fromDate", e.target.value)} className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all" />
                    </div>
                    <div>
                      <label htmlFor="add-leave-to-date" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">To <span className="text-rose-500">*</span></label>
                      <input id="add-leave-to-date" type="date" value={addLeaveForm.toDate} onChange={(e) => updateAddLeaveForm("toDate", e.target.value)} className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all" />
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
                      <button key={value} type="button" onClick={() => updateAddLeaveForm("leaveType", value)} className={`leave-type-card flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all duration-200 hover:border-defaulttextcolor/20 dark:hover:border-white/20 ${addLeaveForm.leaveType === value ? `${active} border-current` : `${bg} border-transparent text-defaulttextcolor/80 dark:text-white/70`}`}>
                        <i className={`${icon} text-lg`} aria-hidden />
                        <span className="text-xs font-semibold">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="leave-modal-stagger-4 space-y-2">
                  <label htmlFor="add-leave-notes" className="block text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Notes <span className="font-normal normal-case text-defaulttextcolor/50">(optional)</span></label>
                  <input id="add-leave-notes" type="text" value={addLeaveForm.notes} onChange={(e) => updateAddLeaveForm("notes", e.target.value)} placeholder="e.g. Family trip, medical appointment…" className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all" />
                </div>
              </div>
              <div className="leave-modal-stagger-5 flex items-center justify-end gap-3 border-t border-defaultborder/60 bg-defaultborder/5 dark:bg-white/5 px-5 py-4">
                <button type="button" onClick={() => { if (!addingLeave) setShowAddLeaveModal(false); }} className="rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50" disabled={addingLeave}>Cancel</button>
                <button type="button" onClick={handleSubmitAddLeave} className="rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center gap-2" disabled={addingLeave}>
                  {addingLeave ? (<><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />Adding…</>) : (<><i className="ri-add-circle-line text-base" aria-hidden />Add Leave</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Request Backdated Attendance Modal */}
      {showRequestModal && myStudentId === studentId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => { if (!submittingRequest) setShowRequestModal(false); }} aria-hidden />
            <div className="relative bg-white dark:bg-bodydark rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 sm:px-6 py-4 border-b border-defaultborder">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-defaulttextcolor">Request Backdated Attendance</h3>
                    <p className="text-sm text-defaulttextcolor/70 mt-1">
                      Submit a request for past dates. An admin will review and approve.
                    </p>
                  </div>
                  <button type="button" onClick={() => { if (!submittingRequest) setShowRequestModal(false); }} className="text-defaulttextcolor/70 hover:text-defaulttextcolor">
                    <i className="ri-close-line text-2xl" />
                  </button>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1">
                <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-defaulttextcolor">
                  <i className="ri-information-line me-2 text-primary" />
                  Enter a date range (From and To). Punch In and Punch Out will be applied to all working days in the range. Weekends are excluded.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-defaulttextcolor mb-1">From date *</label>
                    <input
                      type="date"
                      value={requestForm.fromDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => updateRequestForm("fromDate", e.target.value)}
                      className="ti-form-input w-full !py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-defaulttextcolor mb-1">To date *</label>
                    <input
                      type="date"
                      value={requestForm.toDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => updateRequestForm("toDate", e.target.value)}
                      className="ti-form-input w-full !py-1.5"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-defaulttextcolor mb-1">Timezone (candidate&apos;s)</label>
                  <div className="w-full px-3 py-2 border border-defaultborder rounded bg-black/5 dark:bg-white/5 text-defaulttextcolor text-sm">{requestForm.timezone || candidateTimezone}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-defaulttextcolor mb-1">Punch In *</label>
                    <input
                      type="time"
                      value={requestForm.punchInTime}
                      onChange={(e) => updateRequestForm("punchInTime", e.target.value)}
                      className="ti-form-input w-full !py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-defaulttextcolor mb-1">Punch Out *</label>
                    <input
                      type="time"
                      value={requestForm.punchOutTime}
                      onChange={(e) => updateRequestForm("punchOutTime", e.target.value)}
                      className="ti-form-input w-full !py-1.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-defaulttextcolor mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={requestForm.notes}
                    onChange={(e) => updateRequestForm("notes", e.target.value)}
                    placeholder="Reason for backdated entry"
                    className="ti-form-input w-full !py-1.5"
                  />
                </div>
              </div>
              <div className="px-4 sm:px-6 py-3 border-t border-defaultborder flex justify-end gap-2">
                <button type="button" onClick={() => { if (!submittingRequest) setShowRequestModal(false); }} className="ti-btn ti-btn-light" disabled={submittingRequest}>
                  Cancel
                </button>
                <button type="button" onClick={handleSubmitRequest} className="ti-btn ti-btn-primary" disabled={submittingRequest}>
                  {submittingRequest ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
