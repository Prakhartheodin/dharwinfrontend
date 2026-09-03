"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  getAtsAnalytics,
  type AtsAnalyticsResponse,
  type StatusCount,
} from "@/shared/lib/api/atsAnalytics";
import {
  getTaskId,
  listTasks,
  updateTaskStatus,
  type Task,
  type TaskStatus,
  TASK_STATUS_LABELS,
} from "@/shared/lib/api/tasks";
import { listJobs, type Job } from "@/shared/lib/api/jobs";
import { listJobApplications, type JobApplication, type JobApplicationStatus } from "@/shared/lib/api/jobApplications";
import { listProjects, type Project } from "@/shared/lib/api/projects";
import { getAllHolidays } from "@/shared/lib/api/holidays";
import {
  holidayScopeFor,
  localYmd,
  todayHolidayFrom,
  upcomingCompanyHolidays,
} from "@/shared/lib/dashboard/holidaySource";
import {
  PROJECT_SUMMARY_PAGE_SIZE,
  filterAndSortProjects,
  paginateProjectSummary,
  getProjectSummaryPagination,
  type ProjectSummarySort,
} from "@/shared/lib/dashboard/projectSummary";
import {
  getMyStudentForAttendance,
  getPunchInOutStatus,
  getPunchInOutStatusMe,
  punchInAttendance,
  punchOutAttendance,
  punchInAttendanceMe,
  punchOutAttendanceMe,
  getMyUpcomingHolidays,
  getEmployeesOnLeaveToday,
  type PunchStatusResponse,
  type AssignedHolidayItem,
  type OnLeaveTodayItem,
  type OnLeaveScope,
} from "@/shared/lib/api/attendance";
import { listMeetings } from "@/shared/lib/api/meetings";
import { listInternalMeetings } from "@/shared/lib/api/internal-meetings";
import TodayEventsCard, {
  type EventSourceError,
} from "./_components/TodayEventsCard";
import {
  TODAY_EVENTS_FETCH_LIMIT,
  filterToViewerToday,
  mergeEvents,
  normalizeInternalMeeting,
  normalizeInterview,
  viewerDayWindow,
  type DashboardEvent,
} from "@/shared/lib/dashboard/todayEvents";
import {
  DASHBOARD_TASKS_LIMIT,
  dashboardTaskQuery,
  daysOverdue,
  dueBucket,
  openOnly,
  sortByDueDate,
} from "@/shared/lib/dashboard/dashboardTasks";
/* Only the unread badge is rendered here; the notification LIST was fetched every load
   and every window focus without ever being displayed. */
import { getUnreadCount } from "@/shared/lib/api/notifications";
import {
  formatBadgeCount,
  formatNotificationBellAriaLabel,
  getBadgeColorClasses,
  getBadgeSizeClasses,
} from "@/shared/lib/format-badge-count";
import {
  ATTENDANCE_PERMISSION_PREFIX,
  hasPermissionForPath,
} from "@/shared/lib/route-permissions";
import { hasSalesAgentRole } from "@/shared/lib/roles";
import { hasStaffAccess } from "@/shared/lib/persona";
import SalesAgentDashboard from "./_components/SalesAgentDashboard";
import CandidateDashboard from "./_components/CandidateDashboard";
import EmployeeDashboard from "./_components/EmployeeDashboard";
import UpcomingHolidaysCard from "./_components/UpcomingHolidaysCard";
import OnLeaveTodayCard from "./_components/OnLeaveTodayCard";
import { usePageCapabilities } from "@/shared/hooks/use-page-capabilities";
import { useModalBehavior } from "@/shared/hooks/useModalBehavior";
import type { ApexOptions } from "apexcharts";

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

/* isToday() lived here. It ORed a raw UTC prefix compare (dateStr.slice(0,10)) against
   a local date key, so a task due 20:00Z counted as "today" for an IST viewer whose
   local clock already said tomorrow. Day bucketing now goes through localDateKey /
   wallClockDateKey, and the task window is decided server-side.
   isFuture() went with the unrendered meetings list it filtered. */

function stripHtml(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? "").replace(/\s+/g, " ").trim();
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

const PROJECT_SUMMARY_SORT_OPTIONS: {
  value: ProjectSummarySort;
  label: string;
  icon: string;
}[] = [
  { value: "name-asc", label: "Title (A–Z)", icon: "ri-sort-asc" },
  { value: "name-desc", label: "Title (Z–A)", icon: "ri-sort-desc" },
  { value: "dueDate-asc", label: "Due Date (Soonest)", icon: "ri-calendar-line" },
  { value: "dueDate-desc", label: "Due Date (Latest)", icon: "ri-calendar-line" },
  { value: "progress-desc", label: "Progress (High to Low)", icon: "ri-bar-chart-line" },
  { value: "progress-asc", label: "Progress (Low to High)", icon: "ri-bar-chart-line" },
  { value: "status-asc", label: "Status (A–Z)", icon: "ri-flag-line" },
  { value: "tasks-desc", label: "Tasks (Most)", icon: "ri-task-line" },
];

function projectProgressPct(p: Project): number {
  const total = p.totalTasks ?? 0;
  const completed = p.completedTasks ?? 0;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function getInitial(name: string | undefined | null): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatRelativeTime(s: string | undefined | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

/** Sorts JobApplications by most-recent activity (updatedAt → createdAt fallback) and returns top N.
    Used by the dashboard Candidate List widget so we always show fresh ATS pipeline entries. */
function getApplicationJobTitle(app: JobApplication): string {
  const j = app.job;
  if (j && typeof j === "object" && j.title) return j.title;
  return "Open role";
}

function getApplicationStatusStyles(status: JobApplicationStatus): string {
  switch (status) {
    case "Applied":
      return "bg-primary/10 text-primary";
    case "Screening":
      return "bg-warning/10 text-warning";
    case "Interview":
      return "bg-info/10 text-info";
    case "Offered":
      return "bg-secondary/10 text-secondary";
    case "Hired":
      return "bg-success/10 text-success";
    case "Rejected":
      return "bg-danger/10 text-danger";
    default:
      return "bg-light text-[#8c9097] dark:bg-white/10 dark:text-white/60";
  }
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

/* TASK_STATUS_ORDER / TASK_STATUS_COLORS lived here to feed a task-status donut chart
   that the dashboard stopped rendering. TASK_STATUS_META in
   shared/lib/dashboard/employeeDashboard.ts is now the only copy of that palette. */

const DASHBOARD_RECENT_JOBS_DISPLAY_LIMIT = 6;

/* Row-2 stack card that should absorb the leftover height of its cell. Applied from
   the wrapper so the shared card components stay untouched. */
const FILL_CARD =
  "flex-1 min-h-0 [&>.box]:h-full [&>.box>.box-body]:flex-1 [&>.box>.box-body]:min-h-0 [&>.box>.box-body]:overflow-y-auto";

/* `summary` is the chart's text equivalent. ApexCharts renders an SVG with no
   accessible name, so a screen reader otherwise reaches an unlabelled graphic and the
   numbers are unreachable. role="img" + aria-label collapses it to one readable
   sentence carrying the same counts the bars encode. */
function FunnelChartFill({
  options,
  series,
  summary,
}: {
  options: ApexOptions;
  series: ApexAxisChartSeries;
  summary: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(272);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const h = Math.floor(el.getBoundingClientRect().height);
      if (h > 80) setChartHeight((prev) => (prev !== h ? h : prev));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={summary}
      className="relative w-full flex-1 min-h-[15rem]"
    >
      {/* No aria-hidden here: role="img" above is already a leaf role, so the SVG's
          internals are not exposed.
          No overflow-hidden either. ApexCharts appends its tooltip inside the chart
          container and positions it above the hovered bar, so clipping this box cut the
          tooltip's header off for the topmost bar. The chart is sized to this container
          by the ResizeObserver, so there is nothing else here that needs clipping — and
          the parent .box still clips at the card edge. */}
      <div className="absolute inset-0">
        <ReactApexChart
          options={options}
          series={series}
          type="bar"
          height={chartHeight}
          width="100%"
        />
      </div>
    </div>
  );
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
        fontFamily: "Poppins, Arial, sans-serif",
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
          distributed: true,
          barHeight: "88%",
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
      grid: {
        /* No `left` here on purpose. ApexCharts' default left padding (12px) is the
           gutter the y-axis category column is measured into; forcing it to 0 drew the
           widest label ("Screening") ~5px left of the SVG origin, and .apexcharts-svg
           is overflow:hidden, so its first glyph was clipped off. Apex widens the
           column on its own for longer stage names, so no yaxis width config is needed. */
        padding: { top: 0, right: 8, bottom: 0 },
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

/**
 * Rows fetched for the Candidate List panel.
 *
 * Was 10_000 — the whole application history was pulled on every load and every window
 * focus to render five rows, count applicants per job in JS, and read a total the
 * response already carries. Past the cap the counts were silently wrong, not just slow.
 * The three needs are now three bounded queries: this list, a `limit:1` total, and one
 * `limit:1` count per displayed job.
 */
const DASHBOARD_CANDIDATE_LIST_LIMIT = 5;

/**
 * Short, user-facing reason a widget's request failed.
 *
 * Enough to tell "you lack access" from "the server broke" without echoing a response
 * body — an error string is rendered on screen, so it must never carry payload data.
 */
function describeRequestError(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403) return "no access";
  if (typeof status === "number") return `HTTP ${status}`;
  return "network error";
}

/**
 * Rows backing the Projects Summary table.
 *
 * The panel searches, sorts and paginates client-side over this window, so it is a hard
 * ceiling on what the panel can ever show: past it, rows are silently absent from search
 * results rather than merely on a later page. 200 is the endpoint's own maximum. The
 * upgrade path when project counts approach it is server-side search/sort/paginate on
 * /projects, matching what the Projects page already does.
 */
const PROJECT_SUMMARY_FETCH_LIMIT = 200;

/* ------------------------------------------------------------------ */
/*  Modals                                                             */
/* ------------------------------------------------------------------ */

/**
 * Shared chrome for the two dashboard dialogs.
 *
 * Both used to be inline JSX with a bare backdrop onClick: no ESC, no focus trap, no
 * focus restore to the trigger, and no background scroll lock, so a keyboard user who
 * opened one could tab straight out behind it and had no way to close it. `useModalBehavior`
 * is the hook the ATS, Organization and Upcoming-Holidays dialogs already use; it is
 * called here rather than in the page body because the dialogs render conditionally and
 * a hook cannot.
 */
function DashboardModal({
  titleId,
  title,
  onClose,
  children,
  footer,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { containerRef, backdropProps, requestClose } = useModalBehavior({
    isOpen: true,
    onClose,
  });
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      {...backdropProps}
    >
      <div
        ref={containerRef}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-bodybg"
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-2 border-b border-gray-200 p-4 dark:border-white/10">
          {/* h2: the page h1 is the greeting, and a dialog title one level under it keeps
              the outline flat rather than jumping to h3. */}
          <h2
            id={titleId}
            className="min-w-0 flex-1 truncate self-center text-lg font-semibold text-gray-900 dark:text-white"
            title={title}
          >
            {title}
          </h2>
          {/* Was a 14px "×" text glyph with no real hit area. */}
          <button
            type="button"
            className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-white/70 dark:hover:bg-white/10"
            onClick={requestClose}
            aria-label="Close"
          >
            <i className="ti ti-x text-[1.125rem]" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="flex-shrink-0 border-t border-gray-200 p-4 dark:border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function JobDetailModal({
  job,
  applicantCount,
  onClose,
}: {
  job: Job;
  applicantCount: number;
  onClose: () => void;
}) {
  const jobId = String(job._id ?? job.id ?? "");
  const createdByName =
    typeof job.createdBy === "object" && job.createdBy !== null
      ? (job.createdBy as { name?: string }).name
      : null;
  return (
    <DashboardModal
      titleId="dashboard-job-detail-title"
      title={job.title ?? "—"}
      onClose={onClose}
      footer={
        <Link
          href={`/ats/jobs?view=${jobId}`}
          className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[0.8125rem] font-medium text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          onClick={onClose}
        >
          <i className="ri-external-link-line text-[1rem]" aria-hidden /> View full job
        </Link>
      }
    >
      <div className="space-y-3 text-sm">
        {job.organisation?.name && (
          <div>
            <span className="block text-xs font-medium text-[#8c9097] dark:text-white/50">Organisation</span>
            <span className="text-gray-900 dark:text-white">{job.organisation.name}</span>
            {job.organisation.website && (
              /* The one genuinely external destination on this page — stays target=_blank. */
              <a
                href={job.organisation.website.startsWith("http") ? job.organisation.website : `https://${job.organisation.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-primary hover:underline"
              >
                {job.organisation.website}
              </a>
            )}
            {job.organisation.email && (
              <span className="block text-[#8c9097] dark:text-white/50">{job.organisation.email}</span>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {job.status && (
            <span className={`badge ${(job.status ?? "").toLowerCase() === "active" ? "bg-success/10 text-success" : "bg-secondary/10 text-secondary"}`}>
              {job.status}
            </span>
          )}
          {job.jobType && <span className="badge bg-primary/10 text-primary">{job.jobType}</span>}
          <span className="badge bg-info/10 text-info">
            {applicantCount} applicant{applicantCount !== 1 ? "s" : ""}
          </span>
        </div>
        {job.location && (
          <div>
            <span className="block text-xs font-medium text-[#8c9097] dark:text-white/50">Location</span>
            <span className="text-gray-900 dark:text-white">{job.location}</span>
          </div>
        )}
        {job.experienceLevel && (
          <div>
            <span className="block text-xs font-medium text-[#8c9097] dark:text-white/50">Experience</span>
            <span className="text-gray-900 dark:text-white">{job.experienceLevel}</span>
          </div>
        )}
        {job.jobDescription && (
          <div>
            <span className="block text-xs font-medium text-[#8c9097] dark:text-white/50">Description</span>
            <p className="line-clamp-4 text-gray-900 dark:text-white">{stripHtml(job.jobDescription)}</p>
          </div>
        )}
        {createdByName && (
          <div>
            <span className="block text-xs font-medium text-[#8c9097] dark:text-white/50">Created by</span>
            <span className="text-gray-900 dark:text-white">{createdByName}</span>
          </div>
        )}
      </div>
    </DashboardModal>
  );
}

function ApplicantsModal({
  jobTitle,
  applicants,
  loading,
  onClose,
}: {
  jobTitle: string;
  applicants: JobApplication[] | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <DashboardModal
      titleId="dashboard-applicants-title"
      title={`Applicants – ${jobTitle}`}
      onClose={onClose}
    >
      {loading ? (
        /* Was the word "Loading…". Skeleton rows keep the panel's shape so it does not
           read as a broken, nearly-empty dialog. */
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-black/5 dark:bg-white/10" />
          ))}
        </div>
      ) : applicants === null ? null : applicants.length === 0 ? (
        <p className="text-sm text-[#8c9097] dark:text-white/50">No applicants yet.</p>
      ) : (
        <ul className="list-none space-y-3">
          {applicants.map((app) => {
            const c = app.candidate;
            const name = (c?.fullName ?? c?.email ?? "—").trim() || "—";
            const email = c?.email ?? "";
            return (
              <li key={app._id} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-white/5">
                <span className="avatar avatar-sm avatar-rounded flex flex-shrink-0 items-center justify-center bg-primary/10 text-xs font-semibold text-primary">
                  {name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-gray-900 dark:text-white">{name}</span>
                  {email && (
                    <span className="block truncate text-[0.6875rem] text-[#8c9097] dark:text-white/50">{email}</span>
                  )}
                  {app.status && (
                    <span className="badge mt-1 inline-block bg-primary/10 text-[0.75rem] text-primary">{app.status}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardModal>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const unauthorized = searchParams.get("unauthorized") === "1";
  const { user, permissions, permissionsLoaded, isAdministrator, isPlatformSuperUser, roleNames } = useAuth();

  /* Sales agents get a stripped-down dashboard focused on referrals only.
     Gate excludes admins / platform super users so they keep the full org view. */
  const isSalesAgentOnly =
    permissionsLoaded &&
    !isAdministrator &&
    !isPlatformSuperUser &&
    hasSalesAgentRole(roleNames);

  const { dashboardType, isLoading: capabilitiesLoading } = usePageCapabilities();

  /* ---- State ---- */
  const [atsData, setAtsData] = useState<AtsAnalyticsResponse | null>(null);
  /** Recent ATS pipeline applicants (NOT employees). Derived from `/job-applications` so the widget shows
      true candidate records — applied, screening, interview, offered, hired, rejected — instead of
      onboarded staff that would appear if we pulled `/employees`. */
  const [recentApplications, setRecentApplications] = useState<JobApplication[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [selectedJobDetail, setSelectedJobDetail] = useState<Job | null>(null);
  const [applicantsModal, setApplicantsModal] = useState<{ jobId: string; jobTitle: string } | null>(null);
  const [applicantsList, setApplicantsList] = useState<JobApplication[] | null>(null);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantCountByJob, setApplicantCountByJob] = useState<
    Record<string, number>
  >({});
  /** From GET /job-applications `totalResults` — aligns Applications stat with list modal (analytics total can differ). */
  const [applicationsListingTotal, setApplicationsListingTotal] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSearch, setProjectSearch] = useState<string>("");
  const [projectPage, setProjectPage] = useState(1);
  const [projectSort, setProjectSort] = useState<ProjectSummarySort>("dueDate-asc");
  const [projectSortMenuOpen, setProjectSortMenuOpen] = useState(false);
  const projectSortRef = useRef<HTMLDivElement>(null);
  /* Phone-only accordion for the Projects Summary card list. One open row at a time —
     the panel it controls is md:hidden, so this never affects tablet or desktop. */
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  /* Today's events own their state and their own effect: one source failing must leave
     the other rendered, and a slow endpoint must not hold up the rest of the page. */
  const [todayEvents, setTodayEvents] = useState<DashboardEvent[]>([]);
  const [todayEventsTotal, setTodayEventsTotal] = useState(0);
  const [todayEventsLoading, setTodayEventsLoading] = useState(true);
  const [todayEventErrors, setTodayEventErrors] = useState<EventSourceError[]>([]);

  const [attendanceStudent, setAttendanceStudent] = useState<{
    id: string;
    type?: "user" | "student";
    user: { id: string; name: string; email: string };
  } | null>(null);
  const [punchStatus, setPunchStatus] = useState<PunchStatusResponse | null>(
    null
  );
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchError, setPunchError] = useState<string | null>(null);
  const [upcomingHolidays, setUpcomingHolidays] = useState<AssignedHolidayItem[]>([]);
  const [todayIsHoliday, setTodayIsHoliday] = useState(false);
  const [todayHolidayTitle, setTodayHolidayTitle] = useState<string | null>(null);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  const [onLeaveToday, setOnLeaveToday] = useState<OnLeaveTodayItem[]>([]);
  const [onLeaveScope, setOnLeaveScope] = useState<OnLeaveScope>("self");
  const [onLeaveLoading, setOnLeaveLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  /**
   * Per-panel load failures, short reason or null.
   *
   * Every panel here is fed by one branch of a Promise.allSettled, so a failure is
   * already isolated to its own panel — but a rejected branch used to land in the same
   * empty array as a genuinely empty result, and the panel then said "No jobs yet."
   * for an outage. Keyed per panel so one failure never blanks the others, and so the
   * empty state can tell "nothing here" from "could not load".
   *
   * A panel the viewer has no permission for is NOT an error: those branches resolve
   * with an empty result and stay null, so the honest empty state is what shows.
   */
  const [loadErrors, setLoadErrors] = useState<{
    analytics: string | null;
    jobs: string | null;
    candidates: string | null;
    projects: string | null;
    tasks: string | null;
  }>({ analytics: null, jobs: null, candidates: null, projects: null, tasks: null });

  /* Show punch in/out in welcome header for non-admin users who have attendance permission (candidate, student, agent, etc.) */
  const showAttendancePunch =
    !isAdministrator &&
    permissionsLoaded &&
    hasPermissionForPath(permissions ?? [], ATTENDANCE_PERMISSION_PREFIX) &&
    attendanceStudent != null;

  // Plain employees can't manage holidays — hide the "Manage" link for them.
  const canManageHolidays = hasStaffAccess({
    isAdministrator,
    isPlatformSuperUser,
    permissions: permissions ?? [],
    roleNames,
  });

  /* Holiday managers get the company catalogue, everyone else their own assignments.
     Same helper that gates the "Manage" link, so no new permission is introduced. */
  const holidayScope = holidayScopeFor(canManageHolidays);

  /* Holiday managers always see the card, empty state included: they are the people who
     would go and create the missing holidays, and hiding it would collapse the away
     column. Everyone else sees it only when they actually have holidays assigned, so a
     plain employee never gets a permanently empty box. Punch in/out above stays
     non-admin; that is a separate rule and is unchanged. */
  const showUpcomingHolidays =
    canManageHolidays || upcomingHolidays.length > 0 || todayIsHoliday;

  const punchBlockedByHoliday = todayIsHoliday;

  /* Only fetch ATS data (jobs, applications, analytics, candidates) when user has permission to avoid 403 for non-ATS roles */
  const hasAtsJobsAccess =
    permissionsLoaded &&
    (hasPermissionForPath(permissions ?? [], "ats.jobs:") || hasPermissionForPath(permissions ?? [], "ats.analytics:"));
  /* Roles without these permissions otherwise get 403 spam from the dashboard
     panels they will never see. The dashboard projects panel hits
     `/v1/projects` (no `mine=true`), which the backend gates with
     `project.projects:`; `project.my-projects:` only grants `?mine=true`
     access, so it does not satisfy this call. */
  const hasProjectsAccess =
    permissionsLoaded && hasPermissionForPath(permissions ?? [], "project.projects:");
  /* ATS interviews live at GET /meetings, which the backend gates on `interviews.read`
     — derived from `ats.interviews:`, NOT from `communication.meetings:`. This used to
     check the Communication permission, so a recruiter with interviews but no
     Communication access fetched nothing, while a Communication-only user fired a call
     that could only 403. The two event sources are gated independently: neither
     source's permission may suppress the other. */
  const hasInterviewsAccess =
    permissionsLoaded && hasPermissionForPath(permissions ?? [], "ats.interviews:");
  /* GET /internal-meetings is auth()-only by design — internalMeetingScope returns
     own/hosted/invited rows for anyone, so employees see their Communication invites
     without holding communication.meetings. No client-side gate; the server scopes it. */

  /* ---- Data fetching ---- */
  const fetchDashboard = useCallback(async () => {
    /* Wait for permissions to resolve before firing any role-gated fetches.
       Without this, the first render fires unconditional calls (projects,
       meetings, training analytics, tasks) before permissionsLoaded flips true,
       triggering 403s for non-admin roles like sales_agent. */
    if (!permissionsLoaded || isSalesAgentOnly) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const emptyApplications = {
      results: [] as JobApplication[],
      page: 1,
      limit: 0,
      totalPages: 0,
      totalResults: 0,
    };

    const [
      atsRes,
      tasksRes,
      jobsRes,
      applicationsRes,
      applicationsTotalRes,
      projectsRes,
      unreadRes,
      studentRes,
    ] = await Promise.allSettled([
      hasAtsJobsAccess ? getAtsAnalytics() : Promise.resolve(null as AtsAnalyticsResponse | null),
      /* Open, dated, assigned-to-me tasks, ordered and limited by the SERVER. Was
         limit:50 unsorted, then sliced in JS — which made "the first 6" mean whatever
         Mongo happened to return. */
      listTasks(dashboardTaskQuery()),
      hasAtsJobsAccess
        ? listJobs({ limit: 8, sortBy: "createdAt:desc,_id:desc", status: "Active" })
        : Promise.resolve({ results: [] as Job[] }),
      /* Candidate List: five rows, sorted server-side. */
      hasAtsJobsAccess
        ? listJobApplications({
            limit: DASHBOARD_CANDIDATE_LIST_LIMIT,
            sortBy: "updatedAt:desc,_id:desc",
            activeJobsOnly: true,
          })
        : Promise.resolve(emptyApplications),
      /* Applications stat: only the count. countDocuments runs either way, so asking
         for one row instead of ten thousand costs the server nothing and the browser
         everything it was previously paying. */
      hasAtsJobsAccess
        ? listJobApplications({ limit: 1, activeJobsOnly: true })
        : Promise.resolve(emptyApplications),
      hasProjectsAccess
        ? listProjects({ limit: PROJECT_SUMMARY_FETCH_LIMIT })
        : Promise.resolve({ results: [] as Project[] }),
      getUnreadCount(),
      getMyStudentForAttendance(),
    ]);

    if (atsRes.status === "fulfilled") setAtsData(atsRes.value);
    if (tasksRes.status === "fulfilled")
      setMyTasks(tasksRes.value.results ?? []);
    if (jobsRes.status === "fulfilled")
      setRecentJobs(Array.isArray(jobsRes.value?.results) ? jobsRes.value.results : []);

    /* The server already sorted and limited this to the rows shown; no client sort. */
    if (applicationsRes.status === "fulfilled") {
      setRecentApplications(applicationsRes.value.results ?? []);
    } else {
      setRecentApplications([]);
    }

    if (applicationsTotalRes.status === "fulfilled") {
      const total = applicationsTotalRes.value.totalResults;
      setApplicationsListingTotal(typeof total === "number" ? total : null);
    } else {
      setApplicationsListingTotal(null);
    }

    if (projectsRes.status === "fulfilled")
      setProjects(projectsRes.value.results ?? []);
    if (unreadRes.status === "fulfilled") setUnreadCount(unreadRes.value);

    setLoadErrors({
      analytics: atsRes.status === "rejected" ? describeRequestError(atsRes.reason) : null,
      jobs: jobsRes.status === "rejected" ? describeRequestError(jobsRes.reason) : null,
      candidates:
        applicationsRes.status === "rejected"
          ? describeRequestError(applicationsRes.reason)
          : null,
      projects: projectsRes.status === "rejected" ? describeRequestError(projectsRes.reason) : null,
      tasks: tasksRes.status === "rejected" ? describeRequestError(tasksRes.reason) : null,
    });

    if (studentRes.status === "fulfilled" && studentRes.value) {
      const identity = studentRes.value as { id: string; type?: "user" | "student"; user: { id: string; name: string; email: string } };
      setAttendanceStudent(identity);
      try {
        const status =
          identity.type === "user"
            ? await getPunchInOutStatusMe()
            : await getPunchInOutStatus(identity.id);
        setPunchStatus(status);
      } catch {
        /* silent */
      }
    }

    setLoading(false);
  }, [
    hasAtsJobsAccess,
    hasProjectsAccess,
    isSalesAgentOnly,
    permissionsLoaded,
  ]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /* Upcoming holidays, from whichever of the two existing endpoints fits the viewer.
     Managers read the company catalogue (/holidays); everyone else reads their own
     assignments (/training/attendance/me/upcoming-holidays), which is a "me" endpoint
     and so needs no client-side role or permission filtering.

     This used to be nested inside the attendance-identity branch, which meant anyone
     without a student/user attendance record — most admins — never fetched at all.
     A failure on either branch lands in the catch and leaves the list empty. */
  useEffect(() => {
    if (!permissionsLoaded) return;
    let active = true;
    const tz =
      typeof Intl !== "undefined" && Intl.DateTimeFormat?.().resolvedOptions?.().timeZone
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC";
    setHolidaysLoading(true);
    const now = new Date();
    /* Company branch is reachable only when canManageHolidays is true, so the global
       catalogue is never requested for someone who may not see it. Both branches
       resolve to the same shape the card already consumes. */
    const request =
      holidayScope === "company"
        ? getAllHolidays({
            startDate: localYmd(now),
            isActive: true,
            sortBy: "date:asc",
            limit: 20,
          }).then((res) => {
            const upcoming = upcomingCompanyHolidays(res.data?.results ?? [], now);
            const today = todayHolidayFrom(upcoming, now);
            return {
              upcoming,
              todayIsHoliday: today != null,
              todayHolidayTitle: today?.title ?? null,
            };
          })
        : getMyUpcomingHolidays({ limit: 20, timezone: tz });

    request
      .then((holidayData) => {
        if (!active) return;
        setUpcomingHolidays(holidayData.upcoming ?? []);
        setTodayIsHoliday(Boolean(holidayData.todayIsHoliday));
        setTodayHolidayTitle(holidayData.todayHolidayTitle ?? null);
      })
      .catch(() => {
        if (!active) return;
        setUpcomingHolidays([]);
        setTodayIsHoliday(false);
        setTodayHolidayTitle(null);
      })
      .finally(() => {
        if (active) setHolidaysLoading(false);
      });
    return () => {
      active = false;
    };
  }, [permissionsLoaded, holidayScope]);

  /* Employees on leave today — server scopes by permission (all / referrals / self) */
  useEffect(() => {
    if (!permissionsLoaded) return;
    let active = true;
    setOnLeaveLoading(true);
    getEmployeesOnLeaveToday()
      .then((res) => {
        if (!active) return;
        setOnLeaveToday(res.results);
        setOnLeaveScope(res.scope);
      })
      .catch(() => active && setOnLeaveToday([]))
      .finally(() => {
        if (active) setOnLeaveLoading(false);
      });
    return () => {
      active = false;
    };
  }, [permissionsLoaded]);

  /**
   * Applicant count per displayed job.
   *
   * One indexed countDocuments per visible job (`JobApplication.job` is indexed), reading
   * only `totalResults`. This used to be derived by tallying the entire application
   * collection in the browser, which meant the number went quietly wrong once the
   * collection outgrew the fetch cap. Bounded by how many jobs are on screen, not by how
   * many applications exist.
   */
  useEffect(() => {
    if (!hasAtsJobsAccess || recentJobs.length === 0) return;
    let active = true;
    const jobIds = recentJobs
      .slice(0, DASHBOARD_RECENT_JOBS_DISPLAY_LIMIT)
      .map((j) => String(j._id ?? j.id ?? ""))
      .filter(Boolean);
    if (jobIds.length === 0) return;

    Promise.allSettled(
      jobIds.map((jobId) =>
        listJobApplications({ jobId, limit: 1 }).then((res) => ({
          jobId,
          count: typeof res.totalResults === "number" ? res.totalResults : 0,
        }))
      )
    ).then((settled) => {
      if (!active) return;
      const map: Record<string, number> = {};
      for (const r of settled) {
        if (r.status === "fulfilled") map[r.value.jobId] = r.value.count;
      }
      /* Merge, so a single failed count leaves the previous value rather than a zero
         that would read as "no applicants". */
      setApplicantCountByJob((prev) => ({ ...prev, ...map }));
    });

    return () => {
      active = false;
    };
  }, [hasAtsJobsAccess, recentJobs]);

  /**
   * Today's interviews and meetings.
   *
   * Two independent sources, two permission models, one Promise.allSettled so either can
   * fail alone. The day window is resolved from the VIEWER's local calendar day and sent
   * as UTC instants, so the server does the filtering and the response is bounded by time
   * rather than by row count.
   *
   * Each source is asked for TODAY_EVENTS_FETCH_LIMIT rows, chronologically. Because both
   * arrive sorted, the first k of their merge is globally correct for any
   * k <= that limit — and the display cap is well under it, so the rows shown really are
   * the earliest of the day across both sources.
   */
  const loadTodayEvents = useCallback(async () => {
    if (!permissionsLoaded || isSalesAgentOnly) return;
    const now = new Date();
    const { dateFrom, dateTo } = viewerDayWindow(now);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const dayQuery = {
      dateFrom,
      dateTo,
      status: "scheduled",
      sortBy: "scheduledAt:asc,_id:asc",
      limit: TODAY_EVENTS_FETCH_LIMIT,
    };

    setTodayEventsLoading(true);

    const [interviewsRes, meetingsRes] = await Promise.allSettled([
      /* Gated: GET /meetings requires interviews.read, so without it we do not ask.
         Not asking is different from asking and hiding — no unauthorized row is ever
         sent to the client for the client to filter. */
      hasInterviewsAccess
        ? listMeetings(dayQuery)
        : Promise.resolve({ results: [], totalResults: 0 } as { results: never[]; totalResults: number }),
      /* Ungated: auth() only; internalMeetingScope returns own/hosted/invited rows. */
      listInternalMeetings(dayQuery),
    ]);

    const errors: EventSourceError[] = [];
    let total = 0;

    let interviews: DashboardEvent[] = [];
    if (interviewsRes.status === "fulfilled") {
      interviews = (interviewsRes.value.results ?? [])
        .map((m) => normalizeInterview(m, origin))
        .filter((e): e is DashboardEvent => e !== null);
      total += interviewsRes.value.totalResults ?? interviews.length;
    } else if (hasInterviewsAccess) {
      errors.push({ source: "interview", message: describeRequestError(interviewsRes.reason) });
    }

    let meetings: DashboardEvent[] = [];
    if (meetingsRes.status === "fulfilled") {
      meetings = (meetingsRes.value.results ?? [])
        .map((m) => normalizeInternalMeeting(m, origin))
        .filter((e): e is DashboardEvent => e !== null);
      total += meetingsRes.value.totalResults ?? meetings.length;
    } else {
      errors.push({ source: "meeting", message: describeRequestError(meetingsRes.reason) });
    }

    /* Second line of defence behind the server window: drops anything the UTC bounds
       rounded onto a neighbouring local day. */
    const merged = filterToViewerToday(mergeEvents(interviews, meetings), now);

    setTodayEvents(merged);
    setTodayEventsTotal(Math.max(total, merged.length));
    setTodayEventErrors(errors);
    setTodayEventsLoading(false);
  }, [permissionsLoaded, isSalesAgentOnly, hasInterviewsAccess]);

  useEffect(() => {
    void loadTodayEvents();
  }, [loadTodayEvents]);

  /**
   * Task completion.
   *
   * Optimistic, with a per-task sequence guard: a fast check/uncheck/check settles on the
   * last click rather than the last response to arrive, and a response for a superseded
   * click is discarded instead of repainting a stale status. The server stays
   * authoritative — a failure reloads rather than guessing.
   */
  const taskMutationSeq = useRef<Map<string, number>>(new Map());

  const handleTaskToggle = useCallback(
    async (task: Task) => {
      const id = getTaskId(task);
      if (!id) return;
      const next: TaskStatus = task.status === "completed" ? "todo" : "completed";
      const seq = (taskMutationSeq.current.get(id) ?? 0) + 1;
      taskMutationSeq.current.set(id, seq);

      setMyTasks((prev) => prev.map((t) => (getTaskId(t) === id ? { ...t, status: next } : t)));

      try {
        const saved = await updateTaskStatus(id, next);
        if (taskMutationSeq.current.get(id) !== seq) return; // superseded by a later click
        setMyTasks((prev) =>
          prev.map((t) => (getTaskId(t) === id ? { ...t, status: saved.status ?? next } : t))
        );
      } catch {
        if (taskMutationSeq.current.get(id) !== seq) return;
        try {
          const fresh = await listTasks(dashboardTaskQuery());
          setMyTasks(fresh.results ?? []);
        } catch {
          /* Reload failed too — revert just this row so the UI stops claiming success. */
          setMyTasks((prev) =>
            prev.map((t) => (getTaskId(t) === id ? { ...t, status: task.status } : t))
          );
        }
      }
    },
    []
  );

  /* Fetch applicants when applicants modal is opened */
  useEffect(() => {
    if (!applicantsModal) {
      setApplicantsList(null);
      return;
    }
    let cancelled = false;
    setApplicantsLoading(true);
    listJobApplications({ jobId: applicantsModal.jobId, limit: 100 })
      .then((res) => {
        if (!cancelled) setApplicantsList(res.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setApplicantsList([]);
      })
      .finally(() => {
        if (!cancelled) setApplicantsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicantsModal]);

  /* Refetch Recent Jobs when user returns to the tab (only if user has ATS access) */
  useEffect(() => {
    if (!hasAtsJobsAccess || isSalesAgentOnly) return;
    const onFocus = async () => {
      try {
        const [jobsRes, applicationsRes, totalRes] = await Promise.allSettled([
          listJobs({ limit: 8, sortBy: "createdAt:desc,_id:desc", status: "Active" }),
          listJobApplications({
            limit: DASHBOARD_CANDIDATE_LIST_LIMIT,
            sortBy: "updatedAt:desc,_id:desc",
            activeJobsOnly: true,
          }),
          listJobApplications({ limit: 1, activeJobsOnly: true }),
        ]);
        if (jobsRes.status === "fulfilled")
          setRecentJobs(Array.isArray(jobsRes.value?.results) ? jobsRes.value.results : []);
        if (applicationsRes.status === "fulfilled")
          setRecentApplications(applicationsRes.value.results ?? []);
        if (totalRes.status === "fulfilled" && typeof totalRes.value.totalResults === "number") {
          setApplicationsListingTotal(totalRes.value.totalResults);
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [hasAtsJobsAccess, isSalesAgentOnly]);

  /* ---- Punch in/out handler ---- */
  const handlePunch = async () => {
    if (!attendanceStudent) return;
    if (punchBlockedByHoliday) {
      setPunchError(
        todayHolidayTitle
          ? `Punch in/out is not allowed on ${todayHolidayTitle}.`
          : "Punch in/out is not allowed on assigned holidays."
      );
      return;
    }
    setPunchLoading(true);
    setPunchError(null);
    try {
      const tz = typeof Intl !== "undefined" && Intl.DateTimeFormat?.().resolvedOptions?.().timeZone ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
      if (attendanceStudent.type === "user") {
        if (punchStatus?.isPunchedIn) {
          await punchOutAttendanceMe({ punchOutTime: new Date().toISOString(), timezone: tz });
        } else {
          await punchInAttendanceMe({ timezone: tz });
        }
        const status = await getPunchInOutStatusMe();
        setPunchStatus(status);
      } else {
        if (punchStatus?.isPunchedIn) {
          await punchOutAttendance(attendanceStudent.id, { punchOutTime: new Date().toISOString(), timezone: tz });
        } else {
          await punchInAttendance(attendanceStudent.id, { timezone: tz });
        }
        const status = await getPunchInOutStatus(attendanceStudent.id);
        setPunchStatus(status);
      }
    } catch (e: unknown) {
      setPunchError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Could not update punch status."
      );
    } finally {
      setPunchLoading(false);
    }
  };

  /* ---- Derived data ---- */
  /**
   * The single task list.
   *
   * The server already returned open, dated, assigned-to-me tasks in dueDate order, so
   * this only re-applies that order locally — which keeps rendering stable while an
   * optimistic toggle is in flight, and holds if the server ever ignores sortBy.
   * `openOnly` drops a row the moment it is ticked, so completing a task removes it.
   */
  const dashboardTasks = useMemo(
    () => sortByDueDate(openOnly(myTasks)).slice(0, DASHBOARD_TASKS_LIMIT),
    [myTasks]
  );
  const funnelChart = useMemo(
    () =>
      atsData?.applicationFunnel?.length
        ? buildFunnelChart(atsData.applicationFunnel)
        : null,
    [atsData]
  );
  /* Text equivalent of the funnel bars, for the chart's aria-label. Same numbers,
     read in the same order the bars are drawn. */
  const funnelSummary = useMemo(() => {
    const rows = atsData?.applicationFunnel ?? [];
    if (rows.length === 0) return "";
    const parts = rows.map(
      (r) => `${r.status.charAt(0).toUpperCase()}${r.status.slice(1)} ${r.count}`
    );
    return `Application funnel by stage: ${parts.join(", ")}.`;
  }, [atsData]);

  const totals = atsData?.totals;
  /* `totals` is null both when the analytics call failed and when the viewer has no ATS
     permission for it. Either way the honest KPI is "—", not a hard 0 that reads as a
     real count of nothing. */
  const totalsUnavailable = !loading && !totals;
  /** Prefer listing API totalResults so Applications stat matches Applications modal rows. */
  const applicationsStatCount =
    applicationsListingTotal != null ? applicationsListingTotal : totals?.totalApplications ?? 0;
  const applicationsUnavailable = !loading && applicationsListingTotal == null && !totals;
  const filteredProjects = useMemo(
    () => filterAndSortProjects(projects, projectSearch, projectSort),
    [projects, projectSearch, projectSort]
  );
  const projectSummaryPagination = useMemo(
    () =>
      getProjectSummaryPagination(
        filteredProjects.length,
        projectPage,
        PROJECT_SUMMARY_PAGE_SIZE
      ),
    [filteredProjects.length, projectPage]
  );
  const displayedProjects = useMemo(
    () =>
      paginateProjectSummary(
        filteredProjects,
        projectSummaryPagination.page,
        PROJECT_SUMMARY_PAGE_SIZE
      ),
    [filteredProjects, projectSummaryPagination.page]
  );
  useEffect(() => {
    if (!projectSortMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        projectSortRef.current &&
        !projectSortRef.current.contains(e.target as Node)
      ) {
        setProjectSortMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [projectSortMenuOpen]);

  useEffect(() => {
    setProjectPage(1);
  }, [projectSearch, projectSort]);

  useEffect(() => {
    if (projectPage !== projectSummaryPagination.page) {
      setProjectPage(projectSummaryPagination.page);
    }
  }, [projectPage, projectSummaryPagination.page]);

  /* ---- Skeleton loader ---- */
  const Skeleton = ({ className = "" }: { className?: string }) => (
    <div
      className={`animate-pulse bg-black/5 dark:bg-white/10 rounded ${className}`}
    />
  );

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  if (capabilitiesLoading) {
    return (
      <Fragment>
        <Seo title="Dashboard" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Fragment>
    );
  }

  if (isSalesAgentOnly || dashboardType === "salesAgent") {
    return <SalesAgentDashboard />;
  }

  /** ATS applicants (Candidate role) — job applications, browse jobs. Not HRMS Employee staff. */
  if (dashboardType === "candidate") {
    return <CandidateDashboard />;
  }

  /** HRMS Employee staff — attendance, tasks, leave, projects. Not ATS candidates. */
  if (dashboardType === "employee") {
    return <EmployeeDashboard />;
  }

  /** Employee role and other internal users use the HRMS dashboard (tasks, attendance, ATS panels by permission). */
  return (
    <Fragment>
      <Seo title="Dashboard" />

      {unauthorized && (
        <div className="mb-4 p-4 bg-warning/10 border border-warning/30 text-warning rounded-md text-sm">
          You do not have permission to access that page. You have been
          redirected to the dashboard.
        </div>
      )}

      {/* ========== WELCOME BAR ========== */}
      <div className="box mb-4">
        <div className="box-body flex flex-wrap items-center justify-between gap-3 sm:gap-4 !py-2.5 sm:!py-3">
          <div className="min-w-0">
            {/* The page's only h1. Was an h4, which left the document with no top-level
                heading and a level jump straight to the card titles below. The three
                sibling dashboards already put their greeting in an h1. */}
            <h1 className="font-semibold text-[1rem] sm:text-[1.125rem] mb-0">
              {getGreeting()},{" "}
              <span className="text-primary">{(user?.name || "there").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
            </h1>
            <span className="text-[#8c9097] dark:text-white/50 text-[0.8125rem]">
              {getTodayDisplay()}
            </span>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Punch In / Punch Out - for non-admin users with attendance permission (candidate, student, agent, etc.) */}
            {showAttendancePunch && (
              <button
                type="button"
                onClick={handlePunch}
                disabled={punchLoading || punchBlockedByHoliday}
                className={`ti-btn ti-btn-sm shrink-0 whitespace-nowrap min-w-[7rem] px-3 ${
                  punchBlockedByHoliday
                    ? "ti-btn-light opacity-60 cursor-not-allowed"
                    : punchStatus?.isPunchedIn
                      ? "ti-btn-danger"
                      : "ti-btn-success"
                }`}
                title={
                  punchBlockedByHoliday
                    ? todayHolidayTitle
                      ? `${todayHolidayTitle} — punch disabled`
                      : "Holiday — punch disabled"
                    : punchStatus?.isPunchedIn
                      ? "Punch out"
                      : "Punch in"
                }
              >
                {punchLoading ? (
                  <i className="ti ti-loader-alt animate-spin text-[1rem]" />
                ) : punchBlockedByHoliday ? (
                  <>
                    <i className="ti ti-calendar-off text-[1rem] me-1.5" />
                    Holiday
                  </>
                ) : punchStatus?.isPunchedIn ? (
                  <>
                    <i className="ti ti-logout text-[1rem] me-1.5" />
                    Punch Out
                  </>
                ) : (
                  <>
                    <i className="ti ti-login text-[1rem] me-1.5" />
                    Punch In
                  </>
                )}
              </button>
            )}
            {/* Notifications */}
            <Link
              href="/notifications"
              aria-label={formatNotificationBellAriaLabel(unreadCount)}
              className="relative ti-btn ti-btn-sm ti-btn-light shrink-0 inline-flex items-center justify-center"
            >
              <i className="ti ti-bell text-[1.1rem]"></i>
              {unreadCount > 0 && (() => {
                const badgeText = formatBadgeCount(unreadCount);
                return (
                  <span
                    aria-hidden="true"
                    className={`absolute top-0 end-0 translate-x-[20%] -translate-y-[10%] badge tabular-nums leading-none flex items-center justify-center text-[0.6rem] ${getBadgeColorClasses(unreadCount)} ${getBadgeSizeClasses(badgeText)}`}
                  >
                    {badgeText}
                  </span>
                );
              })()}
            </Link>
          </div>
        </div>
      </div>

      {punchError && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
          {punchError}
        </div>
      )}

      {/* Dashboard grid. Five rows, each a tier of the hierarchy with its own
         height: 1 status, 2 people & pipeline, 3 tasks & analytics, 5 detail.
         Row 4 (Highlight of Today / Today's Interviews) is reserved and not built
         yet; when it lands, On Leave Today moves out of the row-3 stack into it.
         A row cell declares the height, the card inside fills it, its body scrolls.
         Heights apply from md up only - a single column cannot leave a gap. */}
      <div className="grid grid-cols-12 gap-4 items-start [&_.box]:!mb-0">

        {/* ROW 1 - STATUS */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          {/* Trend badges ("1.5%", "0.8%", "0.5%") used to sit here. They were literals in
              the markup, not deltas — GET /ats/analytics only returns previousPeriod when
              a `range` is passed, this page passes none, and even with a range the server
              computes a previous period for applications and hires ONLY, never for jobs or
              headcount. There is no real number to show for these, so the badges are gone
              rather than dressed up. The caption under each value now states the window
              the number actually covers. */}
          <Link
            href="/ats/jobs"
            className="block w-full text-left border-0 bg-transparent p-0 cursor-pointer hover:opacity-90 rounded-lg no-underline text-inherit"
          >
            <div className="box">
              <div className="box-body flex justify-between items-center gap-3 !p-3 sm:!p-4">
                <div className="min-w-0">
                  <p className="mb-1 text-[0.8125rem] sm:text-sm">Total Jobs</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mb-1" />
                ) : (
                  /* Data, not a section heading — an h4 here skipped straight from the
                     page h1. */
                  <p className="font-semibold mb-1 text-[1.25rem] sm:text-[1.5rem]">
                    {totalsUnavailable ? "—" : totals?.totalJobs ?? 0}
                  </p>
                )}
                <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">All time</span>
              </div>
              <span className="avatar avatar-md bg-primary text-white p-2">
                <i className="ti ti-briefcase text-[1.25rem] text-white opacity-[0.7]"></i>
              </span>
            </div>
          </div>
          </Link>
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <Link
            href="/ats/jobs?status=active"
            className="block w-full text-left border-0 bg-transparent p-0 cursor-pointer hover:opacity-90 rounded-lg no-underline text-inherit"
          >
            <div className="box">
              <div className="box-body flex justify-between items-center gap-3 !p-3 sm:!p-4">
                <div className="min-w-0">
                  <p className="mb-1 text-[0.8125rem] sm:text-sm">Active Jobs</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mb-1" />
                ) : (
                  <p className="font-semibold mb-1 text-[1.25rem] sm:text-[1.5rem]">
                    {totalsUnavailable ? "—" : totals?.activeJobs ?? 0}
                  </p>
                )}
                <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">Open now</span>
              </div>
              <span className="avatar avatar-md bg-secondary text-white p-2">
                <i className="ti ti-clipboard-list text-[1.25rem] opacity-[0.7]"></i>
              </span>
            </div>
          </div>
          </Link>
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          {/* `totals.totalCandidates` is a legacy FIELD NAME, not a description of what it
              counts. The server resolves it through queryCandidates with employmentStatus
              "current" and the default ownerUserRole "employee" — Employee-role profiles
              with no past resign date. That is exactly the default view of /ats/employees,
              which the sidebar and the page title both call "Employees". Label, number and
              destination already agree, so this stays "Total Employees"; renaming it to
              "Candidates" would break that agreement rather than fix it.
              Caveat, and it lives in the backend: for a viewer holding the Recruiter role
              the analytics service takes its OTHER branch (assignedRecruiter, with no
              owner-role scope) and returns assigned candidate profiles instead. Correcting
              that means changing atsAnalytics.service.js, not this label. */}
          <Link
            href="/ats/employees"
            className="block w-full text-left border-0 bg-transparent p-0 cursor-pointer hover:opacity-90 rounded-lg no-underline text-inherit"
          >
            <div className="box">
              <div className="box-body flex justify-between items-center gap-3 !p-3 sm:!p-4">
                <div className="min-w-0">
                  <p className="mb-1 text-[0.8125rem] sm:text-sm">Total Employees</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mb-1" />
                ) : (
                  <p className="font-semibold mb-1 text-[1.25rem] sm:text-[1.5rem]">
                    {totalsUnavailable ? "—" : totals?.totalCandidates ?? 0}
                  </p>
                )}
                <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">Currently employed</span>
              </div>
              <span className="avatar avatar-md bg-success text-white p-2">
                <i className="ti ti-users text-[1.25rem] opacity-[0.7]"></i>
              </span>
            </div>
          </div>
          </Link>
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          {/* aria-label "Manage all applications" was removed: it replaced the visible text
              with words that label does not contain, so speech control could not activate
              the card by what it reads (WCAG 2.5.3 Label in Name). The card's own content
              names it. */}
          <Link
            href="/ats/applications"
            className="block w-full text-left rounded-lg hover:opacity-90"
          >
            <div className="box">
              <div className="box-body flex justify-between items-center gap-3 !p-3 sm:!p-4">
                <div className="min-w-0">
                  <p className="mb-1 text-[0.8125rem] sm:text-sm">Applications</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mb-1" />
                ) : (
                  <p className="font-semibold mb-1 text-[1.25rem] sm:text-[1.5rem]">
                    {applicationsUnavailable ? "—" : applicationsStatCount}
                  </p>
                )}
                {/* Counted by listJobApplications({ activeJobsOnly: true }), so this is
                    applications to ACTIVE jobs — not every application ever, which is what
                    the old "All time" caption claimed. */}
                <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">On active jobs</span>
              </div>
              <span className="avatar avatar-md bg-warning text-white p-2">
                <i className="ti ti-file-description text-[1.25rem] opacity-[0.7]"></i>
              </span>
            </div>
          </div>
          </Link>
        </div>

        {/* ROW 2 - PEOPLE & TODAY. Candidate List sets the height; the away stack
           absorbs it, Holidays taking whatever On Leave Today does not need. */}
        <div className="col-span-12 md:col-span-6 xxl:col-span-8 md:h-[26rem]">
          <div className="box h-full flex flex-col overflow-hidden">
              <div className="box-header justify-between">
                <h2 className="box-title !mb-0">Candidate List</h2>
                {/* Was 32px. -me-2 pulls the larger target back so the 44px hit area does
                    not widen the header padding. */}
                <Link href="/ats/referral-leads" className="-me-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#8c9097] dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" title="View referral leads" aria-label="View referral leads">
                  <i className="ri-external-link-line text-[1rem]" aria-hidden />
                </Link>
              </div>
              <div className="box-body flex-1 min-h-0 overflow-y-auto">
                {loading ? (
                  /* Same divider rhythm and row height as the loaded list, so the panel
                     does not shift when the data lands. */
                  <ul className="list-none mb-0" aria-busy="true" aria-live="polite">
                    {[...Array(5)].map((_, i) => (
                      <li
                        key={i}
                        className="flex min-h-[3.75rem] items-center gap-3 border-b border-black/5 p-2 last:border-b-0 dark:border-white/[0.08] sm:p-3"
                      >
                        <Skeleton className="h-9 w-9 rounded-md shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <Skeleton className="h-3 w-2/5" />
                          <Skeleton className="h-2.5 w-3/5" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                      </li>
                    ))}
                  </ul>
                ) : loadErrors.candidates ? (
                  /* A rejected request used to land in the same empty array as a genuinely
                     empty pipeline, so an outage read as "No recent candidates". */
                  <div className="flex flex-col items-center justify-center py-8 text-center" role="alert">
                    <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
                      <i className="ri-error-warning-line text-[1.25rem]" aria-hidden />
                    </span>
                    <p className="mb-1 text-sm font-semibold">Couldn&apos;t load candidates</p>
                    <p className="mb-3 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                      {loadErrors.candidates}
                    </p>
                    <button
                      type="button"
                      onClick={() => void fetchDashboard()}
                      className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-md border border-primary/30 px-4 text-[0.8125rem] font-medium text-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <i className="ri-refresh-line" aria-hidden /> Try again
                    </button>
                  </div>
                ) : recentApplications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/5 text-primary mb-3">
                      <i className="ri-user-search-line text-[1.25rem]" aria-hidden />
                    </span>
                    <p className="font-semibold text-sm mb-1">No recent candidates</p>
                    <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-3">
                      New applicants will appear here.
                    </p>
                    <Link
                      href="/ats/jobs"
                      className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-md border border-primary/30 px-4 text-[0.8125rem] font-medium text-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <i className="ri-briefcase-line" aria-hidden /> View open jobs
                    </Link>
                  </div>
                ) : (
                  /* Divider rhythm, not gaps. `space-y-1` left a 4px gap between rows
                     whose own padding was 12px, so the join between two rows read as a
                     smaller break than the space inside one — and against the card's 20px
                     body padding the first gap looked bigger again. Hairline dividers with
                     a fixed row height give one even rhythm, and match the My Tasks list
                     in the row below. */
                  <ul className="list-none team-members-card mb-0">
                    {recentApplications.map((app) => {
                      const c = app.candidate ?? {};
                      const appId = String(app._id ?? app.id ?? "");
                      const candidateId = String(c._id ?? c.id ?? "");
                      const name = (c.fullName ?? c.email ?? "Unnamed candidate").trim() || "Unnamed candidate";
                      const jobTitle = getApplicationJobTitle(app);
                      const status = app.status;
                      const statusStyles = getApplicationStatusStyles(status);
                      const relTime = formatRelativeTime(app.updatedAt ?? app.createdAt);
                      const profileHref = candidateId ? `/ats/employees/edit?id=${candidateId}` : "/ats/jobs";
                      /* Mirror the /ats/applications row "Schedule interview" action: deep-link to
                         the interviews page with openSchedule=1 so the Create Interview modal opens
                         and prefills from the application (candidate + job context). */
                      const jRef = app.job;
                      const jobId =
                        typeof jRef === "object" && jRef !== null
                          ? String((jRef as { _id?: string; id?: string })._id ?? (jRef as { id?: string }).id ?? "")
                          : jRef
                            ? String(jRef)
                            : "";
                      const scheduleHref = appId
                        ? `/ats/interviews?${new URLSearchParams({
                            openSchedule: "1",
                            applicationId: appId,
                            ...(candidateId ? { candidateId } : {}),
                            ...(jobId ? { jobId } : {}),
                          }).toString()}`
                        : "/ats/interviews";
                      return (
                        <li
                          key={appId || candidateId}
                          className="border-b border-black/5 last:border-b-0 dark:border-white/[0.08]"
                        >
                          <div className="relative group">
                            <Link
                              href={profileHref}
                              aria-label={`View candidate ${name}`}
                              className="flex min-h-[3.75rem] w-full items-center justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/5 sm:p-3"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className="avatar avatar-sm bg-primary/10 text-primary rounded-md leading-none flex items-center justify-center text-xs font-semibold shrink-0">
                                  {getInitials(name)}
                                </span>
                                <div className="min-w-0 flex-1 leading-tight">
                                  <span className="font-semibold block truncate group-hover:text-primary transition-colors">
                                    {name}
                                  </span>
                                  {/* "Updated …" used to be its own third line, rendered
                                      only when the application carried a usable date. That
                                      made a row with one two lines tall and a row without
                                      it three, so the list had two different row heights
                                      depending on the data. Folded into this line, every
                                      row is exactly two lines whatever the data says. */}
                                  <span className="mt-1 block truncate text-[0.75rem] text-[#8c9097] dark:text-white/50">
                                    {jobTitle}
                                    <span className="mx-1.5 opacity-60">•</span>
                                    {status}
                                    {relTime && (
                                      <>
                                        <span className="mx-1.5 opacity-60">•</span>
                                        <span className="opacity-80">{relTime}</span>
                                      </>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {/* 10px -> 12px. This is a pipeline stage a recruiter reads
                                    at a glance, not decoration. */}
                                <span
                                  className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[0.75rem] font-semibold leading-none transition-opacity group-hover:opacity-0 ${statusStyles}`}
                                  aria-label={`Stage: ${status}`}
                                >
                                  {status}
                                </span>
                              </div>
                            </Link>
                            {/* Targets were 28px. At 44px the tray is wide enough to sit over
                                the row text, so it now carries its own opaque background —
                                which also fixes the icons previously floating over the
                                candidate name. Labels name the candidate so three rows of
                                "View profile" are distinguishable to a screen reader. */}
                            <div
                              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 rounded-lg bg-white/95 px-1 shadow-sm ring-1 ring-black/5 dark:bg-bodybg/95 dark:ring-white/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
                              role="group"
                              aria-label={`Quick actions for ${name}`}
                            >
                              <Link
                                href={profileHref}
                                onClick={(e) => e.stopPropagation()}
                                title="View profile"
                                aria-label={`View profile of ${name}`}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-[#8c9097] dark:text-white/60 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                              >
                                <i className="ri-user-3-line text-[1rem]" aria-hidden />
                              </Link>
                              <a
                                href={c.email ? `mailto:${c.email}` : "#"}
                                onClick={(e) => e.stopPropagation()}
                                title="Message"
                                aria-label={`Email ${name}`}
                                aria-disabled={c.email ? undefined : true}
                                className={`inline-flex h-11 w-11 items-center justify-center rounded-md text-[#8c9097] dark:text-white/60 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${c.email ? "" : "pointer-events-none opacity-50"}`}
                              >
                                <i className="ri-mail-line text-[1rem]" aria-hidden />
                              </a>
                              <Link
                                href={scheduleHref}
                                onClick={(e) => e.stopPropagation()}
                                title="Schedule interview"
                                aria-label={`Schedule interview with ${name}`}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-[#8c9097] dark:text-white/60 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                              >
                                <i className="ri-calendar-event-line text-[1rem]" aria-hidden />
                              </Link>
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
        <div className="col-span-12 md:col-span-6 xxl:col-span-4 md:h-[26rem] flex flex-col gap-4">
          {showUpcomingHolidays && (
            <div className={FILL_CARD}>
              <UpcomingHolidaysCard
                loading={holidaysLoading}
                todayIsHoliday={todayIsHoliday}
                todayHolidayTitle={todayHolidayTitle}
                holidays={upcomingHolidays}
                showManage={canManageHolidays}
                scope={holidayScope}
              />
            </div>
          )}
          {/* Always rendered, empty state included: dropping it collapsed the whole
              away column and pushed Candidate List to full width. When Holidays is
              absent this card takes the stack's height instead of leaving a gap. */}
          <div className={showUpcomingHolidays ? "shrink-0" : FILL_CARD}>
            <OnLeaveTodayCard
              items={onLeaveToday}
              selfView={onLeaveScope === "self"}
              loading={onLeaveLoading}
            />
          </div>
        </div>

        {/* ROW 3 - WORK. Analytics beside the single task list; 5 + 7 fills the row. */}
        <div className="col-span-12 md:col-span-6 md:h-[24rem] xxl:col-span-5">
          <div className="box h-full flex flex-col min-h-0 overflow-hidden">
            <div className="box-header justify-between flex-shrink-0">
              <h2 className="box-title !mb-0">Application Analytics</h2>
              <Link href="/ats/analytics" className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50">View All <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i></Link>
            </div>
            {/* When the real funnel was empty this used to render ProjectAnalysis from
                shared/data/dashboards/projectsdata — a template demo series. A viewer had
                no way to tell that curve from their own hiring data. An empty funnel now
                says so, and a failed one says that instead of showing nothing. */}
            <div className="box-body flex-1 min-h-0 flex flex-col">
              {loading ? (
                <Skeleton className="h-full min-h-[220px] w-full" />
              ) : funnelChart ? (
                <FunnelChartFill
                  options={funnelChart.options}
                  series={funnelChart.series}
                  summary={funnelSummary}
                />
              ) : loadErrors.analytics ? (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center" role="alert">
                  <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
                    <i className="ri-error-warning-line text-[1.25rem]" aria-hidden />
                  </span>
                  <p className="mb-1 text-[0.8125rem] font-semibold">Couldn&apos;t load application analytics</p>
                  <p className="mb-3 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                    {loadErrors.analytics}
                  </p>
                  <button
                    type="button"
                    onClick={() => void fetchDashboard()}
                    className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-md border border-primary/30 px-4 text-[0.8125rem] font-medium text-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <i className="ri-refresh-line" aria-hidden /> Try again
                  </button>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                  <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary">
                    <i className="ri-bar-chart-grouped-line text-[1.25rem]" aria-hidden />
                  </span>
                  <p className="mb-1 text-[0.8125rem] font-semibold">No application funnel yet</p>
                  <p className="mb-3 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                    Stages fill in as candidates move through your open roles.
                  </p>
                  <Link
                    href="/ats/analytics"
                    className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-md border border-primary/30 px-4 text-[0.8125rem] font-medium text-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <i className="ri-line-chart-line" aria-hidden /> Open ATS analytics
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* One task widget. "Daily Tasks" and "Main Tasks" asked the same question of
            the same array and rendered the overlap twice; merged, the row is two cells
            (5 + 7) instead of three. */}
        <div className="col-span-12 md:col-span-6 md:h-[24rem] xxl:col-span-7">
          <div className="box h-full flex flex-col min-h-0 overflow-hidden">
            <div className="box-header justify-between flex-shrink-0">
              <div>
                <h2 className="box-title !mb-0">My Tasks</h2>
                <p className="mb-0 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                  Overdue and upcoming, soonest first
                </p>
              </div>
              <Link href="/task/my-tasks" className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50">View All <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i></Link>
            </div>
            <div className="box-body flex-1 min-h-0 overflow-y-auto">
              {loading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
              ) : loadErrors.tasks ? (
                /* "Nothing due" is a reassuring message and was shown for a failed request
                   too, which is the worst possible way to be wrong about someone's tasks. */
                <div className="flex flex-col items-center justify-center py-8 text-center" role="alert">
                  <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
                    <i className="ri-error-warning-line text-[1.25rem]" aria-hidden />
                  </span>
                  <p className="mb-1 text-[0.8125rem] font-semibold">Couldn&apos;t load your tasks</p>
                  <p className="mb-3 text-[0.75rem] text-[#8c9097] dark:text-white/50">{loadErrors.tasks}</p>
                  <button
                    type="button"
                    onClick={() => void fetchDashboard()}
                    className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-md border border-primary/30 px-4 text-[0.8125rem] font-medium text-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <i className="ri-refresh-line" aria-hidden /> Try again
                  </button>
                </div>
              ) : dashboardTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                    <i className="ri-check-double-line text-[1.25rem]" aria-hidden />
                  </span>
                  <p className="mb-1 text-[0.8125rem] font-semibold">Nothing due</p>
                  <p className="mb-0 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                    Dated tasks assigned to you appear here.
                  </p>
                </div>
              ) : (
                <ul className="list-none mb-0 space-y-1">
                  {dashboardTasks.map((t) => {
                    const bucket = dueBucket(t);
                    const late = daysOverdue(t);
                    const taskId = getTaskId(t);
                    return (
                      <li
                        key={taskId || t.title}
                        className="flex items-center gap-1 rounded-lg border-b border-black/5 last:border-b-0 dark:border-white/[0.08]"
                      >
                        {/* 44px target; a real control, not the decorative input this replaced. */}
                        <button
                          type="button"
                          onClick={() => void handleTaskToggle(t)}
                          aria-label={`Mark "${t.title}" complete`}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#8c9097] transition-colors hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-white/50"
                        >
                          <span
                            aria-hidden="true"
                            className="grid h-4 w-4 place-items-center rounded border-[1.5px] border-current"
                          />
                        </button>
                        <Link
                          href="/task/my-tasks"
                          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 transition-colors hover:bg-primary/5"
                        >
                          <span className="min-w-0 flex-1 truncate text-[0.8125rem]" title={t.title}>
                            {t.title}
                          </span>
                          {/* Due-state chips were 9.6px and the date 10.4px. These are the
                              row's only urgency signal, so they read at 12px now. */}
                          {bucket === "overdue" ? (
                            <span className="badge shrink-0 bg-danger/10 text-danger text-[0.75rem]">
                              {late}d late
                            </span>
                          ) : bucket === "today" ? (
                            <span className="badge shrink-0 bg-warning/10 text-warning text-[0.75rem]">Today</span>
                          ) : (
                            <span className="shrink-0 text-[0.75rem] tabular-nums text-[#8c9097] dark:text-white/50">
                              {formatDate(t.dueDate)}
                            </span>
                          )}
                          <span className={`${getStatusBadgeClass(t.status)} shrink-0 hidden sm:inline-flex`}>
                            {TASK_STATUS_LABELS[t.status] ?? t.status}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ROW 4 - TODAY. The focal row: today's events beside Recent Jobs, 8 + 4.
            Full width below xxl — an event row is [time][title][badge][Join] and needs
            the width; a half column would force it to wrap on every row. */}
        <div className="col-span-12 xxl:col-span-8 md:h-[24rem]">
          <TodayEventsCard
            events={todayEvents}
            loading={todayEventsLoading}
            errors={todayEventErrors}
            totalToday={todayEventsTotal}
            user={user ?? null}
          />
        </div>
        <div className="col-span-12 md:col-span-6 xxl:col-span-4 md:h-[24rem]">
          <div className="box h-full overflow-hidden flex flex-col">
            <div className="box-header justify-between flex-shrink-0">
              <h2 className="box-title !mb-0">Recent Jobs</h2>
              <Link href="/ats/jobs" className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50">View All <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i></Link>
            </div>
            <div className="box-body flex-1 min-h-0 overflow-y-auto [&_.project-transactions-card_li]:!mb-3">
              {loading ? (
                <div className="space-y-3" aria-busy="true" aria-live="polite">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : loadErrors.jobs ? (
                <div className="flex flex-col items-center justify-center py-8 text-center" role="alert">
                  <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
                    <i className="ri-error-warning-line text-[1.25rem]" aria-hidden />
                  </span>
                  <p className="mb-1 text-[0.8125rem] font-semibold">Couldn&apos;t load jobs</p>
                  <p className="mb-3 text-[0.75rem] text-[#8c9097] dark:text-white/50">{loadErrors.jobs}</p>
                  <button
                    type="button"
                    onClick={() => void fetchDashboard()}
                    className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-md border border-primary/30 px-4 text-[0.8125rem] font-medium text-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <i className="ri-refresh-line" aria-hidden /> Try again
                  </button>
                </div>
              ) : recentJobs.length === 0 ? (
                /* Was a bare sentence, which read as a rendering failure beside the
                    illustrated empty states in the same row. */
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary">
                    <i className="ri-briefcase-line text-[1.25rem]" aria-hidden />
                  </span>
                  <p className="mb-1 text-[0.8125rem] font-semibold">No active jobs</p>
                  <p className="mb-3 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                    Roles you post appear here.
                  </p>
                  <Link
                    href="/ats/jobs"
                    className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-md border border-primary/30 px-4 text-[0.8125rem] font-medium text-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <i className="ri-add-line" aria-hidden /> Go to Jobs
                  </Link>
                </div>
              ) : (
                <ul className="list-none project-transactions-card">
                  {recentJobs.slice(0, DASHBOARD_RECENT_JOBS_DISPLAY_LIMIT).map((job) => {
                    const jobId = String(job._id ?? job.id ?? "");
                    const count = applicantCountByJob[jobId] ?? 0;
                    const status = (job.status ?? "").toLowerCase();
                    const statusCls =
                      status === "active"
                        ? "badge bg-success/10 text-success"
                        : status === "closed" || status === "archived"
                          ? "badge bg-danger/10 text-danger"
                          : "badge bg-secondary/10 text-secondary";
                    return (
                      <li key={jobId}>
                        <div className="flex items-start gap-3 min-w-0 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <button
                            type="button"
                            className="shrink-0 cursor-pointer hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              setApplicantsModal({ jobId, jobTitle: job.title ?? "—" });
                            }}
                            title="View applicants"
                            aria-label={`View ${count} applicant${count !== 1 ? "s" : ""} for ${job.title ?? "this job"}`}
                          >
                            <span className="avatar avatar-rounded font-bold avatar-md !text-primary bg-primary/10">{count}</span>
                          </button>
                          <button
                            type="button"
                            className="flex-1 min-w-0 text-left border-0 bg-transparent p-0 cursor-pointer hover:opacity-90"
                            onClick={() => setSelectedJobDetail(job)}
                          >
                            <span className="block font-semibold line-clamp-2 break-words" title={job.title ?? ""}>{job.title ?? "—"}</span>
                            <span className="block text-[#8c9097] dark:text-white/50 text-[0.6875rem] truncate mt-0.5" title={`${job.organisation?.name ?? "—"} • ${count} applicant${count !== 1 ? "s" : ""}`}>
                              {job.organisation?.name ?? "—"} &bull; {count} applicant{count !== 1 ? "s" : ""}
                            </span>
                            {job.status && (
                              <span className={`inline-block mt-1 text-[0.75rem] ${statusCls}`}>{job.status}</span>
                            )}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ROW 5 - DETAIL. Height is PROJECT_SUMMARY_PAGE_SIZE rows, never a min-height.
            Full width now that row 4 is filled — at xxl:col-span-8 it would leave a
            four-column hole beside it. */}
        <div className="col-span-12">
          <div className="box">
            {/* Below 1024 the controls stack under the title: search takes the full row,
                Sort By and View All wrap onto the next one. Same controls, same state —
                only the flex direction is breakpoint-dependent. */}
            <div className="box-header justify-between flex-col items-start gap-2 min-[1024px]:flex-row min-[1024px]:flex-wrap min-[1024px]:items-center">
              <h2 className="box-title !mb-0">Projects Summary</h2>
              <div className="flex w-full flex-wrap items-center gap-2 min-[1024px]:w-auto">
                <input
                  className="ti-form-control form-control-sm !rounded-sm !w-full min-[1024px]:!w-auto min-[1024px]:min-w-[140px]"
                  type="text"
                  inputMode="search"
                  placeholder="Search Here"
                  aria-label="Search projects"
                  value={projectSearch ?? ""}
                  onChange={(e) => setProjectSearch(e.currentTarget.value)}
                />
                <div ref={projectSortRef} className="relative">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !bg-primary !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium"
                    id="project-summary-sort-button"
                    aria-haspopup="menu"
                    aria-expanded={projectSortMenuOpen}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setProjectSortMenuOpen((prev) => !prev);
                    }}
                  >
                    Sort By{" "}
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  {projectSortMenuOpen && (
                    <ul
                      className="absolute end-0 top-full z-50 mt-1 min-w-[11rem] max-h-[min(18rem,50vh)] overflow-y-auto rounded-lg border border-defaultborder dark:border-defaultborder/20 bg-white py-1 shadow-lg dark:bg-bodybg"
                      role="menu"
                      aria-labelledby="project-summary-sort-button"
                    >
                      {PROJECT_SUMMARY_SORT_OPTIONS.map((opt) => (
                        <li key={opt.value} role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${
                              projectSort === opt.value ? "active" : ""
                            }`}
                            onClick={() => {
                              setProjectSort(opt.value);
                              setProjectSortMenuOpen(false);
                            }}
                          >
                            <i
                              className={`${opt.icon} me-2 align-middle inline-block`}
                            ></i>
                            {opt.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Link href="/apps/projects/project-list" className="px-2 font-normal text-[0.75rem] text-primary">View All</Link>
              </div>
            </div>
            <div className="box-body">
              {loading ? (
                <div className="space-y-3" aria-busy="true" aria-live="polite">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : loadErrors.projects ? (
                <div className="flex flex-col items-center justify-center py-8 text-center" role="alert">
                  <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
                    <i className="ri-error-warning-line text-[1.25rem]" aria-hidden />
                  </span>
                  <p className="mb-1 text-[0.8125rem] font-semibold">Couldn&apos;t load projects</p>
                  <p className="mb-3 text-[0.75rem] text-[#8c9097] dark:text-white/50">{loadErrors.projects}</p>
                  <button
                    type="button"
                    onClick={() => void fetchDashboard()}
                    className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-md border border-primary/30 px-4 text-[0.8125rem] font-medium text-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <i className="ri-refresh-line" aria-hidden /> Try again
                  </button>
                </div>
              ) : projects.length === 0 ? (
                <p className="text-[#8c9097] dark:text-white/50 text-sm">
                  No projects yet.
                </p>
              ) : filteredProjects.length === 0 ? (
                <p className="text-[#8c9097] dark:text-white/50 text-sm">
                  No projects match your search.
                </p>
              ) : (
                <>
                {/* Desktop (>=1024px) keeps the seven-column table exactly as it was.
                    Below that the same displayedProjects render as cards — one data
                    source, one set of helpers, no duplicated filtering or paging. */}
                <div className="table-responsive hidden min-[1024px]:block">
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
                      {displayedProjects.map((p, i) => {
                        const total = p.totalTasks ?? 0;
                        const completed = p.completedTasks ?? 0;
                        const pct = projectProgressPct(p);
                        const rowNumber =
                          (projectSummaryPagination.page - 1) *
                            PROJECT_SUMMARY_PAGE_SIZE +
                          i +
                          1;
                        return (
                          <tr
                            key={p._id ?? p.id ?? i}
                            className="border border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10"
                          >
                            <th scope="row" className="!text-start">
                              {rowNumber}
                            </th>
                            <td>{p.name}</td>
                            <td>
                              {p.assignedTo && p.assignedTo.length > 0 ? (
                                <div className="avatar-list-stacked">
                                  {p.assignedTo.slice(0, 3).map((u, idx) => (
                                    <span
                                      key={u._id ?? u.id ?? idx}
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

                {/* Tablet (>=768px) shows every field inline. Phone (<768px) shows the
                    scannable subset and puts the rest behind the chevron. Both are the
                    same markup — only `md:` decides what is visible, so there is no
                    second render path to keep in sync. */}
                <div className="min-[1024px]:hidden space-y-2">
                  {displayedProjects.map((p, i) => {
                    const total = p.totalTasks ?? 0;
                    const completed = p.completedTasks ?? 0;
                    const pct = projectProgressPct(p);
                    const projectId = p._id ?? p.id ?? "";
                    const rowKey = projectId || `project-${i}`;
                    const open = expandedProjectId === rowKey;
                    const panelId = `project-summary-panel-${rowKey}`;
                    const assignees = p.assignedTo ?? [];
                    const avatars =
                      assignees.length > 0 ? (
                        <div className="avatar-list-stacked">
                          {assignees.slice(0, 3).map((u, idx) => (
                            <span
                              key={u._id ?? u.id ?? idx}
                              className="avatar avatar-xs avatar-rounded bg-primary/10 text-primary text-[0.65rem]"
                            >
                              {getInitial(u.name ?? u.email)}
                            </span>
                          ))}
                          {assignees.length > 3 && (
                            <span className="avatar avatar-xs bg-primary avatar-rounded text-white text-[0.65rem] font-normal">
                              +{assignees.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">—</span>
                      );

                    return (
                      <article
                        key={rowKey}
                        className="rounded-lg border border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg p-3"
                      >
                        <div className="flex items-start gap-2">
                          {/* min-w-0 so a long unbroken project name shrinks instead of
                              pushing the chevron out of the card. */}
                          <p className="mb-0 min-w-0 flex-1 line-clamp-2 break-words font-semibold text-[0.8125rem] leading-snug">
                            {p.name}
                          </p>
                          {/* Phone only. 44px touch target, pulled back with negative
                              margin so it does not grow the collapsed card. */}
                          <button
                            type="button"
                            className="md:hidden -my-1.5 -me-1.5 flex h-11 w-11 shrink-0 items-center justify-center text-[#8c9097] dark:text-white/50 hover:text-primary"
                            aria-expanded={open}
                            aria-controls={panelId}
                            aria-label={`${open ? "Hide" : "Show"} details for ${p.name}`}
                            onClick={() => setExpandedProjectId(open ? null : rowKey)}
                          >
                            <i
                              className={`ri-arrow-down-s-line text-[1.125rem] transition-transform ${
                                open ? "rotate-180" : ""
                              }`}
                              aria-hidden
                            />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className="progress progress-animate progress-xs flex-1"
                            role="progressbar"
                            aria-label={`${p.name} progress`}
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <span className="shrink-0 text-[0.75rem] font-medium tabular-nums">
                            {pct}%
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                            <i className="ri-checkbox-line text-[0.875rem]" aria-hidden />
                            <span className="tabular-nums">
                              {completed}/{total}
                            </span>{" "}
                            Tasks
                          </span>
                          <div className="ms-auto hidden md:flex">{avatars}</div>
                          <span className={`${getStatusBadgeClass(p.status)} shrink-0 md:ms-0 ms-auto`}>
                            {p.status}
                          </span>
                        </div>

                        {/* Tablet shows the due date inline; on phone it lives in the panel. */}
                        <div className="mt-2 hidden md:flex items-center gap-1 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                          <i className="ri-calendar-line text-[0.875rem]" aria-hidden />
                          {formatDate(p.endDate)}
                        </div>

                        <div
                          id={panelId}
                          hidden={!open}
                          className="md:hidden mt-3 border-t border-defaultborder dark:border-defaultborder/10 pt-3"
                        >
                          <dl className="mb-0 space-y-2 text-[0.75rem]">
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-[#8c9097] dark:text-white/50">Due Date</dt>
                              <dd className="mb-0 font-medium tabular-nums">{formatDate(p.endDate)}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-[#8c9097] dark:text-white/50">Assigned To</dt>
                              <dd className="mb-0">{avatars}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-[#8c9097] dark:text-white/50">Status</dt>
                              <dd className="mb-0">
                                <span className={getStatusBadgeClass(p.status)}>{p.status}</span>
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-[#8c9097] dark:text-white/50">Tasks</dt>
                              <dd className="mb-0 font-medium tabular-nums">
                                {completed}/{total}
                              </dd>
                            </div>
                          </dl>
                          {/* Same detail route project-list and my-projects already link to.
                              Skipped when the row has no id rather than linking nowhere. */}
                          {projectId && (
                            <Link
                              href={`/apps/projects/project-overview?id=${encodeURIComponent(projectId)}`}
                              className="mt-3 flex min-h-[2.75rem] w-full items-center justify-center rounded-md border border-primary/30 text-[0.8125rem] font-medium text-primary hover:bg-primary/5"
                            >
                              View Details
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                </>
              )}
            </div>
            {displayedProjects.length > 0 && (
              <div className="box-footer">
                {/* flex-wrap rather than sm:flex: on a phone the count and the pager
                    stack instead of forcing the footer wider than the card. */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="dark:text-defaulttextcolor/70">
                    Showing {projectSummaryPagination.entryCount} Entries{" "}
                    <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                  </div>
                  {projectSummaryPagination.totalPages > 1 && (
                    <div className="ms-auto">
                      <nav aria-label="Page navigation" className="pagination-style-4">
                        <ul className="ti-pagination mb-0 flex-wrap">
                          <li
                            className={`page-item${
                              projectSummaryPagination.page <= 1 ? " disabled" : ""
                            }`}
                          >
                            <button
                              type="button"
                              className="page-link"
                              onClick={() =>
                                setProjectPage((p) => Math.max(1, p - 1))
                              }
                              disabled={projectSummaryPagination.page <= 1}
                            >
                              Prev
                            </button>
                          </li>
                          {Array.from(
                            { length: projectSummaryPagination.totalPages },
                            (_, idx) => idx + 1
                          ).map((pageNum) => (
                            <li
                              key={pageNum}
                              className={`page-item${
                                pageNum === projectSummaryPagination.page
                                  ? " active"
                                  : ""
                              }`}
                            >
                              <button
                                type="button"
                                className="page-link"
                                onClick={() => setProjectPage(pageNum)}
                              >
                                {pageNum}
                              </button>
                            </li>
                          ))}
                          <li
                            className={`page-item${
                              projectSummaryPagination.page >=
                              projectSummaryPagination.totalPages
                                ? " disabled"
                                : ""
                            }`}
                          >
                            <button
                              type="button"
                              className={`page-link${
                                projectSummaryPagination.page <
                                projectSummaryPagination.totalPages
                                  ? " !text-primary"
                                  : ""
                              }`}
                              onClick={() =>
                                setProjectPage((p) =>
                                  Math.min(projectSummaryPagination.totalPages, p + 1)
                                )
                              }
                              disabled={
                                projectSummaryPagination.page >=
                                projectSummaryPagination.totalPages
                              }
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Job detail modal. The dead "stat box" modal that used to follow these two
          was removed: setStatBoxModal was only ever called with null, so no KPI card, row
          or control could open it — the state, its fetch effect and ~90 lines of markup
          were unreachable. */}
      {selectedJobDetail && (
        <JobDetailModal
          job={selectedJobDetail}
          applicantCount={applicantCountByJob[String(selectedJobDetail._id ?? selectedJobDetail.id ?? "")] ?? 0}
          onClose={() => setSelectedJobDetail(null)}
        />
      )}

      {/* Applicants modal (opened from a job's applicant count) */}
      {applicantsModal && (
        <ApplicantsModal
          jobTitle={applicantsModal.jobTitle}
          applicants={applicantsList}
          loading={applicantsLoading}
          onClose={() => setApplicantsModal(null)}
        />
      )}
    </Fragment>
  );
}
