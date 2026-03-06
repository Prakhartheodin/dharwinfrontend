"use client";

import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { getMyStudent } from "@/shared/lib/api/student-courses";
import * as attendanceApi from "@/shared/lib/api/attendance";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";
import { useAuth } from "@/shared/contexts/auth-context";
import { downloadCsv } from "@/shared/lib/csv-export";
import dynamic from "next/dynamic";
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
const Bar = dynamic(() => import("react-chartjs-2").then((m) => m.Bar), { ssr: false });

const POLL_INTERVAL_MS = 30000;
const TRACK_POLL_MS = 10000;
const ELAPSED_UPDATE_MS = 1000;
const AUTO_PUNCH_OUT_HOURS = 12;
const AUTO_PUNCH_OUT_WARNING_BEFORE_MS = 15 * 60 * 1000;

/** Detect timezone from browser (used for punch-in; no user selection required). */
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

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateStr;
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

const tz = (zone: string) => zone || "UTC";

/** Format date+time in record's timezone (for admin tables). */
function formatTimeInTimezone(dateStr: string | null, timezone: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      timeZone: tz(timezone),
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return new Date(dateStr).toLocaleString();
  }
}

/** Format time only in record's timezone so punch in/out are consistent with auto punch-out. */
function formatTimeOnlyInTimezone(dateStr: string | null, timezone: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleTimeString(undefined, {
      timeZone: tz(timezone),
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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

export default function AttendanceTracking() {
  const { user } = useAuth();
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
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

  const fetchStatus = useCallback(async (studentId: string) => {
    setStatusLoading(true);
    try {
      const res = await attendanceApi.getPunchInOutStatus(studentId);
      setStatus(res);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchList = useCallback(async (studentId: string) => {
    setListLoading(true);
    try {
      const res = await attendanceApi.listAttendance(studentId, { limit: 31, page: 1 });
      setAttendanceList(res.results ?? []);
    } catch {
      setAttendanceList([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingStudent(true);
      setError(null);
      try {
        const student = await getMyStudent();
        if (!cancelled && student?.id) {
          setMyStudentId(student.id);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const status = (e as { response?: { status?: number } })?.response?.status;
          if (status !== 404) setError("Failed to load your profile.");
        }
      } finally {
        if (!cancelled) setLoadingStudent(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!myStudentId) return;
    fetchStatus(myStudentId);
    fetchList(myStudentId);
    const id = setInterval(() => fetchStatus(myStudentId), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [myStudentId, fetchStatus, fetchList]);

  useEffect(() => {
    if (!status?.isPunchedIn || !status?.record?.punchIn) {
      setElapsedDisplay("");
      return;
    }
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
    if (status?.isPunchedIn === false && prevPunchedInRef.current === true) {
      setToastMessage("You have been punched out.");
      setAutoWarningShown(false);
    }
    prevPunchedInRef.current = status?.isPunchedIn ?? null;
  }, [status?.isPunchedIn]);

  useEffect(() => {
    if (!myStudentId) return;
    attendanceApi.getAttendanceStatistics(myStudentId).then(setSummaryStats).catch(() => setSummaryStats(null));
  }, [myStudentId]);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status?.isPunchedIn) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status?.isPunchedIn]);

  const handlePunchIn = async () => {
    if (!myStudentId) return;
    setPunchLoading(true);
    setError(null);
    try {
      const timezone = getDetectedTimezone();
      await attendanceApi.punchInAttendance(myStudentId, { timezone });
      await fetchStatus(myStudentId);
      await fetchList(myStudentId);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Punch in failed.");
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!myStudentId) return;
    setPunchLoading(true);
    setError(null);
    try {
      await attendanceApi.punchOutAttendance(myStudentId, { punchOutTime: new Date().toISOString() });
      await fetchStatus(myStudentId);
      await fetchList(myStudentId);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Punch out failed.");
    } finally {
      setPunchLoading(false);
    }
  };

  useEffect(() => {
    if (myStudentId !== null) return;
    let cancelled = false;
    setTrackListLoading(true);
    setCanTrackAll(false);
    attendanceApi
      .getAttendanceTrackList()
      .then((res) => {
        if (!cancelled) {
          setTrackList(res.results ?? []);
          setCanTrackAll(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTrackList([]);
          setCanTrackAll(false);
        }
      })
      .finally(() => {
        if (!cancelled) setTrackListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [myStudentId]);

  useEffect(() => {
    if (!user?.roleIds?.length || myStudentId !== null) return;
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
      if (!cancelled) {
        setCanPunchOutOthers(
          admin || Array.from(perms).some((p) => p === "students.manage" || p.startsWith("students.manage"))
        );
      }
    }).catch(() => {
      if (!cancelled) setCanPunchOutOthers(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.roleIds, myStudentId]);

  const handleAdminPunchOut = useCallback(async (studentId: string) => {
    setPunchOutLoadingId(studentId);
    try {
      await attendanceApi.punchOutAttendance(studentId, {});
      await attendanceApi.getAttendanceTrackList().then((res) => setTrackList(res.results ?? []));
      const params = historyRange === "7d" ? { startDate: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) } : historyRange === "30d" ? { startDate: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) } : {};
      attendanceApi.getAttendanceTrackHistory(params).then((res) => setHistoryList(res.results ?? []));
    } catch {
      // keep list as is
    } finally {
      setPunchOutLoadingId(null);
    }
  }, [historyRange]);

  const fetchHistoryList = useCallback(() => {
    if (!canTrackAll || myStudentId !== null) return;
    const params =
      historyRange === "7d"
        ? { startDate: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), limit: 500 }
        : historyRange === "30d"
          ? { startDate: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), limit: 500 }
          : { limit: 500 };
    setHistoryLoading(true);
    attendanceApi
      .getAttendanceTrackHistory(params)
      .then((res) => setHistoryList(res.results ?? []))
      .catch(() => setHistoryList([]))
      .finally(() => setHistoryLoading(false));
  }, [canTrackAll, myStudentId, historyRange]);

  useEffect(() => {
    fetchHistoryList();
  }, [fetchHistoryList]);

  const switchToHistory = useCallback(() => {
    setAttendanceView("history");
    fetchHistoryList();
  }, [fetchHistoryList]);

  const switchToDashboard = useCallback(() => {
    setAttendanceView("dashboard");
    fetchHistoryList();
  }, [fetchHistoryList]);

  const fetchTrackList = useCallback(() => {
    if (myStudentId !== null) return;
    setTrackListLoading(true);
    attendanceApi
      .getAttendanceTrackList()
      .then((res) => setTrackList(res.results ?? []))
      .catch(() => setTrackList([]))
      .finally(() => setTrackListLoading(false));
  }, [myStudentId]);

  const switchToTrack = useCallback(() => {
    setAttendanceView("track");
    fetchTrackList();
  }, [fetchTrackList]);

  useEffect(() => {
    if (!canTrackAll || myStudentId !== null || attendanceView !== "track") return;
    const id = setInterval(fetchTrackList, TRACK_POLL_MS);
    return () => clearInterval(id);
  }, [canTrackAll, myStudentId, attendanceView, fetchTrackList]);

  const exportMyAttendanceCsv = useCallback(() => {
    const rows = attendanceList.map((r) => {
      const tz = r.timezone ?? "UTC";
      return {
        Date: formatDate(r.date),
        Day: r.day ?? "",
        PunchIn: formatTimeOnlyInTimezone(r.punchIn, tz),
        PunchOut: r.punchOut ? formatTimeOnlyInTimezone(r.punchOut, tz) : "",
        Duration: r.duration != null ? formatDuration(r.duration) : "",
      };
    });
    downloadCsv(
      `my-attendance-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: "Date", label: "Date" },
        { key: "Day", label: "Day" },
        { key: "PunchIn", label: "Punch In" },
        { key: "PunchOut", label: "Punch Out" },
        { key: "Duration", label: "Duration" },
      ],
      rows
    );
  }, [attendanceList]);

  const exportTrackCsv = useCallback(() => {
    const rows = trackList.map((row) => ({
      Name: row.studentName,
      Email: row.email,
      Status: row.isPunchedIn ? "Punched In" : "Punched Out",
      "Punch In": row.punchIn ? formatTimeInTimezone(row.punchIn, row.timezone) : "",
      "Punch Out": row.punchOut ? formatTimeInTimezone(row.punchOut, row.timezone) : "",
      Duration: row.isPunchedIn ? "In progress" : formatDurationFromMs(row.durationMs ?? null),
      Timezone: row.timezone,
    }));
    downloadCsv(
      `track-attendance-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: "Name", label: "Name" },
        { key: "Email", label: "Email" },
        { key: "Status", label: "Status" },
        { key: "Punch In", label: "Punch In" },
        { key: "Punch Out", label: "Punch Out" },
        { key: "Duration", label: "Duration" },
        { key: "Timezone", label: "Timezone" },
      ],
      rows
    );
  }, [trackList]);

  const exportHistoryCsv = useCallback(() => {
    const rows = historyList.map((row) => ({
      Name: row.studentName,
      Email: row.email,
      Date: formatDate(row.date),
      Day: row.day ?? "",
      "Punch In": row.punchIn ? formatTimeInTimezone(row.punchIn, row.timezone) : "",
      "Punch Out": row.punchOut ? formatTimeInTimezone(row.punchOut, row.timezone) : "",
      Duration: formatDurationFromMs(row.durationMs ?? null),
      Timezone: row.timezone,
    }));
    downloadCsv(
      `attendance-history-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: "Name", label: "Name" },
        { key: "Email", label: "Email" },
        { key: "Date", label: "Date" },
        { key: "Day", label: "Day" },
        { key: "Punch In", label: "Punch In" },
        { key: "Punch Out", label: "Punch Out" },
        { key: "Duration", label: "Duration" },
        { key: "Timezone", label: "Timezone" },
      ],
      rows
    );
  }, [historyList]);

  const canPunch = !!myStudentId;
  const isCandidateOnly = canPunch && !canTrackAll;

  return (
    <Fragment>
      <Seo title={isCandidateOnly ? "Attendance" : "Attendance Tracking"} />
      <Pageheader
        currentpage={isCandidateOnly ? "Attendance" : "Attendance Tracking"}
        activepage={isCandidateOnly ? "Attendance" : "Training Management"}
        mainpage={isCandidateOnly ? "Attendance" : "Attendance Tracking"}
      />

      {canPunch && status?.isPunchedIn && (
        <div className="sticky top-0 z-10 mx-4 mb-4 rounded-lg bg-success/15 border border-success/30 px-4 py-2 text-sm text-success flex flex-wrap items-center justify-between gap-2">
          <span>You're clocked in — {elapsedDisplay}</span>
          <span className="text-defaulttextcolor/70 text-xs">Timezone: {getDetectedTimezone()}</span>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-defaulttextcolor text-white px-4 py-3 shadow-lg text-sm animate-fade-in">
          {toastMessage}
        </div>
      )}

      <div className="container w-full max-w-full mx-auto">
        {loadingStudent ? (
          <div className="py-8 text-defaulttextcolor/70">Loading…</div>
        ) : error ? (
          <div className="mb-4 p-4 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm">
            {error}
          </div>
        ) : null}

        {canPunch && summaryStats && (
          <div className="box mb-6">
            <div className="box-header">
              <div className="box-title">Summary</div>
            </div>
            <div className="box-body grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-[0.8125rem]">
              <div><span className="text-defaulttextcolor/70">Total days</span><div className="font-medium">{summaryStats.totalDays}</div></div>
              <div><span className="text-defaulttextcolor/70">Total hours</span><div className="font-medium">{summaryStats.totalHours}</div></div>
              <div><span className="text-defaulttextcolor/70">This week</span><div className="font-medium">{summaryStats.totalHoursWeek ?? "—"} h</div></div>
              <div><span className="text-defaulttextcolor/70">This month</span><div className="font-medium">{summaryStats.totalHoursMonth ?? "—"} h</div></div>
              <div><span className="text-defaulttextcolor/70">Avg session</span><div className="font-medium">{summaryStats.averageSessionMinutes != null ? `${summaryStats.averageSessionMinutes} m` : "—"}</div></div>
              <div><span className="text-defaulttextcolor/70">Late in / Early out</span><div className="font-medium">{summaryStats.latePunchInCount ?? 0} / {summaryStats.earlyPunchOutCount ?? 0}</div></div>
            </div>
          </div>
        )}

        {canPunch && (
          <div className="grid grid-cols-12 gap-6 mb-6">
            <div className="col-span-12 lg:col-span-6">
              <div className="box">
                <div className="box-header">
                  <div className="box-title">Punch In / Out</div>
                </div>
                <div className="box-body space-y-4">
                  <p className="text-[0.75rem] text-defaulttextcolor/60">
                    Timezone: {getDetectedTimezone()}
                  </p>
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
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary min-w-[7.5rem]"
                      onClick={handlePunchIn}
                      disabled={punchLoading || status?.isPunchedIn}
                    >
                      {punchLoading ? "…" : "Punch In"}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-outline-danger min-w-[7.5rem]"
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

        {canPunch && (
          <div className="box mb-6">
            <div className="box-header flex flex-wrap items-center justify-between gap-2">
              <div className="box-title">My Attendance</div>
              <button type="button" className="ti-btn ti-btn-outline-primary !py-1.5 !px-3 !text-[0.8125rem]" onClick={exportMyAttendanceCsv} disabled={attendanceList.length === 0}>
                Export CSV
              </button>
            </div>
            <div className="box-body">
              {listLoading ? (
                <div className="py-8 text-center text-defaulttextcolor/70">Loading…</div>
              ) : attendanceList.length === 0 ? (
                <div className="py-8 text-center text-defaulttextcolor/70">No attendance records yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover min-w-full text-[0.8125rem]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/5">
                        <th className="!text-start">Date</th>
                        <th className="!text-start">Day</th>
                        <th className="!text-end">Punch In</th>
                        <th className="!text-end">Punch Out</th>
                        <th className="!text-end">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceList.map((r) => {
                        const recordTz = r.timezone ?? "UTC";
                        return (
                          <tr key={r.id}>
                            <td>{formatDate(r.date)}</td>
                            <td>{r.day ?? "—"}</td>
                            <td className="text-end">{formatTimeOnlyInTimezone(r.punchIn, recordTz)}</td>
                            <td className="text-end">{r.punchOut ? formatTimeOnlyInTimezone(r.punchOut, recordTz) : "—"}</td>
                            <td className="text-end">
                              {r.punchOut
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
            </div>
          </div>
        )}

        {!canPunch && !loadingStudent && (canTrackAll || trackList.length > 0) && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                className={`ti-btn ${attendanceView === "track" ? "ti-btn-primary" : "ti-btn-outline-primary"}`}
                onClick={switchToTrack}
              >
                Track Attendance
              </button>
              <button
                type="button"
                className={`ti-btn ${attendanceView === "history" ? "ti-btn-primary" : "ti-btn-outline-primary"}`}
                onClick={switchToHistory}
              >
                Attendance history
              </button>
              <button
                type="button"
                className={`ti-btn ${attendanceView === "dashboard" ? "ti-btn-primary" : "ti-btn-outline-primary"}`}
                onClick={switchToDashboard}
              >
                Dashboard
              </button>
            </div>

            {attendanceView === "track" && (
          <div className="box">
            <div className="box-header flex flex-wrap items-center justify-between gap-2">
              <div className="box-title">Track Attendance</div>
              <button type="button" className="ti-btn ti-btn-outline-primary !py-1.5 !px-3 !text-[0.8125rem]" onClick={exportTrackCsv} disabled={trackList.length === 0}>
                Export CSV
              </button>
            </div>
            <div className="box-body">
              {trackListLoading ? (
                <div className="py-8 text-center text-defaulttextcolor/70">Loading…</div>
              ) : trackList.length === 0 ? (
                <div className="py-8 text-center text-defaulttextcolor/70">No students found.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover min-w-full text-[0.8125rem]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/5">
                        <th className="!text-start">Name</th>
                        <th className="!text-start">Email</th>
                        <th className="!text-start">Status</th>
                        <th className="!text-start">Punch In (timezone)</th>
                        <th className="!text-start">Punch Out (timezone)</th>
                        <th className="!text-start">Duration</th>
                        <th className="!text-start">Timezone</th>
                        <th className="!text-start">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trackList.map((row) => (
                        <tr key={row.studentId}>
                          <td>{row.studentName}</td>
                          <td>{row.email}</td>
                          <td>
                            <span
                              className={`badge ${row.isPunchedIn ? "bg-success/10 text-success" : "bg-defaultborder text-defaulttextcolor"}`}
                            >
                              {row.isPunchedIn ? "Punched In" : "Punched Out"}
                            </span>
                          </td>
                          <td>{formatTimeInTimezone(row.punchIn, row.timezone)}</td>
                          <td>{formatTimeInTimezone(row.punchOut, row.timezone)}</td>
                          <td>
                            {row.isPunchedIn
                              ? "In progress"
                              : formatDurationFromMs(row.durationMs ?? null)}
                          </td>
                          <td>{row.timezone}</td>
                          <td>
                            <span className="flex flex-wrap items-center gap-2">
                              {canPunchOutOthers && row.isPunchedIn ? (
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-outline-danger !py-1 !px-2"
                                  onClick={() => handleAdminPunchOut(row.studentId)}
                                  disabled={punchOutLoadingId === row.studentId}
                                  title="Punch Out"
                                >
                                  {punchOutLoadingId === row.studentId ? (
                                    <i className="ri-loader-4-line animate-spin text-lg" />
                                  ) : (
                                    <>
                                      <i className="ri-logout-box-r-line text-lg" />
                                      <span className="ms-1">Punch Out</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-defaulttextcolor/50">—</span>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
            )}

            {attendanceView === "history" && (
          <div className="box">
            <div className="box-header flex flex-wrap items-center justify-between gap-2">
              <div className="box-title">Attendance history</div>
              <span className="flex flex-wrap items-center gap-2">
                <button type="button" className="ti-btn ti-btn-outline-primary !py-1.5 !px-3 !text-[0.8125rem]" onClick={exportHistoryCsv} disabled={historyList.length === 0}>
                  Export CSV
                </button>
                <select
                className="form-control !w-auto !py-1.5 !px-3 !text-[0.8125rem]"
                value={historyRange}
                onChange={(e) => setHistoryRange((e.target.value as "7d" | "30d" | "all") || "30d")}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="all">All time</option>
              </select>
              </span>
            </div>
            <div className="box-body">
              {historyLoading ? (
                <div className="py-8 text-center text-defaulttextcolor/70">Loading history…</div>
              ) : historyList.length === 0 ? (
                <div className="py-8 text-center text-defaulttextcolor/70">No attendance records in this period.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover min-w-full text-[0.8125rem]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/5">
                        <th className="!text-start">Name</th>
                        <th className="!text-start">Email</th>
                        <th className="!text-start">Date</th>
                        <th className="!text-start">Day</th>
                        <th className="!text-start">Punch In (timezone)</th>
                        <th className="!text-start">Punch Out (timezone)</th>
                        <th className="!text-start">Duration</th>
                        <th className="!text-start">Timezone</th>
                        <th className="!text-start">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((row) => (
                        <tr key={row.id}>
                          <td>{row.studentName}</td>
                          <td>{row.email}</td>
                          <td>{formatDate(row.date)}</td>
                          <td>{row.day ?? "—"}</td>
                          <td>{formatTimeInTimezone(row.punchIn, row.timezone)}</td>
                          <td>{row.punchOut ? formatTimeInTimezone(row.punchOut, row.timezone) : "In progress"}</td>
                          <td>{row.punchOut ? formatDurationFromMs(row.durationMs ?? null) : "In progress"}</td>
                          <td>{row.timezone}</td>
                          <td>
                            <Link
                              href={`/training/attendance/student/${row.studentId}`}
                              className="text-primary hover:underline text-[0.8125rem]"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
            )}

            {attendanceView === "dashboard" && (
              <div className="grid grid-cols-12 gap-6">
                {historyLoading ? (
                  <div className="col-span-12 py-8 text-center text-defaulttextcolor/70">Loading dashboard…</div>
                ) : (
                <>
                {(() => {
                  const list = historyList;
                  const hoursByDate: Record<string, number> = {};
                  const sessionsByStudent: Record<string, { name: string; count: number }> = {};
                  const punchInByHour: number[] = Array.from({ length: 24 }, () => 0);
                  list.forEach((row) => {
                    const dateKey = new Date(row.date).toISOString().slice(0, 10);
                    hoursByDate[dateKey] = (hoursByDate[dateKey] || 0) + ((row.durationMs ?? 0) / (1000 * 60 * 60));
                    const sid = row.studentId;
                    if (!sessionsByStudent[sid]) sessionsByStudent[sid] = { name: row.studentName, count: 0 };
                    sessionsByStudent[sid].count += 1;
                    if (row.punchIn) {
                      try {
                        const hour = parseInt(new Date(row.punchIn).toLocaleString("en-US", { timeZone: row.timezone || "UTC", hour: "numeric", hour12: false }), 10);
                        if (hour >= 0 && hour < 24) punchInByHour[hour] += 1;
                      } catch {
                        const h = new Date(row.punchIn).getHours();
                        punchInByHour[h] += 1;
                      }
                    }
                  });
                  const dateLabels = Object.keys(hoursByDate).sort().slice(-14);
                  const hoursData = dateLabels.map((d) => Math.round((hoursByDate[d] || 0) * 100) / 100);
                  const studentLabels = Object.values(sessionsByStudent).map((s) => s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name);
                  const sessionsData = Object.values(sessionsByStudent).map((s) => s.count);
                  const barOpt = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: {} } };
                  return (
                    <>
                      <div className="col-span-12 xl:col-span-6">
                        <div className="box">
                          <div className="box-header"><div className="box-title">Hours per day (last 14 days)</div></div>
                          <div className="box-body" style={{ height: 280 }}>
                            {dateLabels.length ? <Bar options={barOpt} data={{ labels: dateLabels, datasets: [{ label: "Hours", data: hoursData, backgroundColor: "rgba(132, 90, 223, 0.2)", borderColor: "rgb(132, 90, 223)", borderWidth: 1 }] }} /> : <div className="flex items-center justify-center h-full text-defaulttextcolor/70">No data for this range.</div>}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-12 xl:col-span-6">
                        <div className="box">
                          <div className="box-header"><div className="box-title">Sessions per student</div></div>
                          <div className="box-body" style={{ height: 280 }}>
                            {studentLabels.length ? <Bar options={{ ...barOpt, indexAxis: "y" as const }} data={{ labels: studentLabels, datasets: [{ label: "Sessions", data: sessionsData, backgroundColor: "rgba(35, 183, 229, 0.2)", borderColor: "rgb(35, 183, 229)", borderWidth: 1 }] }} /> : <div className="flex items-center justify-center h-full text-defaulttextcolor/70">No data for this range.</div>}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-12">
                        <div className="box">
                          <div className="box-header"><div className="box-title">Punch-in distribution (by hour)</div></div>
                          <div className="box-body" style={{ height: 280 }}>
                            {list.length ? <Bar options={barOpt} data={{ labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), datasets: [{ label: "Punch-ins", data: punchInByHour, backgroundColor: "rgba(38, 191, 148, 0.2)", borderColor: "rgb(38, 191, 148)", borderWidth: 1 }] }} /> : <div className="flex items-center justify-center h-full text-defaulttextcolor/70">No data for this range.</div>}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
                </>
                )}
              </div>
            )}
          </>
        )}

        {!canPunch && !loadingStudent && !canTrackAll && trackList.length === 0 && !trackListLoading && (
          <div className="py-8 text-center text-defaulttextcolor/70">
            You do not have a student profile. Contact an administrator to get access to attendance.
          </div>
        )}
      </div>
    </Fragment>
  );
}
