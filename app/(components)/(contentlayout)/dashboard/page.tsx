"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  getAtsAnalytics,
  type AtsAnalyticsResponse,
  type StatusCount,
} from "@/shared/lib/api/atsAnalytics";
import {
  listCandidates,
  type CandidateListItem,
} from "@/shared/lib/api/candidates";
import {
  listTasks,
  type Task,
  type TaskStatus,
  TASK_STATUS_LABELS,
} from "@/shared/lib/api/tasks";
import { listJobs, type Job } from "@/shared/lib/api/jobs";
import { listJobApplications } from "@/shared/lib/api/jobApplications";
import { listProjects, type Project } from "@/shared/lib/api/projects";
import {
  getMyStudentForAttendance,
  getPunchInOutStatus,
  punchInAttendance,
  punchOutAttendance,
  type PunchStatusResponse,
} from "@/shared/lib/api/attendance";
import {
  listMeetings,
  type Meeting,
} from "@/shared/lib/api/meetings";
import {
  getNotifications,
  getUnreadCount,
  type Notification,
} from "@/shared/lib/api/notifications";
import {
  getTrainingAnalytics,
  type TrainingAnalyticsResponse,
} from "@/shared/lib/api/analytics";
import type { ApexOptions } from "apexcharts";
import * as Projectdata from "@/shared/data/dashboards/projectsdata";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(s: string | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(s: string | undefined | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function isToday(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dateOnly = dateStr.slice(0, 10);
  if (dateOnly === todayStr) return true;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isFuture(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() > Date.now();
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getStatusBadgeClass(status: string): string {
  const lower = String(status).toLowerCase().replace(/[\s_]+/g, "");
  if (lower === "completed" || lower === "hired" || lower === "selected")
    return "badge bg-success/10 text-success";
  if (
    lower === "inprogress" ||
    lower === "ongoing" ||
    lower === "inreview" ||
    lower === "onhold" ||
    lower === "scheduled"
  )
    return "badge bg-primary/10 text-primary";
  if (lower === "pending" || lower === "todo" || lower === "new")
    return "badge bg-warning/10 text-warning";
  if (lower === "rejected" || lower === "overdue" || lower === "cancelled")
    return "badge bg-danger/10 text-danger";
  return "badge bg-secondary/10 text-secondary";
}

function getInitial(name: string | undefined | null): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayDisplay(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Chart builders                                                     */
/* ------------------------------------------------------------------ */

const TASK_STATUS_ORDER: TaskStatus[] = [
  "new",
  "todo",
  "on_going",
  "in_review",
  "completed",
];
const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  new: "#f5b849",
  todo: "#f97316",
  on_going: "#845ADF",
  in_review: "#49B6F5",
  completed: "#26BF94",
};

function buildTaskStatusChart(tasks: Task[]): {
  options: ApexOptions;
  series: number[];
} {
  const counts: Record<TaskStatus, number> = {
    new: 0,
    todo: 0,
    on_going: 0,
    in_review: 0,
    completed: 0,
  };
  for (const t of tasks) {
    if (t.status in counts) counts[t.status]++;
  }
  return {
    series: TASK_STATUS_ORDER.map((s) => counts[s]),
    options: {
      chart: {
        type: "donut",
        height: 260,
        fontFamily: "Poppins, Arial, sans-serif",
      },
      labels: TASK_STATUS_ORDER.map((s) => TASK_STATUS_LABELS[s]),
      colors: TASK_STATUS_ORDER.map((s) => TASK_STATUS_COLORS[s]),
      legend: {
        position: "bottom",
        fontSize: "12px",
        labels: { colors: "#8c9097" },
      },
      dataLabels: { enabled: true, style: { fontSize: "11px" } },
      plotOptions: { pie: { donut: { size: "55%" } } },
      tooltip: {
        y: {
          formatter: (val: number) => `${val} task${val !== 1 ? "s" : ""}`,
        },
      },
    },
  };
}

function buildFunnelChart(funnel: StatusCount[]): {
  options: ApexOptions;
  series: ApexAxisChartSeries;
} {
  const order = [
    "applied",
    "screening",
    "interview",
    "offered",
    "hired",
    "rejected",
  ];
  const colorMap: Record<string, string> = {
    applied: "#845ADF",
    screening: "#49B6F5",
    interview: "#f5b849",
    offered: "#f97316",
    hired: "#26BF94",
    rejected: "#e6533c",
  };
  const sorted = [...funnel].sort(
    (a, b) =>
      order.indexOf(a.status.toLowerCase()) -
      order.indexOf(b.status.toLowerCase())
  );
  return {
    series: [{ name: "Applications", data: sorted.map((s) => s.count) }],
    options: {
      chart: {
        type: "bar",
        height: 260,
        fontFamily: "Poppins, Arial, sans-serif",
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
          distributed: true,
          barHeight: "70%",
        },
      },
      colors: sorted.map(
        (s) => colorMap[s.status.toLowerCase()] ?? "#8c9097"
      ),
      dataLabels: {
        enabled: true,
        style: { fontSize: "11px", fontWeight: 600 },
      },
      xaxis: {
        categories: sorted.map(
          (s) => s.status.charAt(0).toUpperCase() + s.status.slice(1)
        ),
      },
      legend: { show: false },
      tooltip: {
        y: {
          formatter: (val: number) =>
            `${val} application${val !== 1 ? "s" : ""}`,
        },
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Notification icon helper                                           */
/* ------------------------------------------------------------------ */
const NOTIF_ICONS: Record<string, { icon: string; color: string }> = {
  task: { icon: "ti ti-checklist", color: "primary" },
  leave: { icon: "ti ti-calendar-off", color: "warning" },
  meeting: { icon: "ti ti-video", color: "info" },
  meeting_reminder: { icon: "ti ti-bell", color: "info" },
  offer: { icon: "ti ti-file-invoice", color: "success" },
  course: { icon: "ti ti-book", color: "secondary" },
  certificate: { icon: "ti ti-certificate", color: "success" },
  job_application: { icon: "ti ti-briefcase", color: "primary" },
  project: { icon: "ti ti-layout-grid", color: "primary" },
  account: { icon: "ti ti-user", color: "warning" },
  recruiter: { icon: "ti ti-users", color: "secondary" },
  general: { icon: "ti ti-info-circle", color: "secondary" },
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const unauthorized = searchParams.get("unauthorized") === "1";
  const { user } = useAuth();

  /* ---- State ---- */
  const [atsData, setAtsData] = useState<AtsAnalyticsResponse | null>(null);
  const [trainingData, setTrainingData] =
    useState<TrainingAnalyticsResponse | null>(null);
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [applicantCountByJob, setApplicantCountByJob] = useState<
    Record<string, number>
  >({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [attendanceStudent, setAttendanceStudent] = useState<{
    id: string;
    user: { id: string; name: string; email: string };
  } | null>(null);
  const [punchStatus, setPunchStatus] = useState<PunchStatusResponse | null>(
    null
  );
  const [punchLoading, setPunchLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Data fetching ---- */
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [
      atsRes,
      trainingRes,
      candidatesRes,
      tasksRes,
      jobsRes,
      applicationsRes,
      projectsRes,
      meetingsRes,
      notifsRes,
      unreadRes,
      studentRes,
    ] = await Promise.allSettled([
      getAtsAnalytics(),
      getTrainingAnalytics(),
      listCandidates({ limit: 5 }),
      listTasks({ assignedToMe: true, limit: 50 }),
      listJobs({ limit: 6, sortBy: "createdAt:desc" }),
      listJobApplications({ limit: 500 }),
      listProjects({ limit: 100 }),
      listMeetings({ limit: 5, sortBy: "scheduledAt:asc", status: "scheduled" }),
      getNotifications({ limit: 5 }),
      getUnreadCount(),
      getMyStudentForAttendance(),
    ]);

    if (atsRes.status === "fulfilled") setAtsData(atsRes.value);
    if (trainingRes.status === "fulfilled") setTrainingData(trainingRes.value);
    if (candidatesRes.status === "fulfilled")
      setCandidates(candidatesRes.value.results ?? []);
    if (tasksRes.status === "fulfilled")
      setMyTasks(tasksRes.value.results ?? []);
    if (jobsRes.status === "fulfilled")
      setRecentJobs(jobsRes.value.results ?? []);

    if (applicationsRes.status === "fulfilled") {
      const apps = applicationsRes.value.results ?? [];
      const map: Record<string, number> = {};
      for (const app of apps) {
        const jRef = app.job;
        const jobId =
          typeof jRef === "object" && jRef !== null ? jRef._id : jRef;
        if (jobId) {
          const key = String(jobId);
          map[key] = (map[key] ?? 0) + 1;
        }
      }
      setApplicantCountByJob(map);
    }

    if (projectsRes.status === "fulfilled")
      setProjects(projectsRes.value.results ?? []);
    if (meetingsRes.status === "fulfilled") {
      const upcoming = (meetingsRes.value.results ?? []).filter((m) =>
        isFuture(m.scheduledAt)
      );
      setMeetings(upcoming.slice(0, 5));
    }
    if (notifsRes.status === "fulfilled")
      setNotifications(notifsRes.value.results ?? []);
    if (unreadRes.status === "fulfilled") setUnreadCount(unreadRes.value);

    if (studentRes.status === "fulfilled" && studentRes.value) {
      setAttendanceStudent(studentRes.value as { id: string; user: { id: string; name: string; email: string } });
      try {
        const status = await getPunchInOutStatus(studentRes.value.id);
        setPunchStatus(status);
      } catch {
        /* silent */
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /* ---- Punch in/out handler ---- */
  const handlePunch = async () => {
    if (!attendanceStudent) return;
    setPunchLoading(true);
    try {
      if (punchStatus?.isPunchedIn) {
        await punchOutAttendance(attendanceStudent.id);
      } else {
        await punchInAttendance(attendanceStudent.id);
      }
      const status = await getPunchInOutStatus(attendanceStudent.id);
      setPunchStatus(status);
    } catch {
      /* silent */
    } finally {
      setPunchLoading(false);
    }
  };

  /* ---- Derived data ---- */
  const dailyTasks = useMemo(
    () => myTasks.filter((t) => isToday(t.dueDate)),
    [myTasks]
  );
  const displayMyTasks = myTasks.slice(0, 6);
  const taskChart = useMemo(() => buildTaskStatusChart(myTasks), [myTasks]);
  const funnelChart = useMemo(
    () =>
      atsData?.applicationFunnel?.length
        ? buildFunnelChart(atsData.applicationFunnel)
        : null,
    [atsData]
  );

  const totals = atsData?.totals;
  const projectCount = projects.length;
  const studentCount = trainingData?.totalStudents ?? 0;

  /* ---- Skeleton loader ---- */
  const Skeleton = ({ className = "" }: { className?: string }) => (
    <div
      className={`animate-pulse bg-black/5 dark:bg-white/10 rounded ${className}`}
    />
  );

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <Fragment>
      <Seo title="Dashboard" />

      {unauthorized && (
        <div className="mb-4 p-4 bg-warning/10 border border-warning/30 text-warning rounded-md text-sm">
          You do not have permission to access that page. You have been
          redirected to the dashboard.
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
          {error}
        </div>
      )}

      {/* ========== WELCOME BAR ========== */}
      <div className="box mb-4">
        <div className="box-body flex flex-wrap items-center justify-between gap-4 !py-3">
          <div>
            <h4 className="font-semibold text-[1.125rem] mb-0">
              {getGreeting()},{" "}
              <span className="text-primary">{user?.name || "there"}</span>
            </h4>
            <span className="text-[#8c9097] dark:text-white/50 text-[0.8125rem]">
              {getTodayDisplay()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Attendance quick-action */}
            {attendanceStudent && (
              <button
                onClick={handlePunch}
                disabled={punchLoading}
                className={`ti-btn ti-btn-sm ti-btn-wave ${
                  punchStatus?.isPunchedIn
                    ? "bg-danger text-white"
                    : "bg-success text-white"
                } disabled:opacity-60`}
              >
                <i
                  className={`ti ${punchStatus?.isPunchedIn ? "ti-clock-pause" : "ti-clock-play"} me-1`}
                ></i>
                {punchLoading
                  ? "…"
                  : punchStatus?.isPunchedIn
                    ? "Punch Out"
                    : "Punch In"}
              </button>
            )}
            {/* Notifications */}
            <Link
              href="/pages/notifications"
              className="relative ti-btn ti-btn-sm ti-btn-light"
            >
              <i className="ti ti-bell text-[1.1rem]"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -end-1 badge bg-danger text-white rounded-full text-[0.6rem] min-w-[18px] h-[18px] flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Layout from dharwinone_frontend reference: xxl:9 | xxl:3, then full-width Projects Summary */}
      <div className="grid grid-cols-12 gap-x-6">
        <div className="xxl:col-span-9 col-span-12">
          <div className="grid grid-cols-12 gap-x-6">
            {/* LEFT: 4 stat cards + Project Analysis (directly under stats) */}
            <div className="xxl:col-span-5 col-span-12">
              <div className="grid grid-cols-12 gap-x-6">
                <div className="sm:col-span-6 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1">Total Jobs</p>
                        {loading ? (
                          <Skeleton className="h-7 w-16 mb-1" />
                        ) : (
                          <h4 className="font-semibold mb-1 text-[1.5rem]">{totals?.totalJobs ?? 0}</h4>
                        )}
                        <span className="badge bg-success/10 text-success">1.5% <i className="ti ti-trending-up ms-1"></i></span>
                        <span className="text-[#8c9097] dark:text-white/50 text-[0.6875rem] ms-1">this month</span>
                      </div>
                      <span className="avatar avatar-md bg-primary text-white p-2">
                        <i className="ti ti-briefcase text-[1.25rem] text-white opacity-[0.7]"></i>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1">Active Jobs</p>
                        {loading ? (
                          <Skeleton className="h-7 w-16 mb-1" />
                        ) : (
                          <h4 className="font-semibold mb-1 text-[1.5rem]">{totals?.activeJobs ?? 0}</h4>
                        )}
                        <span className="badge bg-danger/10 text-danger">0.8% <i className="ti ti-trending-down ms-1"></i></span>
                        <span className="text-[#8c9097] dark:text-white/50 text-[0.6875rem] ms-1">open</span>
                      </div>
                      <span className="avatar avatar-md bg-secondary text-white p-2">
                        <i className="ti ti-briefcase-2 text-[1.25rem] opacity-[0.7]"></i>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1">Total Candidates</p>
                        {loading ? (
                          <Skeleton className="h-7 w-16 mb-1" />
                        ) : (
                          <h4 className="font-semibold mb-1 text-[1.5rem]">{totals?.totalCandidates ?? 0}</h4>
                        )}
                        <span className="badge bg-success/10 text-success">0.5% <i className="ti ti-trending-up ms-1"></i></span>
                        <span className="text-[#8c9097] dark:text-white/50 text-[0.6875rem] ms-1">ATS</span>
                      </div>
                      <span className="avatar avatar-md bg-success text-white p-2">
                        <i className="ti ti-users text-[1.25rem] opacity-[0.7]"></i>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <div className="box">
                    <div className="box-body flex justify-between items-center">
                      <div>
                        <p className="mb-1">Applications</p>
                        {loading ? (
                          <Skeleton className="h-7 w-16 mb-1" />
                        ) : (
                          <h4 className="font-semibold mb-1 text-[1.5rem]">{totals?.totalApplications ?? 0}</h4>
                        )}
                        <span className="badge bg-success/10 text-success">0.5% <i className="ti ti-trending-up ms-1"></i></span>
                        <span className="text-[#8c9097] dark:text-white/50 text-[0.6875rem] ms-1">All time</span>
                      </div>
                      <span className="avatar avatar-md bg-warning text-white p-2">
                        <i className="ti ti-file-description text-[1.25rem] opacity-[0.7]"></i>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="xl:col-span-12 col-span-12">
                  <div className="box">
                    <div className="box-header justify-between">
                      <div className="box-title">Project Analysis</div>
                      <Link href="/ats/analytics" className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50">View All <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i></Link>
                    </div>
                    <div className="box-body">
                      {loading ? (
                        <Skeleton className="h-[315px] w-full" />
                      ) : funnelChart ? (
                        <ReactApexChart options={funnelChart.options} series={funnelChart.series} type="bar" height={280} />
                      ) : (
                        <div id="projectAnalysis">
                          <ReactApexChart options={Projectdata.ProjectAnalysis.options} series={Projectdata.ProjectAnalysis.series} type="line" width="100%" height={315} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* MIDDLE: Team Members + Main Tasks (Main Tasks directly under Team Members) */}
            <div className="xxl:col-span-4 col-span-12">
              <div className="grid grid-cols-12 gap-x-6">
                <div className="xl:col-span-12 col-span-12">
                  <div className="box">
                    <div className="box-header justify-between">
                      <div className="box-title">Team Members</div>
                      <Link href="/ats/candidates" className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50">View All <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i></Link>
                    </div>
                    <div className="box-body">
                      {loading ? (
                        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                      ) : candidates.length === 0 ? (
                        <p className="text-[#8c9097] dark:text-white/50 text-sm">No candidates yet.</p>
                      ) : (
                        <ul className="list-none team-members-card mb-0">
                          {candidates.map((c, idx) => {
                            const cId = c._id ?? c.id ?? "";
                            const TeamChart = [Projectdata.Team1, Projectdata.Team2, Projectdata.Team3, Projectdata.Team4, Projectdata.Team5][idx % 5];
                            return (
                              <li key={cId}>
                                <Link href="/ats/candidates">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-start">
                                      {c.profilePicture?.url ? (
                                        <span className="avatar avatar-sm leading-none">
                                          <img src={c.profilePicture.url} alt="" className="rounded-md" />
                                        </span>
                                      ) : (
                                        <span className="avatar avatar-sm bg-primary/10 text-primary rounded-md leading-none flex items-center justify-center text-xs font-semibold">
                                          {getInitial(c.fullName)}
                                        </span>
                                      )}
                                      <div className="ms-4 leading-none">
                                        <span className="font-semibold">{c.fullName ?? "—"}</span>
                                        <span className="block text-[0.6875rem] text-[#8c9097] dark:text-white/50 mt-2">{c.email ?? ""}</span>
                                      </div>
                                    </div>
                                    <div id={`user${idx + 1}`}>
                                      <ReactApexChart options={TeamChart.options} series={TeamChart.series} type="line" height={20} width={80} />
                                    </div>
                                  </div>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
                <div className="xl:col-span-12 col-span-12">
                  <div className="box">
                    <div className="box-header justify-between">
                      <div className="box-title">Main Tasks</div>
                      <Link href="/task/my-tasks" className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50">Today <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i></Link>
                    </div>
                    <div className="box-body">
                      {loading ? (
                        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                      ) : displayMyTasks.length === 0 ? (
                        <p className="text-[#8c9097] dark:text-white/50 text-sm">No tasks assigned.</p>
                      ) : (
                        <ul className="list-none projects-maintask-card">
                          {displayMyTasks.map((t) => (
                            <li key={t._id ?? t.id}>
                              <div className="flex items-start">
                                <div className="flex items-start flex-grow">
                                  <span className="me-4">
                                    <input className="form-check-input" type="checkbox" aria-label="task" />
                                  </span>
                                  <div className="flex-grow">
                                    <span>{t.title}</span>
                                    {t.assignedTo && t.assignedTo.length > 0 && (
                                      <span className="block mt-1">
                                        <span className="avatar-list-stacked">
                                          {t.assignedTo.slice(0, 3).map((u) => (
                                            <span key={u._id ?? u.id ?? u.email} className="avatar avatar-xs avatar-rounded bg-primary/10 text-primary text-[0.65rem]">
                                              {getInitial(u.name ?? u.email)}
                                            </span>
                                          ))}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span className={getStatusBadgeClass(t.status)}>{TASK_STATUS_LABELS[t.status] ?? t.status}</span>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* RIGHT: Daily Tasks */}
            <div className="xxl:col-span-3 col-span-12">
              <div className="box">
                <div className="box-header justify-between">
                  <div className="box-title">Daily Tasks</div>
                  <Link href="/task/my-tasks" className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50">View All <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i></Link>
                </div>
                <div className="box-body">
                  {loading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : dailyTasks.length === 0 ? (
                    <p className="text-[#8c9097] dark:text-white/50 text-sm">No tasks due today.</p>
                  ) : (
                    <ul className="list-none daily-task-card my-2">
                      {dailyTasks.slice(0, 4).map((t, i) => {
                        const borderColors = ["border-primary/25", "border-warning/25", "border-success/25", "border-secondary/25"];
                        return (
                          <li key={t._id ?? t.id}>
                            <div className={`box border ${borderColors[i % 4]} shadow-none mb-0`}>
                              <div className="box-body">
                                <p className="text-[0.875rem] font-semibold mb-2 leading-none">{t.title}</p>
                                {t.tags && t.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-4">
                                    {t.tags.slice(0, 3).map((tag) => (
                                      <span key={tag} className="badge text-primary bg-primary/10">{tag}</span>
                                    ))}
                                  </div>
                                )}
                                {t.assignedTo && t.assignedTo.length > 0 && (
                                  <div className="avatar-list-stacked">
                                    {t.assignedTo.slice(0, 3).map((u) => (
                                      <span key={u._id ?? u.id ?? u.email} className="avatar avatar-sm avatar-rounded bg-primary/10 text-primary text-[0.65rem]">
                                        {getInitial(u.name ?? u.email)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* RIGHT COLUMN: Track CTA + Recent Jobs */}
        <div className="xxl:col-span-3 col-span-12">
          <div className="grid grid-cols-12 gap-x-6">
            <div className="xxl:col-span-12 col-span-12">
              <div className="box shadow-none projects-tracking-card overflow-hidden text-center">
                <div className="box-body">
                  <img src="/assets/images/media/media-86.svg" alt="" className="mb-1 inline-flex" />
                  <div>
                    <span className="text-[0.9375rem] font-semibold block mt-6 mb-4">Track your work progress here</span>
                    <Link href="/task/my-tasks" className="ti-btn !py-1 !px-2 bg-primary !text-[0.75rem] text-white ti-btn-wave">Track Here</Link>
                  </div>
                  <span className="shape-1 text-primary"><i className="ti ti-circle text-[1.25rem] font-bold"></i></span>
                  <span className="shape-2 text-secondary"><i className="ti ti-triangle text-[1.25rem] font-bold"></i></span>
                  <span className="shape-3 text-warning"><i className="ti ti-square text-[1.25rem] font-bold"></i></span>
                  <span className="shape-4 text-info"><i className="ti ti-square-rotated text-[1.25rem] font-bold"></i></span>
                  <span className="shape-5 text-success"><i className="ti ti-pentagon text-[1.25rem] font-bold"></i></span>
                  <span className="shape-6 text-danger"><i className="ti ti-star text-[1.25rem] font-bold"></i></span>
                </div>
              </div>
            </div>
            <div className="xxl:col-span-12 col-span-12">
              <div className="box">
                <div className="box-header justify-between">
                  <div className="box-title">Recent Jobs</div>
                  <Link href="/ats/jobs" className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50">View All <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i></Link>
                </div>
                <div className="box-body">
                  {loading ? (
                    <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : recentJobs.length === 0 ? (
                    <p className="text-[#8c9097] dark:text-white/50 text-sm">No jobs yet.</p>
                  ) : (
                    <ul className="list-none project-transactions-card">
                      {recentJobs.map((job) => {
                        const jobId = String(job._id ?? job.id ?? "");
                        const count = applicantCountByJob[jobId] ?? 0;
                        return (
                          <li key={jobId}>
                            <Link href={`/ats/jobs/${jobId}`}>
                              <div className="flex items-start">
                                <div className="me-3">
                                  <span className="avatar avatar-rounded font-bold avatar-md !text-primary bg-primary/10">{count}</span>
                                </div>
                                <div className="flex-grow min-w-0">
                                  <span className="block font-semibold truncate">{job.title}</span>
                                  <span className="block text-[#8c9097] dark:text-white/50 text-[0.6875rem]">
                                    {job.organisation?.name ?? "—"} &bull; {count} applicant{count !== 1 ? "s" : ""}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Summary - full width */}
      <div className="grid grid-cols-12 gap-x-6">
        <div className="xxl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-header justify-between flex-wrap gap-2">
              <div className="box-title">Projects Summary</div>
              <div className="flex flex-wrap items-center gap-2">
                <input className="ti-form-control form-control-sm !rounded-sm !w-auto min-w-[140px]" type="text" placeholder="Search Here" aria-label="Search" />
                <Link href="/project-management/projects" className="ti-btn ti-btn-primary !bg-primary !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium" aria-expanded="false">
                  Sort By <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                </Link>
                <Link href="/project-management/projects" className="px-2 font-normal text-[0.75rem] text-primary">View All</Link>
              </div>
            </div>
            <div className="box-body">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <p className="text-[#8c9097] dark:text-white/50 text-sm">
                  No projects yet.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover whitespace-nowrap table-bordered min-w-full">
                    <thead>
                      <tr>
                        <th scope="col" className="!text-start">
                          S.No
                        </th>
                        <th scope="col" className="!text-start">
                          Title
                        </th>
                        <th scope="col" className="!text-start">
                          Assigned To
                        </th>
                        <th scope="col" className="!text-start">
                          Tasks
                        </th>
                        <th scope="col" className="!text-start">
                          Progress
                        </th>
                        <th scope="col" className="!text-start">
                          Status
                        </th>
                        <th scope="col" className="!text-start">
                          Due Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p, i) => {
                        const total = p.totalTasks ?? 0;
                        const completed = p.completedTasks ?? 0;
                        const pct =
                          total > 0
                            ? Math.round((completed / total) * 100)
                            : 0;
                        return (
                          <tr
                            key={p._id}
                            className="border border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10"
                          >
                            <th scope="row" className="!text-start">
                              {i + 1}
                            </th>
                            <td>{p.name}</td>
                            <td>
                              {p.assignedTo && p.assignedTo.length > 0 ? (
                                <div className="avatar-list-stacked">
                                  {p.assignedTo.slice(0, 3).map((u) => (
                                    <span
                                      key={u._id}
                                      className="avatar avatar-xs avatar-rounded bg-primary/10 text-primary text-[0.65rem]"
                                    >
                                      {getInitial(u.name ?? u.email)}
                                    </span>
                                  ))}
                                  {p.assignedTo.length > 3 && (
                                    <span className="avatar avatar-xs bg-primary avatar-rounded text-white text-[0.65rem] font-normal">
                                      +{p.assignedTo.length - 3}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {completed}/{total}
                            </td>
                            <td>
                              <div className="flex items-center">
                                <div
                                  className="progress progress-animate progress-xs w-full"
                                  role="progressbar"
                                  aria-valuenow={pct}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  <div
                                    className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                                    style={{ width: `${pct}%` }}
                                  ></div>
                                </div>
                                <div className="ms-2">{pct}%</div>
                              </div>
                            </td>
                            <td>
                              <span className={getStatusBadgeClass(p.status)}>
                                {p.status}
                              </span>
                            </td>
                            <td>{formatDate(p.endDate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {projects.length > 0 && (
              <div className="box-footer">
                <div className="sm:flex items-center">
                  <div className="dark:text-defaulttextcolor/70">
                    Showing {Math.min(projects.length, 6)} Entries <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                  </div>
                  <div className="ms-auto">
                    <nav aria-label="Page navigation" className="pagination-style-4">
                      <ul className="ti-pagination mb-0">
                        <li className="page-item disabled">
                          <Link className="page-link" href="#!" scroll={false}>Prev</Link>
                        </li>
                        <li className="page-item"><Link className="page-link active" href="#!" scroll={false}>1</Link></li>
                        <li className="page-item"><Link className="page-link" href="#!" scroll={false}>2</Link></li>
                        <li className="page-item">
                          <Link className="page-link !text-primary" href="#!" scroll={false}>Next</Link>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
}
