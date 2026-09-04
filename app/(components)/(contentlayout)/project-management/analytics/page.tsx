"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePmRefetchOnFocus } from "@/shared/hooks/usePmRefetchOnFocus";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  listProjects,
  normalizeProjectPriority,
  getProjectProgress,
  type Project,
  type ProjectStatus,
} from "@/shared/lib/api/projects";
import {
  listTasks,
  getTaskId,
  getTaskProjectMeta,
  type Task,
  type TaskStatus,
  TASK_STATUS_LABELS,
} from "@/shared/lib/api/tasks";
import { listTeamGroups } from "@/shared/lib/api/projectTeams";
import * as XLSX from "xlsx";
import { addSheet, downloadWorkbook, fmtExportDate, fmtExportDateTime } from "@/shared/lib/xlsx-export";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  Inprogress: "In progress",
  "On hold": "On hold",
  completed: "Completed",
};

const CHART_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
];

const PM_SECTION_GAP = "mt-5";
const PM_PANEL_CLASS =
  "box custom-box flex h-full w-full flex-col rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10";
const PM_TWIN_BODY_CLASS = "box-body !p-0";
const PM_HEADER_BTN_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 dark:border-white/10 dark:bg-bodybg2 dark:text-slate-300 dark:hover:border-white dark:hover:text-white";
const PM_CHART_BODY_CLASS = "box-body px-4 pb-4 pt-2";
const PM_CHART_CONTENT_CLASS = "flex min-h-[280px] flex-col";
const PM_TABLE_CONTENT_CLASS = "px-4 pb-4 pt-3";
const PM_TABLE_SURFACE_CLASS =
  "overflow-hidden rounded-lg border border-defaultborder/70 bg-white dark:border-white/10 dark:bg-bodybg";
const PM_CARD_LINK_BTN = "ti-btn ti-btn-outline-secondary !mb-0 whitespace-nowrap !px-3 !py-1.5";

const TASK_CHART_LABELS: Record<TaskStatus, string> = {
  new: "New",
  todo: "To do",
  on_going: "On going",
  in_review: "In review",
  completed: "Completed",
};

const CHART_MUTED_FALLBACK = "rgb(140, 144, 151)";

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function countByStatus<T extends string>(
  items: Array<{ status: T }>,
  statuses: T[],
  labels: Record<T, string>
) {
  return statuses.map((status) => ({
    status,
    label: labels[status],
    count: items.filter((item) => item.status === status).length,
  }));
}

function chartMutedLabelColor(): string {
  if (typeof document === "undefined") return CHART_MUTED_FALLBACK;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim();
  return raw ? `rgb(${raw.replace(/\s+/g, ", ")})` : CHART_MUTED_FALLBACK;
}

function buildDonutChartOptions({
  labels,
  colors,
  centerTotal,
  centerLabel,
  tooltipItemLabel,
}: {
  labels: string[];
  colors: string[];
  centerTotal: number;
  centerLabel: string;
  tooltipItemLabel: string;
}) {
  const mutedLabel = chartMutedLabelColor();
  return {
    chart: {
      type: "donut" as const,
      fontFamily: "inherit",
      toolbar: { show: false },
      animations: { enabled: true, speed: 280, animateGradually: { enabled: true, delay: 80 } },
    },
    labels,
    colors,
    legend: {
      position: "bottom" as const,
      horizontalAlign: "center" as const,
      fontSize: "12px",
      fontWeight: 500,
      markers: { size: 6, strokeWidth: 0, offsetX: -2 },
      itemMargin: { horizontal: 10, vertical: 6 },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => (val > 0 ? (val < 1 ? "<1%" : `${Math.round(val)}%`) : ""),
      hideOverflowingLabels: false,
      dropShadow: { enabled: false },
      style: { fontSize: "11px", fontWeight: 600 },
    },
    stroke: { width: 3, colors: ["var(--custom-white)"] },
    plotOptions: {
      pie: {
        dataLabels: {
          hideOverflowingLabels: false,
        },
        donut: {
          size: "68%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "11px",
              fontWeight: 500,
              offsetY: -6,
              color: mutedLabel,
            },
            value: {
              show: true,
              fontSize: "22px",
              fontWeight: 700,
              offsetY: 4,
              formatter: (val: string) => val,
            },
            total: {
              show: true,
              showAlways: true,
              label: centerLabel,
              fontSize: "11px",
              fontWeight: 500,
              color: mutedLabel,
              formatter: () => String(centerTotal),
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} ${tooltipItemLabel}${val === 1 ? "" : "s"}`,
      },
    },
    states: {
      hover: { filter: { type: "lighten" as const, value: 0.06 } },
      active: { filter: { type: "none" as const } },
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: { height: 260 },
          legend: { fontSize: "11px", itemMargin: { horizontal: 6, vertical: 4 } },
        },
      },
    ],
  };
}

function getProjectOverviewStatusBadgeClass(status: ProjectStatus): string {
  if (status === "completed") return "bg-success/10 text-success";
  if (status === "On hold") return "bg-warning/10 text-warning";
  return "bg-primary/10 text-primary";
}

function getAtRiskStatusBadgeClass(status: ProjectStatus): string {
  if (status === "completed") return "border-success/20 bg-success/10 text-success";
  if (status === "On hold") return "border-warning/20 bg-warning/10 text-warning";
  return "border-danger/20 bg-danger/10 text-danger";
}

function getPriorityBadgeClass(priority: Project["priority"]): string {
  const pri = normalizeProjectPriority(priority);
  if (pri === "urgent") return "bg-danger/10 text-danger";
  if (pri === "high") return "bg-orange-500/10 text-orange-600";
  if (pri === "medium") return "bg-info/10 text-info";
  return "bg-success/10 text-success";
}

function zebraRowClass(index: number): string | undefined {
  return index % 2 === 1 ? "bg-slate-50/40 dark:bg-white/[0.02]" : undefined;
}

function DonutChartPanel({
  title,
  total,
  labels,
  series,
  centerLabel,
  tooltipItemLabel,
  emptyMessage,
  ariaLabel,
}: {
  title: string;
  total: number;
  labels: string[];
  series: number[];
  centerLabel: string;
  tooltipItemLabel: string;
  emptyMessage: string;
  ariaLabel: string;
}) {
  return (
    <div className="col-span-12 xl:col-span-6">
      <div className={PM_PANEL_CLASS}>
        <div className="box-header border-b border-defaultborder/60 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
          <h5 className="box-title mb-0">{title}</h5>
          <span className="text-[0.6875rem] font-medium tabular-nums text-defaulttextcolor/45">
            {total} total
          </span>
        </div>
        <div className={PM_CHART_BODY_CLASS}>
          <div className={PM_CHART_CONTENT_CLASS}>
            <DonutStatusChart
              labels={labels}
              series={series}
              colors={CHART_COLORS}
              centerTotal={total}
              centerLabel={centerLabel}
              tooltipItemLabel={tooltipItemLabel}
              emptyMessage={emptyMessage}
              ariaLabel={ariaLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DonutStatusChart({
  labels,
  series,
  colors,
  centerTotal,
  centerLabel,
  tooltipItemLabel,
  emptyMessage,
  ariaLabel,
}: {
  labels: string[];
  series: number[];
  colors: string[];
  centerTotal: number;
  centerLabel: string;
  tooltipItemLabel: string;
  emptyMessage: string;
  ariaLabel: string;
}) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const options = useMemo(
    () => buildDonutChartOptions({ labels, colors, centerTotal, centerLabel, tooltipItemLabel }),
    [labels, colors, centerTotal, centerLabel, tooltipItemLabel, isDark]
  );

  if (centerTotal === 0) {
    return (
      <div className="flex h-full min-h-[14rem] flex-1 items-center justify-center px-4 text-center text-[0.8125rem] text-defaulttextcolor/55">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-[280px] w-full flex-1 flex-col items-center justify-center"
      role="img"
      aria-label={ariaLabel}
    >
      <ReactApexChart
        key={isDark ? "dark" : "light"}
        type="donut"
        height={280}
        width="100%"
        options={options}
        series={series}
      />
    </div>
  );
}

function PmCompactTable({
  columns,
  children,
  emptyMessage,
  isEmpty,
}: {
  columns: string[];
  children: React.ReactNode;
  emptyMessage: string;
  isEmpty: boolean;
}) {
  if (isEmpty) {
    return (
      <div className="py-10 text-center text-[0.8125rem] text-defaulttextcolor/55">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={PM_TABLE_SURFACE_CLASS}>
      <div className="table-responsive max-h-[20rem] overflow-x-auto overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80 dark:[scrollbar-color:rgb(100_116_139)_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80">
        <table className="mb-0 min-w-full">
          <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-bodybg/95">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="border-b border-defaultborder/70 px-3 py-2.5 text-start text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-defaulttextcolor/50 dark:border-white/10"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-defaultborder/50 dark:divide-white/10">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function getProjectId(p: Project): string {
  return (p as Project & { id?: string }).id ?? p._id ?? "";
}

function joinNames(items: Array<{ name?: string } | undefined> | undefined): string {
  if (!items?.length) return "";
  return items
    .map((item) => item?.name?.trim())
    .filter(Boolean)
    .join("; ");
}

function getTaskProjectName(task: Task): string {
  const { embeddedName } = getTaskProjectMeta(task);
  return embeddedName ?? "";
}

type PmAnalyticsExportInput = {
  kpis: {
    totalProjects: number;
    totalTasks: number;
    taskCompletionPct: number;
    projectProgressPct: number;
    teamCount: number;
  };
  tasksByStatus: { label: string; count: number }[];
  projectsByStatus: { label: string; count: number }[];
  projects: Project[];
  overdueTasks: Task[];
  atRiskProjects: Project[];
};

function exportPmAnalyticsToExcel(input: PmAnalyticsExportInput) {
  const wb = XLSX.utils.book_new();
  const exportedAt = fmtExportDateTime(new Date());

  addSheet(wb, "Summary", ["Metric", "Value"], [
    ["Total Projects", input.kpis.totalProjects],
    ["Total Tasks", input.kpis.totalTasks],
    ["Task Completion %", input.kpis.taskCompletionPct],
    ["Project Progress %", input.kpis.projectProgressPct],
    ["Teams", input.kpis.teamCount],
    ["Overdue Tasks", input.overdueTasks.length],
    ["At-Risk Projects", input.atRiskProjects.length],
    ["Exported At (UTC)", exportedAt],
  ]);

  addSheet(
    wb,
    "Tasks by Status",
    ["Status", "Count"],
    input.tasksByStatus.map((row) => [row.label, row.count])
  );

  addSheet(
    wb,
    "Projects by Status",
    ["Status", "Count"],
    input.projectsByStatus.map((row) => [row.label, row.count])
  );

  addSheet(
    wb,
    "Projects Overview",
    [
      "Project Name",
      "Status",
      "Priority",
      "Progress %",
      "Completed Tasks",
      "Total Tasks",
      "Start Date (UTC)",
      "End Date (UTC)",
      "Project Manager",
      "Assigned Members",
      "Assigned Teams",
      "Tags",
    ],
    input.projects.map((project) => [
      project.name ?? "",
      PROJECT_STATUS_LABELS[project.status],
      normalizeProjectPriority(project.priority),
      getProjectProgress(project),
      project.completedTasks ?? 0,
      project.totalTasks ?? 0,
      fmtExportDate(project.startDate),
      fmtExportDate(project.endDate),
      project.projectManager ?? "",
      joinNames(project.assignedTo),
      joinNames(project.assignedTeams),
      (project.tags ?? []).join("; "),
    ])
  );

  addSheet(
    wb,
    "Overdue Tasks",
    ["Task Title", "Task Code", "Status", "Priority", "Due Date (UTC)", "Project", "Assignees"],
    input.overdueTasks.map((task) => [
      task.title ?? "",
      task.taskCode ?? "",
      TASK_STATUS_LABELS[task.status],
      task.priority ?? "",
      fmtExportDate(task.dueDate),
      getTaskProjectName(task),
      joinNames(task.assignedTo),
    ])
  );

  addSheet(
    wb,
    "At-Risk Projects",
    ["Project Name", "Status", "Priority", "End Date (UTC)", "Progress %", "Completed Tasks", "Total Tasks"],
    input.atRiskProjects.map((project) => [
      project.name ?? "",
      PROJECT_STATUS_LABELS[project.status],
      normalizeProjectPriority(project.priority),
      fmtExportDate(project.endDate),
      getProjectProgress(project),
      project.completedTasks ?? 0,
      project.totalTasks ?? 0,
    ])
  );

  downloadWorkbook(wb, `pm-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function StatCard({
  title,
  value,
  icon,
  iconBg,
}: {
  title: string;
  value: string | number;
  icon: string;
  iconBg: string;
}) {
  return (
    <div className="sm:col-span-6 xl:col-span-3 col-span-12 motion-safe:animate-pm-panel-in motion-reduce:animate-none">
      <div className="box custom-box overflow-hidden rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
        <div className="box-body flex items-center justify-between">
          <div>
            <p className="mb-1 text-[0.75rem] uppercase tracking-[0.08em] text-muted dark:text-white/55">{title}</p>
            <h4 className="mb-0 text-[1.45rem] font-semibold text-defaulttextcolor">{value}</h4>
          </div>
          <span className={`avatar avatar-md ${iconBg} text-white p-2 ring-4 ring-white/60 dark:ring-black/20`}>
            <i className={`${icon} text-[1.1rem] opacity-90`} />
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="sm:col-span-6 xl:col-span-3 col-span-12">
      <div className="box custom-box overflow-hidden rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
        <div className="box-body flex justify-between items-center">
          <div>
            <div className="mb-2 h-4 w-24 rounded bg-defaultborder/50 motion-safe:animate-pulse motion-reduce:animate-none" />
            <div className="h-8 w-16 rounded bg-defaultborder/50 motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="avatar avatar-md rounded-full bg-defaultborder/50 animate-pulse p-2" />
        </div>
      </div>
    </div>
  );
}

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    const fetchId = ++fetchIdRef.current;
    if (silent) {
      setRefetching(true);
    } else {
      setLoading(true);
      setError(null);
    }
    Promise.all([
      listProjects({ limit: 200 }),
      listTasks({ limit: 200 }),
      listTeamGroups({ limit: 200 }).catch(() => null),
    ])
      .then(([projRes, taskRes, teamRes]) => {
        if (fetchId !== fetchIdRef.current) return;
        setProjects(projRes.results ?? []);
        setTasks(taskRes.results ?? []);
        setTeamCount(
          teamRes ? teamRes.totalResults ?? (teamRes.results ?? []).length : 0
        );
      })
      .catch((err) => {
        if (fetchId !== fetchIdRef.current) return;
        if (silent) return;
        setProjects([]);
        setTasks([]);
        setTeamCount(0);
        setError(err instanceof Error ? err.message : "Failed to load analytics data.");
      })
      .finally(() => {
        if (fetchId !== fetchIdRef.current) return;
        if (silent) {
          setRefetching(false);
        } else {
          setLoading(false);
        }
      });
  }, []);

  const silentRefetch = useCallback(() => fetchData({ silent: true }), [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  usePmRefetchOnFocus(silentRefetch);

  const kpis = useMemo(() => {
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const taskCompletionPct =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalCompletedFromProjects = projects.reduce(
      (sum, p) => sum + (p.completedTasks ?? 0),
      0
    );
    const totalTaskSlots = projects.reduce(
      (sum, p) => sum + (p.totalTasks ?? 0),
      0
    );
    const projectProgressPct =
      totalTaskSlots > 0
        ? Math.round((totalCompletedFromProjects / totalTaskSlots) * 100)
        : 0;
    return {
      totalProjects,
      totalTasks,
      taskCompletionPct,
      projectProgressPct,
      teamCount,
    };
  }, [projects, tasks, teamCount]);

  const tasksByStatus = useMemo(
    () =>
      countByStatus(tasks, ["new", "todo", "on_going", "in_review", "completed"], TASK_CHART_LABELS),
    [tasks]
  );

  const projectsByStatus = useMemo(
    () => countByStatus(projects, ["Inprogress", "On hold", "completed"], PROJECT_STATUS_LABELS),
    [projects]
  );

  const overdueTasks = useMemo(() => {
    const today = startOfToday();
    return tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate).getTime() < today.getTime() &&
        t.status !== "completed"
    );
  }, [tasks]);

  const atRiskProjects = useMemo(() => {
    const today = startOfToday();
    return projects.filter(
      (p) =>
        p.endDate &&
        new Date(p.endDate).getTime() < today.getTime() &&
        p.status !== "completed"
    );
  }, [projects]);

  if (loading) {
    return (
      <Fragment>
        <Seo title="Analytics" />
        <div className="pb-10 sm:pb-12">
        <div className="mt-5 mb-6 sm:mt-6">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-200 pb-4 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Project analytics
              </span>
              <span className="hidden h-3 w-px bg-slate-300 sm:inline-block dark:bg-white/15" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Loading…</span>
            </div>
            <button
              type="button"
              disabled
              aria-label="Refreshing data"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 disabled:opacity-50 dark:border-white/10 dark:bg-bodybg2 dark:text-slate-300"
            >
              <i className="ri-refresh-line animate-spin" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-2 gap-y-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-12 gap-x-2 gap-y-6">
          <div className="xl:col-span-6 col-span-12">
            <div className="box">
              <div className="box-body flex items-center justify-center h-80">
                <div className="w-48 h-48 rounded-full bg-defaultborder/30 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="xl:col-span-6 col-span-12">
            <div className="box">
              <div className="box-body flex items-center justify-center h-80">
                <div className="w-48 h-48 rounded-full bg-defaultborder/30 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        </div>
      </Fragment>
    );
  }

  if (error) {
    return (
      <Fragment>
        <Seo title="Analytics" />
        <div className="pb-10 sm:pb-12">
          <div className="box custom-box">
            <div className="box-body py-10 text-center">
              <span className="avatar avatar-lg !rounded-full mb-3 inline-flex items-center justify-center bg-danger/10 text-danger">
                <i className="ri-error-warning-line text-[1.5rem]" />
              </span>
              <h6 className="mb-1 font-semibold">Couldn&apos;t load analytics</h6>
              <p className="mb-4 text-[#8c9097] dark:text-white/50">{error}</p>
              <button type="button" onClick={fetchData} className="ti-btn ti-btn-primary-full btn-wave">
                Try again
              </button>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Analytics" />
      <div className="pb-10 sm:pb-12">
      <div className="mt-5 mb-6 sm:mt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Project analytics
            </span>
            <span className="hidden h-3 w-px bg-slate-300 sm:inline-block dark:bg-white/15" />
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
                {kpis.totalProjects.toString().padStart(2, "0")}
              </span>
              <span className="text-slate-400">projects</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
                {kpis.totalTasks.toString().padStart(2, "0")}
              </span>
              <span className="text-slate-400">tasks</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="font-mono tabular-nums text-warning">
                {overdueTasks.length.toString().padStart(2, "0")}
              </span>
              <span className="text-slate-400">overdue</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={PM_HEADER_BTN_CLASS}
              onClick={() =>
                exportPmAnalyticsToExcel({
                  kpis,
                  tasksByStatus,
                  projectsByStatus,
                  projects,
                  overdueTasks,
                  atRiskProjects,
                })
              }
              title="Export to Excel"
            >
              <i className="ri-file-download-line" /> Export
            </button>
              <button
                type="button"
                onClick={silentRefetch}
                disabled={refetching}
                aria-label={refetching ? "Refreshing data" : "Refresh"}
                aria-busy={refetching}
                className={`${PM_HEADER_BTN_CLASS} disabled:opacity-60`}
              >
                <i className={`ri-refresh-line ${refetching ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-x-2 gap-y-6">
        <StatCard
          title="Total Projects"
          value={kpis.totalProjects}
          icon="ri-folder-open-line"
          iconBg="bg-primary"
        />
        <StatCard
          title="Total Tasks"
          value={kpis.totalTasks}
          icon="ri-task-line"
          iconBg="bg-info"
        />
        <StatCard
          title="Task completion"
          value={`${kpis.taskCompletionPct}%`}
          icon="ri-check-double-line"
          iconBg="bg-success"
        />
        <StatCard
          title="Teams"
          value={kpis.teamCount}
          icon="ri-team-line"
          iconBg="bg-warning"
        />
      </div>

      <div className={`${PM_SECTION_GAP} grid grid-cols-12 items-stretch gap-x-3 gap-y-4`}>
        <DonutChartPanel
          title="Tasks by status"
          total={kpis.totalTasks}
          labels={tasksByStatus.map((s) => s.label)}
          series={tasksByStatus.map((s) => s.count)}
          centerLabel="Tasks"
          tooltipItemLabel="task"
          emptyMessage="No tasks yet."
          ariaLabel={`Tasks by status. ${kpis.totalTasks} tasks total.`}
        />
        <DonutChartPanel
          title="Projects by status"
          total={kpis.totalProjects}
          labels={projectsByStatus.map((s) => s.label)}
          series={projectsByStatus.map((s) => s.count)}
          centerLabel="Projects"
          tooltipItemLabel="project"
          emptyMessage="No projects yet."
          ariaLabel={`Projects by status. ${kpis.totalProjects} projects total.`}
        />
      </div>

      <div className={`${PM_SECTION_GAP} grid grid-cols-12 gap-x-3 gap-y-4`}>
        <div className="col-span-12">
          <div className="box custom-box overflow-hidden rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
            <div className="box-header !py-2.5 sm:!py-3 border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/80 to-transparent dark:border-white/10 dark:from-white/[0.04]">
              <h5 className="box-title">Projects overview</h5>
              <Link
                href="/apps/projects/project-list"
                className={PM_CARD_LINK_BTN}
              >
                View all
              </Link>
            </div>
            <div className="box-body overflow-x-auto">
              {projects.length === 0 ? (
                <p className="text-[#8c9097] dark:text-white/50 text-center py-8">
                  No projects yet.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table mb-0 w-full min-w-full table-fixed whitespace-nowrap">
                    <colgroup>
                      <col className="w-[40%]" />
                      <col className="w-[14%]" />
                      <col className="w-[14%]" />
                      <col className="w-[22%]" />
                      <col className="w-[10%]" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Progress</th>
                        <th>Tasks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.slice(0, 10).map((p) => {
                        const total = p.totalTasks ?? 0;
                        const done = p.completedTasks ?? 0;
                        const pct = getProjectProgress(p);
                        return (
                          <tr key={getProjectId(p)}>
                            <td className="max-w-0 truncate" title={p.name}>
                              <Link
                                href={`/apps/projects/edit/${getProjectId(p)}`}
                                className="block truncate font-medium text-primary hover:underline"
                              >
                                {p.name}
                              </Link>
                            </td>
                            <td>
                              <span className={`badge ${getProjectOverviewStatusBadgeClass(p.status)}`}>
                                {PROJECT_STATUS_LABELS[p.status]}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${getPriorityBadgeClass(p.priority)}`}>
                                {normalizeProjectPriority(p.priority)}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="progress progress-xs w-24 flex-grow">
                                  <div
                                    className="progress-bar bg-primary"
                                    role="progressbar"
                                    style={{ width: `${pct}%` }}
                                    aria-valuenow={pct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  />
                                </div>
                                <span className="text-[0.75rem]">{pct}%</span>
                              </div>
                            </td>
                            <td>
                              {done} / {total}
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
        </div>
      </div>

      <div className={`${PM_SECTION_GAP} mb-2 grid grid-cols-12 items-stretch gap-x-3 gap-y-4`}>
        <div className="col-span-12 xl:col-span-6">
          <div className={PM_PANEL_CLASS}>
            <div className="box-header border-b border-defaultborder/60 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
              <h5 className="box-title mb-0">Overdue tasks</h5>
              <Link
                href="/task/kanban-board"
                className={PM_CARD_LINK_BTN}
              >
                View board
              </Link>
            </div>
            <div className={PM_TWIN_BODY_CLASS}>
              <div className={PM_TABLE_CONTENT_CLASS}>
                <PmCompactTable
                  columns={["Task", "Due date", "Status", "Project"]}
                  emptyMessage="No overdue tasks."
                  isEmpty={overdueTasks.length === 0}
                >
                  {overdueTasks.slice(0, 10).map((t, idx) => {
                    const projectName = getTaskProjectName(t);
                    return (
                      <tr key={getTaskId(t)} className={zebraRowClass(idx)}>
                        <td className="max-w-[12rem] px-3 py-2 align-middle">
                          <Link
                            href={`/task/task-details?taskId=${getTaskId(t)}`}
                            className="block truncate font-medium text-primary hover:underline"
                            title={t.title}
                          >
                            {t.title}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 align-middle text-[0.8125rem] tabular-nums text-defaulttextcolor/75">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span className="inline-flex rounded-full border border-danger/20 bg-danger/10 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-danger">
                            {TASK_STATUS_LABELS[t.status]}
                          </span>
                        </td>
                        <td className="max-w-[10rem] px-3 py-2 align-middle text-[0.8125rem] text-defaulttextcolor/70">
                          <span className="block truncate" title={projectName || undefined}>
                            {projectName || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </PmCompactTable>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-12 xl:col-span-6">
          <div className={PM_PANEL_CLASS}>
            <div className="box-header border-b border-defaultborder/60 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
              <h5 className="box-title mb-0">At-risk projects</h5>
              <Link
                href="/apps/projects/project-list"
                className={PM_CARD_LINK_BTN}
              >
                View all
              </Link>
            </div>
            <div className={PM_TWIN_BODY_CLASS}>
              <div className={PM_TABLE_CONTENT_CLASS}>
                <PmCompactTable
                  columns={["Project", "End date", "Status"]}
                  emptyMessage="No at-risk projects."
                  isEmpty={atRiskProjects.length === 0}
                >
                  {atRiskProjects.slice(0, 10).map((p, idx) => (
                    <tr key={getProjectId(p)} className={zebraRowClass(idx)}>
                      <td className="max-w-[12rem] px-3 py-2 align-middle">
                        <Link
                          href={`/apps/projects/edit/${getProjectId(p)}`}
                          className="block truncate font-medium text-primary hover:underline"
                          title={p.name}
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle text-[0.8125rem] tabular-nums text-defaulttextcolor/75">
                        {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold ${getAtRiskStatusBadgeClass(p.status)}`}
                        >
                          {PROJECT_STATUS_LABELS[p.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </PmCompactTable>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </Fragment>
  );
};

export default AnalyticsPage;
