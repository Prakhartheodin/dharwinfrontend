"use client";

import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect, useMemo, useCallback } from "react";
import { usePmRefetchOnFocus } from "@/shared/hooks/usePmRefetchOnFocus";
import dynamic from "next/dynamic";
import Link from "next/link";
import { listProjects, type Project, type ProjectStatus } from "@/shared/lib/api/projects";
import { listTasks, getTaskId, type Task, type TaskStatus, TASK_STATUS_LABELS } from "@/shared/lib/api/tasks";
import { listTeamGroups } from "@/shared/lib/api/projectTeams";

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

function getProjectId(p: Project): string {
  return (p as Project & { id?: string }).id ?? p._id ?? "";
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
    <div className="sm:col-span-6 xl:col-span-3 col-span-12">
      <div className="box">
        <div className="box-body flex justify-between items-center">
          <div>
            <p className="mb-1 text-[0.8125rem] text-defaulttextcolor/70">{title}</p>
            <h4 className="font-semibold mb-0 text-[1.5rem]">{value}</h4>
          </div>
          <span className={`avatar avatar-md ${iconBg} text-white p-2`}>
            <i className={`${icon} text-[1.25rem] opacity-80`} />
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="sm:col-span-6 xl:col-span-3 col-span-12">
      <div className="box">
        <div className="box-body flex justify-between items-center">
          <div>
            <div className="h-4 w-24 rounded bg-defaultborder/50 animate-pulse mb-2" />
            <div className="h-8 w-16 rounded bg-defaultborder/50 animate-pulse" />
          </div>
          <div className="avatar avatar-md rounded-full bg-defaultborder/50 animate-pulse p-2" />
        </div>
      </div>
    </div>
  );
}

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamCount, setTeamCount] = useState(0);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      listProjects({ limit: 500 }),
      listTasks({ limit: 2000 }),
      listTeamGroups({ limit: 200 }),
    ])
      .then(([projRes, taskRes, teamRes]) => {
        setProjects(projRes.results ?? []);
        setTasks(taskRes.results ?? []);
        setTeamCount(teamRes.totalResults ?? (teamRes.results ?? []).length);
      })
      .catch(() => {
        setProjects([]);
        setTasks([]);
        setTeamCount(0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  usePmRefetchOnFocus(fetchData);

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

  const tasksByStatus = useMemo(() => {
    const statuses: TaskStatus[] = [
      "new",
      "todo",
      "on_going",
      "in_review",
      "completed",
    ];
    const counts = statuses.map((s) => ({
      status: s,
      label: TASK_STATUS_LABELS[s],
      count: tasks.filter((t) => t.status === s).length,
    }));
    return counts;
  }, [tasks]);

  const projectsByStatus = useMemo(() => {
    const statuses: ProjectStatus[] = ["Inprogress", "On hold", "completed"];
    const counts = statuses.map((s) => ({
      status: s,
      label: PROJECT_STATUS_LABELS[s],
      count: projects.filter((p) => p.status === s).length,
    }));
    return counts;
  }, [projects]);

  const tasksChartOptions = useMemo(
    () => ({
      chart: { type: "donut" as const },
      labels: tasksByStatus.map((s) => s.label),
      colors: CHART_COLORS,
      legend: { position: "bottom" },
      dataLabels: { enabled: true },
      plotOptions: {
        pie: {
          donut: { size: "65%" },
        },
      },
    }),
    [tasksByStatus]
  );

  const tasksChartSeries = useMemo(
    () => tasksByStatus.map((s) => s.count),
    [tasksByStatus]
  );

  const projectsChartOptions = useMemo(
    () => ({
      chart: { type: "donut" as const },
      labels: projectsByStatus.map((s) => s.label),
      colors: CHART_COLORS,
      legend: { position: "bottom" },
      dataLabels: { enabled: true },
      plotOptions: {
        pie: {
          donut: { size: "65%" },
        },
      },
    }),
    [projectsByStatus]
  );

  const projectsChartSeries = useMemo(
    () => projectsByStatus.map((s) => s.count),
    [projectsByStatus]
  );

  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate).getTime() < today.getTime() &&
        t.status !== "completed"
    );
  }, [tasks]);

  const atRiskProjects = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
        <Pageheader
          currentpage="Analytics"
          activepage="Project Management"
          mainpage="Analytics"
        />
        <div className="flex justify-end mb-4">
          <button
            type="button"
            className="ti-btn ti-btn-sm ti-btn-light"
            disabled
            title="Refresh"
          >
            <i className="ri-refresh-line animate-spin" />
          </button>
        </div>
        <div className="grid grid-cols-12 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-12 gap-6 mt-6">
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
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Analytics" />
      <Pageheader
        currentpage="Analytics"
        activepage="Project Management"
        mainpage="Analytics"
      />
      <div className="flex justify-end gap-2 mb-4">
        <button
          type="button"
          className="ti-btn ti-btn-sm ti-btn-outline-secondary"
          onClick={() => {
            const rows: string[] = [
              "Projects Overview",
              "Project,Status,Priority,Progress,Tasks",
              ...projects.slice(0, 50).map((p) => {
                const total = p.totalTasks ?? 0;
                const done = p.completedTasks ?? 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return [p.name ?? "", PROJECT_STATUS_LABELS[p.status], p.priority ?? "", `${pct}%`, `${done}/${total}`].join(",");
              }),
              "",
              "Overdue Tasks",
              "Task,Due Date,Status,Project",
              ...overdueTasks.slice(0, 50).map((t) =>
                [
                  (t.title ?? "").replace(/"/g, '""'),
                  t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
                  TASK_STATUS_LABELS[t.status],
                  typeof t.projectId === "object" && t.projectId?.name ? (t.projectId.name ?? "").replace(/"/g, '""') : "",
                ].join(",")
              ),
              "",
              "At-Risk Projects",
              "Project,End Date,Status",
              ...atRiskProjects.slice(0, 50).map((p) =>
                [
                  (p.name ?? "").replace(/"/g, '""'),
                  p.endDate ? new Date(p.endDate).toLocaleDateString() : "",
                  PROJECT_STATUS_LABELS[p.status],
                ].join(",")
              ),
            ];
            const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
          title="Export to CSV"
        >
          <i className="ri-file-download-line me-1" /> Export
        </button>
        <button
          type="button"
          className="ti-btn ti-btn-sm ti-btn-light"
          onClick={fetchData}
          title="Refresh"
        >
          <i className="ri-refresh-line" />
        </button>
      </div>
      <div className="grid grid-cols-12 gap-6">
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

      <div className="grid grid-cols-12 gap-6 mt-6">
        <div className="xl:col-span-6 col-span-12">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title">Tasks by status</h5>
            </div>
            <div className="box-body">
              {tasks.length === 0 ? (
                <p className="text-[#8c9097] dark:text-white/50 text-center py-8">
                  No tasks yet.
                </p>
              ) : (
                <ReactApexChart
                  type="donut"
                  height={320}
                  options={tasksChartOptions}
                  series={tasksChartSeries}
                />
              )}
            </div>
          </div>
        </div>
        <div className="xl:col-span-6 col-span-12">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title">Projects by status</h5>
            </div>
            <div className="box-body">
              {projects.length === 0 ? (
                <p className="text-[#8c9097] dark:text-white/50 text-center py-8">
                  No projects yet.
                </p>
              ) : (
                <ReactApexChart
                  type="donut"
                  height={320}
                  options={projectsChartOptions}
                  series={projectsChartSeries}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mt-6">
        <div className="col-span-12">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title">Projects overview</h5>
              <Link
                href="/apps/projects/project-list"
                className="ti-btn ti-btn-sm ti-btn-primary"
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
                  <table className="table table-bordered whitespace-nowrap mb-0">
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
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                        return (
                          <tr key={getProjectId(p)}>
                            <td>
                              <Link
                                href={`/apps/projects/edit/${getProjectId(p)}`}
                                className="text-primary hover:underline font-medium"
                              >
                                {p.name}
                              </Link>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  p.status === "completed"
                                    ? "bg-success/10 text-success"
                                    : p.status === "On hold"
                                      ? "bg-warning/10 text-warning"
                                      : "bg-primary/10 text-primary"
                                }`}
                              >
                                {PROJECT_STATUS_LABELS[p.status]}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  p.priority === "High"
                                    ? "bg-danger/10 text-danger"
                                    : p.priority === "Medium"
                                      ? "bg-info/10 text-info"
                                      : "bg-success/10 text-success"
                                }`}
                              >
                                {p.priority}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="progress progress-xs flex-grow w-24">
                                  <div
                                    className="progress-bar bg-primary"
                                    style={{ width: `${pct}%` }}
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

      <div className="grid grid-cols-12 gap-6 mt-6">
        <div className="xl:col-span-6 col-span-12">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title">Overdue tasks</h5>
              <Link
                href="/task/kanban-board"
                className="ti-btn ti-btn-sm ti-btn-outline-secondary"
              >
                View board
              </Link>
            </div>
            <div className="box-body overflow-x-auto">
              {overdueTasks.length === 0 ? (
                <p className="text-[#8c9097] dark:text-white/50 text-center py-6">
                  No overdue tasks.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered whitespace-nowrap mb-0">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Due date</th>
                        <th>Status</th>
                        <th>Project</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueTasks.slice(0, 10).map((t) => (
                        <tr key={getTaskId(t)}>
                          <td>
                            <Link
                              href={`/task/task-details?taskId=${getTaskId(t)}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {t.title}
                            </Link>
                          </td>
                          <td>
                            {t.dueDate
                              ? new Date(t.dueDate).toLocaleDateString()
                              : "—"}
                          </td>
                          <td>
                            <span className="badge bg-danger/10 text-danger">
                              {TASK_STATUS_LABELS[t.status]}
                            </span>
                          </td>
                          <td>
                            {typeof t.projectId === "object" && t.projectId?.name
                              ? t.projectId.name
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="xl:col-span-6 col-span-12">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title">At-risk projects</h5>
              <Link
                href="/apps/projects/project-list"
                className="ti-btn ti-btn-sm ti-btn-outline-secondary"
              >
                View all
              </Link>
            </div>
            <div className="box-body overflow-x-auto">
              {atRiskProjects.length === 0 ? (
                <p className="text-[#8c9097] dark:text-white/50 text-center py-6">
                  No at-risk projects.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered whitespace-nowrap mb-0">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>End date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRiskProjects.slice(0, 10).map((p) => (
                        <tr key={getProjectId(p)}>
                          <td>
                            <Link
                              href={`/apps/projects/edit/${getProjectId(p)}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {p.name}
                            </Link>
                          </td>
                          <td>
                            {p.endDate
                              ? new Date(p.endDate).toLocaleDateString()
                              : "—"}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                p.status === "completed"
                                  ? "bg-success/10 text-success"
                                  : p.status === "On hold"
                                    ? "bg-warning/10 text-warning"
                                    : "bg-danger/10 text-danger"
                              }`}
                            >
                              {PROJECT_STATUS_LABELS[p.status]}
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
        </div>
      </div>
    </Fragment>
  );
};

export default AnalyticsPage;
