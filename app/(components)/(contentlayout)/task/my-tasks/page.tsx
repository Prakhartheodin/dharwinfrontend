"use client";

import React, { Fragment, useState, useEffect, useCallback } from "react";
import { usePmRefetchOnFocus, PM_DATA_MUTATED_EVENT } from "@/shared/hooks/usePmRefetchOnFocus";
import Seo from "@/shared/layout-components/seo/seo";
import dynamic from "next/dynamic";
import Swal from "sweetalert2";
import {
  listMyAssignedTasks,
  updateTaskStatus,
  getTaskId,
  getTaskProjectMeta,
  formatDueDate,
  formatCreatedDate,
  type Task,
  type TaskStatus,
  TASK_STATUS_LABELS,
} from "@/shared/lib/api/tasks";
import { getProjectById } from "@/shared/lib/api/projects";
import { TaskCommentsSection } from "../TaskCommentsSection";

const Select = dynamic(() => import("react-select"), { ssr: false });

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "new", label: "NEW" },
  { value: "todo", label: "TODO" },
  { value: "on_going", label: "ON GOING" },
  { value: "in_review", label: "IN REVIEW" },
  { value: "completed", label: "COMPLETED" },
];

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "title", label: "A - Z" },
  { value: "-title", label: "Z - A" },
  { value: "dueDate", label: "Due Date (earliest)" },
  { value: "-dueDate", label: "Due Date (latest)" },
];

const PAGE_SIZE = 15;

function statusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success";
    case "in_review":
      return "bg-info/10 text-info";
    case "on_going":
      return "bg-warning/10 text-warning";
    case "todo":
      return "bg-primary/10 text-primary";
    case "new":
      return "bg-secondary/10 text-secondary";
    default:
      return "bg-secondary/10 text-secondary";
  }
}

function dueDateBadgeClass(dueDate: string | undefined, status: TaskStatus): string {
  if (status === "completed") return "bg-success/10 text-success";
  if (!dueDate) return "bg-secondary/10 text-secondary";
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "bg-secondary/10 text-secondary";
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "bg-danger/10 text-danger";
  if (diffDays === 0) return "bg-warning/10 text-warning";
  if (diffDays <= 3) return "bg-info/10 text-info";
  return "bg-success/10 text-success";
}

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  /** Staggered list entrance (matches project cards). */
  staggerIndex?: number;
  /** Names for tasks whose API payload had a project id but no embedded name */
  extraProjectNames?: Record<string, string>;
  /** Whether the optional batch project-name fetch has finished */
  extraProjectNamesStatus?: "idle" | "loading" | "done";
}

function TaskCardSkeletonTile() {
  return (
    <div className="xxl:col-span-4 xl:col-span-6 col-span-12">
      <div className="box custom-box flex h-full min-h-[220px] flex-col overflow-hidden rounded-xl border border-defaultborder/70 shadow-sm dark:border-white/10">
        <div className="border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/80 to-white px-3 py-3 dark:border-white/10 dark:from-white/[0.03] dark:to-transparent sm:px-4">
          <div className="mb-2.5 h-4 max-w-[85%] rounded-md bg-defaultborder/50 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="mb-1.5 h-3 w-full rounded-md bg-defaultborder/40 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-3 w-2/3 rounded-md bg-defaultborder/35 motion-safe:animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="flex flex-1 flex-col gap-2.5 px-3 py-2.5 sm:px-4">
          <div className="h-9 w-full rounded-lg bg-defaultborder/40 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="mt-auto space-y-2">
            <div className="h-3 w-20 rounded bg-defaultborder/40 motion-safe:animate-pulse motion-reduce:animate-none" />
            <div className="h-16 w-full rounded-lg bg-defaultborder/30 motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
  staggerIndex = 0,
  extraProjectNames = {},
  extraProjectNamesStatus = "idle",
}: TaskCardProps) {
  const taskId = getTaskId(task);
  const [updating, setUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<TaskStatus>(task.status);
  const projectMeta = getTaskProjectMeta(task);
  const needsProjectNameFetch = Boolean(projectMeta.projectId && !projectMeta.embeddedName);
  const resolvedProjectName =
    projectMeta.embeddedName ||
    (projectMeta.projectId ? extraProjectNames[projectMeta.projectId] : undefined);
  const projectLineLoading =
    needsProjectNameFetch && !resolvedProjectName && extraProjectNamesStatus !== "done";
  const projectLineUnavailable =
    needsProjectNameFetch && extraProjectNamesStatus === "done" && !resolvedProjectName;

  useEffect(() => {
    setLocalStatus(task.status);
  }, [task.status]);

  const handleStatusChange = async (opt: { value: TaskStatus; label: string } | null) => {
    if (!opt || opt.value === localStatus) return;
    setUpdating(true);
    try {
      await onStatusChange(taskId, opt.value);
      setLocalStatus(opt.value);
    } catch {
      Swal.fire("Error", "Failed to update task status.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const currentStatusOption = STATUS_OPTIONS.find((o) => o.value === localStatus) ?? STATUS_OPTIONS[0];
  const dueDateDisplay = formatDueDate(task.dueDate, task.status);
  const createdDisplay =
    formatCreatedDate(task.createdAt) || formatCreatedDate(task.updatedAt) || "—";

  return (
    <div
      className="box custom-box group flex h-full flex-col overflow-hidden rounded-xl border border-defaultborder/70 shadow-sm transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md dark:border-white/10 motion-safe:animate-pm-panel-in motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ animationDelay: `${Math.min(staggerIndex, 24) * 48}ms` }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/30 px-3 py-3 sm:gap-3 sm:px-4 dark:border-white/10 dark:from-white/[0.04] dark:via-transparent dark:to-transparent">
        <div className="min-w-0">
          <p className="mb-0.5 text-[0.9375rem] font-semibold leading-snug text-defaulttextcolor">{task.title}</p>
          {task.description ? (
            <p className="mb-1.5 line-clamp-2 text-[0.8125rem] leading-snug text-muted dark:text-white/50">{task.description}</p>
          ) : null}
          <div className="mt-0.5 flex min-w-0 items-start gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/10">
              <i className="ri-folder-line text-base text-primary" aria-hidden />
            </span>
            {resolvedProjectName ? (
              <span
                className="min-w-0 truncate pt-0.5 text-[0.75rem] font-medium leading-snug text-defaulttextcolor/85 dark:text-white/65"
                title={resolvedProjectName}
              >
                {resolvedProjectName}
              </span>
            ) : projectLineLoading ? (
              <span className="min-w-0 pt-0.5 text-[0.75rem] leading-snug text-muted motion-safe:animate-pulse motion-reduce:animate-none dark:text-white/45">
                Loading project…
              </span>
            ) : projectLineUnavailable ? (
              <span
                className="min-w-0 pt-0.5 text-[0.75rem] leading-snug text-muted dark:text-white/45"
                title="The project may have been removed or you may no longer have access."
              >
                Project unavailable
              </span>
            ) : (
              <span
                className="min-w-0 pt-0.5 text-[0.75rem] leading-snug text-muted dark:text-white/45"
                title="Link this task to a project when editing it so others can find it in context."
              >
                Not linked to a project
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {dueDateDisplay ? (
            <span className={`badge shrink-0 ${dueDateBadgeClass(task.dueDate, task.status)}`}>{dueDateDisplay}</span>
          ) : null}
          {task.tags && task.tags.length > 0 ? (
            <div className="flex max-w-[10rem] flex-wrap justify-end gap-1">
              {task.tags.slice(0, 2).map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex max-w-full truncate rounded-md border border-defaultborder/60 bg-defaultbackground/80 px-1.5 py-0.5 text-[0.625rem] font-medium text-defaulttextcolor/80 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
              {task.tags.length > 2 ? (
                <span className="inline-flex rounded-md border border-defaultborder/60 bg-defaultbackground/80 px-1.5 py-0.5 text-[0.625rem] font-medium text-muted dark:border-white/10">
                  +{task.tags.length - 2}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-b border-defaultborder/50 bg-[rgb(var(--default-background))]/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-muted dark:text-white/45">
            Status
          </span>
          <Select
            options={STATUS_OPTIONS}
            value={currentStatusOption}
            onChange={handleStatusChange}
            isDisabled={updating}
            className="min-w-0 !min-w-[8.5rem] flex-1 sm:!max-w-[11rem]"
            classNamePrefix="Select2"
            placeholder="Change status"
            menuPlacement="auto"
            menuPosition="fixed"
            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 13050 }),
              control: (base) => ({ ...base, minHeight: 40 }),
            }}
          />
        </div>
        <div className="flex shrink-0 flex-col gap-0.5 border-t border-defaultborder/40 pt-2 text-end sm:ml-auto sm:border-t-0 sm:pt-0 dark:border-white/10">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted dark:text-white/45">Created</span>
          <span className="text-[0.8125rem] font-semibold tabular-nums text-defaulttextcolor">{createdDisplay}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-2 sm:px-4 sm:pb-3.5 sm:pt-2.5">
        <TaskCommentsSection taskId={taskId} initialComments={task.comments} onCommentAdded={undefined} />
      </div>
    </div>
  );
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("-createdAt");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [extraProjectNames, setExtraProjectNames] = useState<Record<string, string>>({});
  const [extraProjectNamesStatus, setExtraProjectNamesStatus] = useState<"idle" | "loading" | "done">("idle");

  const fetchTasks = useCallback(
    async (params?: { page?: number; sortBy?: string; status?: TaskStatus | "" }) => {
      setLoading(true);
      try {
        const result = await listMyAssignedTasks({
          sortBy: params?.sortBy ?? sortBy,
          page: params?.page ?? page,
          limit: PAGE_SIZE,
          ...(params?.status && params.status !== "" ? { status: params.status } : {}),
        });
        setTasks(result.results ?? []);
        setTotalPages(result.totalPages ?? 0);
        if (params?.page !== undefined) setPage(params.page);
      } catch {
        setTasks([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [sortBy, page, statusFilter]
  );

  useEffect(() => {
    fetchTasks({ page, sortBy, status: statusFilter });
  }, [sortBy, page, statusFilter]);

  /** Resolve project titles when the list returns a project id without an embedded name (common with older tasks). */
  useEffect(() => {
    if (loading) return;
    const ids = new Set<string>();
    for (const t of tasks) {
      const { projectId, embeddedName } = getTaskProjectMeta(t);
      if (projectId && !embeddedName) ids.add(projectId);
    }
    if (ids.size === 0) {
      setExtraProjectNames({});
      setExtraProjectNamesStatus("done");
      return;
    }
    let cancelled = false;
    setExtraProjectNames({});
    setExtraProjectNamesStatus("loading");
    (async () => {
      const entries = await Promise.all(
        [...ids].map(async (id) => {
          try {
            const p = await getProjectById(id);
            const n = typeof p?.name === "string" ? p.name.trim() : "";
            return [id, n] as const;
          } catch {
            return [id, ""] as const;
          }
        })
      );
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [id, n] of entries) {
        if (n) next[id] = n;
      }
      setExtraProjectNames(next);
      setExtraProjectNamesStatus("done");
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, tasks]);

  const refetchVisible = useCallback(() => {
    fetchTasks({ page, sortBy, status: statusFilter });
  }, [fetchTasks, page, sortBy, statusFilter]);

  usePmRefetchOnFocus(refetchVisible);

  useEffect(() => {
    const onPmMutate = () => {
      refetchVisible();
    };
    window.addEventListener(PM_DATA_MUTATED_EVENT, onPmMutate);
    return () => window.removeEventListener(PM_DATA_MUTATED_EVENT, onPmMutate);
  }, [refetchVisible]);

  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      await updateTaskStatus(taskId, status);
      await Swal.fire("Updated", "Task status has been updated.", "success");
      fetchTasks({ page, sortBy, status: statusFilter });
    },
    [fetchTasks, page, sortBy, statusFilter]
  );

  const handleSortChange = (opt: { value: string; label: string } | null) => {
    if (opt) {
      setSortBy(opt.value);
      setPage(1);
    }
  };

  const handleStatusFilterChange = (opt: { value: TaskStatus | ""; label: string } | null) => {
    if (opt !== null) {
      setStatusFilter(opt.value);
      setPage(1);
    }
  };

  const currentSortOption = SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[0];
  const statusFilterOptions = [
    { value: "", label: "All Statuses" },
    ...STATUS_OPTIONS,
  ];
  const currentStatusFilterOption = statusFilterOptions.find((o) => o.value === statusFilter) ?? statusFilterOptions[0];

  return (
    <Fragment>
      <Seo title="My Tasks" />
      <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
        <div className="col-span-12 space-y-6">
          <div className="box custom-box rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
            <div className="border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/40 px-4 py-4 sm:px-5 dark:border-white/10 dark:from-white/[0.04] dark:via-transparent dark:to-transparent">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="mb-0 text-[0.8125rem] text-muted dark:text-white/50">
                  Tasks assigned to you. You can update the status of each task.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    name="status-filter"
                    options={statusFilterOptions}
                    className="!w-40 min-w-[10rem]"
                    menuPlacement="auto"
                    menuPosition="fixed"
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 13050 }) }}
                    classNamePrefix="Select2"
                    placeholder="Filter by status"
                    value={currentStatusFilterOption}
                    onChange={(opt) => handleStatusFilterChange(opt as { value: TaskStatus | ""; label: string } | null)}
                  />
                  <Select
                    name="sort"
                    options={SORT_OPTIONS}
                    className="!w-48 min-w-[12rem]"
                    menuPlacement="auto"
                    menuPosition="fixed"
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 13050 }) }}
                    classNamePrefix="Select2"
                    placeholder="Sort By"
                    value={currentSortOption}
                    onChange={(opt) => handleSortChange(opt as { value: string; label: string } | null)}
                  />
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div
              className="grid grid-cols-12 gap-6"
              role="status"
              aria-busy="true"
              aria-label="Loading tasks"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <TaskCardSkeletonTile key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              {tasks.map((task, i) => (
                <div key={getTaskId(task)} className="xxl:col-span-4 xl:col-span-6 col-span-12">
                  <TaskCard
                    staggerIndex={i}
                    task={task}
                    onStatusChange={handleStatusChange}
                    extraProjectNames={extraProjectNames}
                    extraProjectNamesStatus={extraProjectNamesStatus}
                  />
                </div>
              ))}
            </div>
          )}

          {!loading && tasks.length === 0 && (
            <div className="box custom-box motion-safe:animate-pm-panel-in motion-reduce:animate-none rounded-xl border border-dashed border-defaultborder/80 bg-gradient-to-br from-slate-50/80 via-white to-primary/[0.03] px-6 py-12 text-center shadow-sm dark:border-white/15 dark:from-white/[0.03] dark:via-transparent dark:to-primary/[0.04]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
                <i className="ri-task-line text-2xl text-primary" aria-hidden />
              </div>
              <p className="mb-1 text-[0.9375rem] font-semibold text-defaulttextcolor">You&apos;re all caught up</p>
              <p className="mb-0 text-[0.8125rem] text-muted dark:text-white/50">
                No tasks are assigned to you right now. New work will show up here automatically.
              </p>
            </div>
          )}

          {totalPages > 1 && (
        <div className="flex justify-end">
        <nav aria-label="Page navigation">
          <ul className="ti-pagination ltr:float-right rtl:float-left mb-0">
            <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link px-3 py-[0.375rem]"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                <button
                  type="button"
                  className="page-link px-3 py-[0.375rem]"
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              </li>
            ))}
            <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link px-3 py-[0.375rem]"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
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
    </Fragment>
  );
}
