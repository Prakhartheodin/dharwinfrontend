"use client";

import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { listProjects, type Project, type ProjectStatus } from "@/shared/lib/api/projects";
import { listTasks, type Task, type TaskStatus, TASK_STATUS_LABELS } from "@/shared/lib/api/tasks";
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

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamCount, setTeamCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listProjects({ limit: 500 }),
      listTasks({ limit: 2000 }),
      listTeamGroups({ limit: 200 }),
    ])
      .then(([projRes, taskRes, teamRes]) => {
        if (cancelled) return;
        setProjects(projRes.results ?? []);
        setTasks(taskRes.results ?? []);
        setTeamCount(teamRes.totalResults ?? (teamRes.results ?? []).length);
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([]);
          setTasks([]);
          setTeamCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (loading) {
    return (
      <Fragment>
        <Seo title="Analytics" />
        <Pageheader
          currentpage="Analytics"
          activepage="Project Management"
          mainpage="Analytics"
        />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <div className="box">
              <div className="box-body p-10 text-center text-[#8c9097] dark:text-white/50">
                Loading analytics...
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
    </Fragment>
  );
};

export default AnalyticsPage;
