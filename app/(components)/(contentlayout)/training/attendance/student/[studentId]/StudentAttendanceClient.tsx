"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import * as attendanceApi from "@/shared/lib/api/attendance";
import * as studentsApi from "@/shared/lib/api/students";
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
const ELAPSED_UPDATE_MS = 1000;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
      timeZone: "UTC",
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Get YYYY-MM-DD from the stored attendance date (UTC midnight convention). */
function getLocalDateKey(isoDateStr: string): string {
  if (!isoDateStr) return "";
  const d = new Date(isoDateStr);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function StudentAttendanceClient() {
  const params = useParams();
  const router = useRouter();
  const studentId = typeof params.studentId === "string" ? params.studentId : "";
  const [student, setStudent] = useState<studentsApi.Student | null>(null);
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
  const [backDateEntries, setBackDateEntries] = useState<Array<{ date: string; punchInTime: string; punchOutTime: string; notes: string; timezone: string }>>([]);
  const [addingBackDate, setAddingBackDate] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestEntries, setRequestEntries] = useState<Array<{ date: string; punchInTime: string; punchOutTime: string; notes: string; timezone: string }>>([]);
  const [submittingRequest, setSubmittingRequest] = useState(false);
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
    const id = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [studentId, viewMode, calendarYear, calendarMonth, fetchStatus, refetchForMonth]);

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
    const update = () => {
      const start = new Date(status!.record!.punchIn).getTime();
      setElapsedDisplay(formatDuration(Date.now() - start));
    };
    update();
    const id = setInterval(update, ELAPSED_UPDATE_MS);
    return () => clearInterval(id);
  }, [status?.isPunchedIn, status?.record?.punchIn]);

  const handlePunchIn = async () => {
    if (!studentId) return;
    setPunchLoading(true);
    setError(null);
    try {
      await attendanceApi.punchInAttendance(studentId, { timezone: getDetectedTimezone() });
      await fetchStatus();
      refetchForMonth();
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
      await attendanceApi.punchOutAttendance(studentId, { punchOutTime: new Date().toISOString() });
      await fetchStatus();
      refetchForMonth();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Punch out failed.");
    } finally {
      setPunchLoading(false);
    }
  };

  const defaultTimezone = getDetectedTimezone();
  const openRegularizationModal = () => {
    setBackDateEntries([{ date: "", punchInTime: "", punchOutTime: "", notes: "", timezone: defaultTimezone }]);
    setShowBackDateModal(true);
  };
  const openRequestModal = () => {
    setRequestEntries([{ date: "", punchInTime: "", punchOutTime: "", notes: "", timezone: defaultTimezone }]);
    setShowRequestModal(true);
  };
  const addRequestEntry = () => {
    setRequestEntries((prev) => [...prev, { date: "", punchInTime: "", punchOutTime: "", notes: "", timezone: defaultTimezone }]);
  };
  const removeRequestEntry = (index: number) => {
    if (requestEntries.length > 1) setRequestEntries((prev) => prev.filter((_, i) => i !== index));
  };
  const updateRequestEntry = (index: number, field: keyof typeof requestEntries[0], value: string) => {
    setRequestEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const handleSubmitRequest = async () => {
    if (!studentId) return;
    const valid = requestEntries.filter((e) => e.date && e.punchInTime && e.punchOutTime);
    if (valid.length === 0) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Add at least one entry with date, punch-in and punch-out time.", confirmButtonText: "OK" });
      return;
    }
    const invalid = requestEntries.filter((e) => e.date && (!e.punchInTime || !e.punchOutTime));
    if (invalid.length > 0) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Entries with a date must have both punch-in and punch-out times.", confirmButtonText: "OK" });
      return;
    }
    setSubmittingRequest(true);
    try {
      const attendanceEntries = valid.map((entry) => {
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
      const notes = requestEntries.map((e) => e.notes).filter(Boolean).join("; ") || undefined;
      await createBackdatedAttendanceRequest(studentId, {
        attendanceEntries: attendanceEntries.map((e) => ({
          date: e.date,
          punchIn: e.punchIn,
          punchOut: e.punchOut ?? null,
          timezone: e.timezone,
        })),
        notes,
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
    setAddingBackDate(true);
    try {
      const attendanceEntries = valid.map((entry) => {
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
  }, [attendanceList, calendarYear, calendarMonth, isWeekOffDay]);

  /** Parse holiday name from notes (backend stores "Holiday: {title}"). */
  const getHolidayNameFromNotes = (notes?: string): string => {
    if (!notes?.trim()) return "";
    const prefix = "Holiday: ";
    return notes.trim().startsWith(prefix) ? notes.trim().slice(prefix.length).trim() : notes.trim();
  };

  type DayCell = {
    day: number;
    date: Date;
    present: boolean;
    incomplete: boolean;
    durationLabel: string;
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
        durationLabel: "",
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
      const resolvedStatus = info.hasHolidayRecord ? "Holiday" : info.hasLeaveRecord ? "Leave" : info.status;
      const displayMs =
        info.hasHolidayRecord || info.hasLeaveRecord ? 0 : capDayTotalMs(info.totalMs);
      cells.push({
        day,
        date,
        present: info.present,
        incomplete: info.incomplete && !info.present,
        durationLabel: displayMs > 0 ? formatDuration(displayMs) : "",
        status: resolvedStatus,
        holidayName: info.holidayName,
      });
    }
    return cells;
  }, [attendanceList, calendarYear, calendarMonth]);

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
        {/* Header: same as Dharwrin candidate attendance modal */}
        <div className="box mb-6">
          <div className="box-header flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-defaulttextcolor">
                Attendance Details - {student?.user?.name ?? "Student"}
              </h2>
              <p className="text-sm text-defaulttextcolor/70 mt-1">
                {student?.user?.email ?? ""}
              </p>
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
                        <span className="text-sm text-defaulttextcolor/70">
                          Since {formatTimeOnlyInTimezone(status.record.punchIn, status.record.timezone ?? "UTC")}
                        {elapsedDisplay ? ` · ${elapsedDisplay}` : ""}
                      </span>
                    )}
                  </div>
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

        {/* Summary cards – same as Dharwrin candidate attendance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="box !p-4 border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <i className="ri-time-line text-primary text-lg" />
              </div>
              <div>
                <p className="text-xs text-defaulttextcolor/70 mb-0">Total Working Hours</p>
                <p className="text-lg font-semibold text-defaulttextcolor mb-0">{monthStats.totalHours}h</p>
              </div>
            </div>
          </div>
          <div className="box !p-4 border border-success/20 bg-success/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <i className="ri-check-line text-success text-lg" />
              </div>
              <div>
                <p className="text-xs text-defaulttextcolor/70 mb-0">Present Days</p>
                <p className="text-lg font-semibold text-defaulttextcolor mb-0">{monthStats.presentDays}</p>
              </div>
            </div>
          </div>
          <div className="box !p-4 border border-danger/20 bg-danger/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center">
                <i className="ri-close-line text-danger text-lg" />
              </div>
              <div>
                <p className="text-xs text-defaulttextcolor/70 mb-0">Absent Days</p>
                <p className="text-lg font-semibold text-defaulttextcolor mb-0">{monthStats.absentDays}</p>
              </div>
            </div>
          </div>
          <div className="box !p-4 border border-warning/20 bg-warning/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                <i className="ri-calendar-line text-warning text-lg" />
              </div>
              <div>
                <p className="text-xs text-defaulttextcolor/70 mb-0">Leave Days</p>
                <p className="text-lg font-semibold text-defaulttextcolor mb-0">{monthStats.leaveDays}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Shift Details – from student.shift (populated by API) */}
        <div className="box mb-6">
          <div className="box-header">
            <h5 className="font-semibold text-defaulttextcolor mb-0 flex items-center gap-2">
              <i className="ri-time-line text-defaulttextcolor/70" />
              Shift Details
            </h5>
          </div>
          <div className="box-body">
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

        <div className="box">
          <div className="box-header flex flex-wrap items-center justify-between gap-2">
            <div className="box-title">
              Calendar View - {MONTH_NAMES[calendarMonth]} {calendarYear}
            </div>
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-defaulttextcolor/80">View:</span>
              <button
                type="button"
                className={`ti-btn !py-1.5 !px-3 !text-[0.8125rem] ${viewMode === "list" ? "ti-btn-primary" : "ti-btn-outline-primary"}`}
                onClick={() => setViewMode("list")}
              >
                List
              </button>
              <button
                type="button"
                className={`ti-btn !py-1.5 !px-3 !text-[0.8125rem] ${viewMode === "calendar" ? "ti-btn-primary" : "ti-btn-outline-primary"}`}
                onClick={() => setViewMode("calendar")}
              >
                Calendar
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-outline-primary !py-1.5 !px-3 !text-[0.8125rem]"
                onClick={() => {
                  fetchStatus();
                  refetchForMonth();
                }}
                disabled={listLoading}
              >
                {listLoading ? "…" : "Refresh"}
              </button>
            </span>
          </div>
          <div className="box-body">
            {viewMode === "list" && (
              <>
                {listLoading && attendanceList.length === 0 ? (
                  <div className="py-8 text-center text-defaulttextcolor/70">Loading…</div>
                ) : attendanceList.length === 0 ? (
                  <div className="py-8 text-center text-defaulttextcolor/70">No attendance records yet. Use Refresh if you just opened this page from View.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover min-w-full text-[0.8125rem]">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-white/5">
                          <th className="!text-start">Date</th>
                          <th className="!text-start">Day</th>
                          <th className="!text-start">Status</th>
                          <th className="!text-end">Punch In</th>
                          <th className="!text-end">Punch Out</th>
                          <th className="!text-end">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceList.map((r) => {
                          const recordTz = r.timezone ?? "UTC";
                          const recStatus = (r as { status?: string }).status;
                          const isHolidayOrLeave = recStatus === "Holiday" || recStatus === "Leave";
                          return (
                            <tr key={r.id} className={isHolidayOrLeave ? "bg-info/5" : ""}>
                              <td>{formatDate(r.date)}</td>
                              <td>{r.day ?? "—"}</td>
                              <td>
                                {recStatus === "Holiday" ? (
                                  <span className="badge bg-info/10 text-info">{(r as { notes?: string }).notes ? getHolidayNameFromNotes((r as { notes?: string }).notes) || "Holiday" : "Holiday"}</span>
                                ) : recStatus === "Leave" ? (
                                  <span className="badge bg-secondary/10 text-secondary">Leave</span>
                                ) : recStatus === "Absent" ? (
                                  <span className="badge bg-danger/10 text-danger">Absent</span>
                                ) : (
                                  <span className="badge bg-success/10 text-success">Present</span>
                                )}
                              </td>
                              <td className="text-end">{isHolidayOrLeave ? "—" : formatTimeOnlyInTimezone(r.punchIn, recordTz)}</td>
                              <td className="text-end">{isHolidayOrLeave ? "—" : (r.punchOut ? formatTimeOnlyInTimezone(r.punchOut, recordTz) : "—")}</td>
                              <td className="text-end">
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
                  <h4 className="text-sm font-semibold text-defaulttextcolor">
                    {new Date(calendarYear, calendarMonth).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm text-defaulttextcolor/80">Year:</label>
                    <select
                      className="form-control !w-auto !min-w-[5rem] !py-1.5 !px-2 !text-[0.8125rem]"
                      value={calendarYear}
                      onChange={(e) => setCalendarYear(parseInt(e.target.value, 10))}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <label className="text-sm text-defaulttextcolor/80 ml-2">Month:</label>
                    <select
                      className="form-control !w-auto !min-w-[8rem] !py-1.5 !px-2 !text-[0.8125rem]"
                      value={calendarMonth}
                      onChange={(e) => setCalendarMonth(parseInt(e.target.value, 10))}
                    >
                      {[
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December",
                      ].map((name, i) => (
                        <option key={name} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ti-btn ti-btn-soft-primary !py-1.5 !px-2 !text-[0.8125rem]"
                      onClick={() => {
                        const now = new Date();
                        setCalendarYear(now.getFullYear());
                        setCalendarMonth(now.getMonth());
                      }}
                    >
                      This month
                    </button>
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
                      const isWeekOff = cell.day > 0 && isWeekOffDay(cell.date);
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
                              : isWeekOff
                                ? "bg-primary/10"
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
                                      ? "text-primary"
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
                              {isWeekOff && !isToday && (
                                <span className="text-[0.7rem] text-primary mt-0.5">Week-Off</span>
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
                              {!isWeekOff && !isHoliday && !isLeave && cell.present && (
                                <>
                                  <span className="text-[0.7rem] text-success mt-0.5">Present</span>
                                  <span className="text-[0.7rem] text-success">{cell.durationLabel}</span>
                                </>
                              )}
                              {!isWeekOff && !isHoliday && !isLeave && cell.incomplete && (
                                <span className="text-[0.7rem] text-warning mt-0.5">Incomplete</span>
                              )}
                              {!isWeekOff && !isHoliday && !isLeave && !cell.present && !cell.incomplete && isPast && (
                                <span className="text-[0.7rem] text-danger/80 mt-0.5">Absent</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                  Add entries for past dates you forgot to punch in/out. Each entry requires date, punch-in, and punch-out time.
                </div>
                {requestEntries.map((entry, index) => (
                  <div key={index} className="p-4 border border-defaultborder rounded-lg bg-black/5 dark:bg-white/5 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-defaulttextcolor">Entry {index + 1}</span>
                      {requestEntries.length > 1 && (
                        <button type="button" onClick={() => removeRequestEntry(index)} className="text-danger hover:opacity-80" title="Remove">
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
                          onChange={(e) => updateRequestEntry(index, "date", e.target.value)}
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
                          onChange={(e) => updateRequestEntry(index, "punchInTime", e.target.value)}
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">Punch Out *</label>
                        <input
                          type="time"
                          value={entry.punchOutTime}
                          onChange={(e) => updateRequestEntry(index, "punchOutTime", e.target.value)}
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-defaulttextcolor mb-1">Notes (optional)</label>
                        <input
                          type="text"
                          value={entry.notes}
                          onChange={(e) => updateRequestEntry(index, "notes", e.target.value)}
                          placeholder="Notes for this entry"
                          className="ti-form-input w-full !py-1.5"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addRequestEntry}
                  className="w-full py-2 border-2 border-dashed border-defaultborder rounded-lg text-defaulttextcolor/70 hover:border-primary hover:text-primary flex items-center justify-center gap-2"
                >
                  <i className="ri-add-line" /> Add Another Entry
                </button>
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
