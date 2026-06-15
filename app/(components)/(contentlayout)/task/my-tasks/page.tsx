"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePmRefetchOnFocus, PM_DATA_MUTATED_EVENT } from "@/shared/hooks/usePmRefetchOnFocus";
import Seo from "@/shared/layout-components/seo/seo";
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

const PAGE_SIZE = 15;

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "todo", label: "Todo" },
  { value: "on_going", label: "On going" },
  { value: "in_review", label: "In review" },
  { value: "completed", label: "Completed" },
];

const STATUS_FILTERS: Array<{ value: TaskStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "todo", label: "Todo" },
  { value: "on_going", label: "On going" },
  { value: "in_review", label: "Review" },
  { value: "completed", label: "Done" },
];

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "title", label: "A → Z" },
  { value: "-title", label: "Z → A" },
  { value: "dueDate", label: "Due (earliest)" },
  { value: "-dueDate", label: "Due (latest)" },
];

const STATUS_STRIP: Record<TaskStatus, string> = {
  new: "bg-slate-400",
  todo: "bg-primary",
  on_going: "bg-warning",
  in_review: "bg-info",
  completed: "bg-success",
};

const STATUS_TEXT: Record<TaskStatus, string> = {
  new: "text-slate-500",
  todo: "text-primary",
  on_going: "text-warning",
  in_review: "text-info",
  completed: "text-success",
};

const STATUS_DOT: Record<TaskStatus, string> = {
  new: "bg-slate-400",
  todo: "bg-primary",
  on_going: "bg-warning",
  in_review: "bg-info",
  completed: "bg-success",
};

function dueDatePillClass(dueDate: string | undefined, status: TaskStatus): string {
  if (status === "completed") return "bg-success/10 text-success";
  if (!dueDate) return "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400";
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "bg-slate-100 text-slate-500";
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "bg-danger/10 text-danger";
  if (diffDays === 0) return "bg-warning/10 text-warning";
  if (diffDays <= 3) return "bg-info/10 text-info";
  return "bg-success/10 text-success";
}

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  extraProjectNames?: Record<string, string>;
  extraProjectNamesStatus?: "idle" | "loading" | "done";
}

function TaskCard({
  task,
  onStatusChange,
  extraProjectNames = {},
  extraProjectNamesStatus = "idle",
}: TaskCardProps): JSX.Element {
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

  const handleStatusChange = async (next: TaskStatus): Promise<void> => {
    if (next === localStatus) return;
    setUpdating(true);
    const prev = localStatus;
    setLocalStatus(next);
    try {
      await onStatusChange(taskId, next);
    } catch {
      setLocalStatus(prev);
      Swal.fire("Error", "Failed to update task status.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const dueDateDisplay = formatDueDate(task.dueDate, task.status);
  const createdDisplay =
    formatCreatedDate(task.createdAt) || formatCreatedDate(task.updatedAt) || "—";
  const stripCls = STATUS_STRIP[localStatus] ?? "bg-slate-400";
  const statusTextCls = STATUS_TEXT[localStatus] ?? "text-slate-500";
  const statusDotCls = STATUS_DOT[localStatus] ?? "bg-slate-400";

  return (
    <div
      className={
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-white/10 dark:bg-bgdark2 dark:hover:border-white/20 " +
        (updating ? "opacity-70" : "")
      }
    >
      <span className={`absolute left-0 top-0 h-full w-[3px] ${stripCls}`} aria-hidden />

      <div className="px-5 pl-6 pt-5">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-1.5 w-1.5">
            {localStatus === "on_going" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
            )}
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${statusDotCls}`} />
          </span>
          <p className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${statusTextCls}`}>
            {TASK_STATUS_LABELS[localStatus] ?? localStatus}
          </p>
          {dueDateDisplay && (
            <span
              className={`ms-auto inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${dueDatePillClass(task.dueDate, localStatus)}`}
            >
              {dueDateDisplay}
            </span>
          )}
        </div>

        <h3 className="mt-2 text-base font-semibold leading-snug tracking-tight text-slate-900 dark:text-white">
          {task.title}
        </h3>

        {task.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
            {task.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs">
          <i className="ri-folder-line shrink-0 text-slate-400" aria-hidden />
          {resolvedProjectName ? (
            <span className="truncate font-medium text-slate-700 dark:text-slate-200" title={resolvedProjectName}>
              {resolvedProjectName}
            </span>
          ) : projectLineLoading ? (
            <span className="animate-pulse text-slate-400">Loading project…</span>
          ) : projectLineUnavailable ? (
            <span
              className="text-slate-400"
              title="Project may have been removed or you may no longer have access."
            >
              Project unavailable
            </span>
          ) : (
            <span className="text-slate-400" title="Link this task to a project when editing it.">
              Not linked to a project
            </span>
          )}
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                title={tag}
                className="inline-flex max-w-[8rem] truncate rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 dark:border-white/10 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-900">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 bg-white px-5 py-3 pl-6 dark:border-white/10 dark:bg-bgdark2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Status
          </span>
          <select
            value={localStatus}
            disabled={updating}
            onChange={(e) => void handleStatusChange(e.target.value as TaskStatus)}
            aria-label="Change task status"
            className="w-auto min-w-[6.5rem] max-w-[10rem] rounded-full border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold leading-tight text-slate-700 focus:border-slate-900 focus:outline-none disabled:opacity-50 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-200"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {updating && <i className="ri-loader-4-line animate-spin text-slate-400" />}
        </div>
        <div className="text-end">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Created
          </p>
          <p className="mt-0.5 font-mono text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-200">
            {createdDisplay}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-4 pl-6 pt-4">
        <TaskCommentsSection taskId={taskId} initialComments={task.comments} onCommentAdded={undefined} />
      </div>
    </div>
  );
}

export default function MyTasksPage(): JSX.Element {
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
    [sortBy, page]
  );

  useEffect(() => {
    fetchTasks({ page, sortBy, status: statusFilter });
  }, [sortBy, page, statusFilter, fetchTasks]);

  /** Resolve missing project names when tasks reference a project id without an embedded name. */
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
    const onPmMutate = (): void => {
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

  const summary = useMemo(() => {
    const c = { open: 0, active: 0, review: 0, done: 0 };
    for (const t of tasks) {
      switch (t.status) {
        case "new":
        case "todo":
          c.open += 1;
          break;
        case "on_going":
          c.active += 1;
          break;
        case "in_review":
          c.review += 1;
          break;
        case "completed":
          c.done += 1;
          break;
      }
    }
    return c;
  }, [tasks]);

  return (
    <Fragment>
      <Seo title="My Tasks" />
      <div className="relative px-4 py-5 md:px-8 md:py-6 max-w-[1600px] mx-auto">

        {/* HEADER — minimal inline bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              My tasks
            </span>
            <span className="hidden h-3 w-px bg-slate-300 sm:inline-block dark:bg-white/15" />
            <Stat label="Shown" value={tasks.length} />
            <Stat label="Open" value={summary.open} tone="primary" />
            <Stat label="Active" value={summary.active} tone="warning" />
            <Stat label="Review" value={summary.review} tone="info" />
            <Stat label="Done" value={summary.done} tone="success" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Dropdown
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={(v) => {
                setSortBy(v);
                setPage(1);
              }}
              ariaLabel="Sort tasks"
            />
            <button
              type="button"
              onClick={() => refetchVisible()}
              disabled={loading}
              aria-label="Refresh"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-50 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white dark:hover:text-white"
            >
              <i className={`ri-refresh-line ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* FILTER CHIPS */}
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => {
                  setPage(1);
                  setStatusFilter(f.value);
                }}
                className={
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition " +
                  (active
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white/30")
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* GRID */}
        {loading && tasks.length === 0 ? (
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
            role="status"
            aria-busy="true"
            aria-label="Loading tasks"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {tasks.map((task) => (
              <TaskCard
                key={getTaskId(task)}
                task={task}
                onStatusChange={handleStatusChange}
                extraProjectNames={extraProjectNames}
                extraProjectNamesStatus={extraProjectNamesStatus}
              />
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <nav aria-label="Page navigation" className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-40 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white/40 dark:hover:text-white"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ← Prev
            </button>
            <div className="hidden flex-wrap items-center gap-1 sm:flex">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                .reduce<Array<number | "…">>((acc, n, idx, arr) => {
                  const prev = arr[idx - 1];
                  if (typeof prev === "number" && n - prev > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === "…" ? (
                    <span key={`dots-${i}`} className="px-2 text-xs text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={
                        "min-w-[2rem] rounded-full px-2.5 py-1 font-mono text-xs tabular-nums transition " +
                        (n === page
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5")
                      }
                    >
                      {String(n).padStart(2, "0")}
                    </button>
                  )
                )}
            </div>
            <span className="font-mono text-xs text-slate-500 tabular-nums sm:hidden dark:text-slate-400">
              {String(page).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
            </span>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-40 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white/40 dark:hover:text-white"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next →
            </button>
          </nav>
        )}
      </div>
    </Fragment>
  );
}

/* ============================================================
   subcomponents — mirror project pages
============================================================ */

type StatTone = "slate" | "primary" | "info" | "warning" | "success";

const STAT_VALUE: Record<StatTone, string> = {
  slate: "text-slate-900 dark:text-white",
  primary: "text-primary",
  info: "text-info",
  warning: "text-warning",
  success: "text-success",
};

interface DropdownOption {
  value: string;
  label: string;
}

function Dropdown(props: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const current = props.options.find((o) => o.value === props.value) ?? props.options[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={props.ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-400 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-200 dark:hover:border-white/30"
      >
        <span>{current?.label ?? "Select"}</span>
        <i className={`ri-arrow-down-s-line text-sm transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-bgdark2"
        >
          {props.options.map((o) => {
            const active = o.value === props.value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  props.onChange(o.value);
                  setOpen(false);
                }}
                className={
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition " +
                  (active
                    ? "bg-slate-100 font-semibold text-slate-900 dark:bg-white/10 dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5")
                }
              >
                <span>{o.label}</span>
                {active && <i className="ri-check-line text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat(props: { label: string; value: number; tone?: StatTone }): JSX.Element {
  const tone = props.tone ?? "slate";
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
        {props.label}
      </span>
      <span className={`font-mono text-sm font-semibold tabular-nums ${STAT_VALUE[tone]}`}>
        {props.value.toString().padStart(2, "0")}
      </span>
    </span>
  );
}

function SkeletonCard(): JSX.Element {
  return (
    <div className="relative flex h-[280px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-bgdark2">
      <span className="absolute left-0 top-0 h-full w-[3px] bg-slate-200 dark:bg-white/10" />
      <div className="flex-1 animate-pulse space-y-3 p-5">
        <div className="h-2 w-16 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 dark:border-white/10 dark:bg-white/10">
        <div className="h-12 bg-white dark:bg-bgdark2" />
        <div className="h-12 bg-white dark:bg-bgdark2" />
      </div>
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/15 dark:bg-bgdark2 sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
        <i className="ri-task-line text-2xl text-slate-400" />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">
        You&apos;re all caught up
      </p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
        No tasks assigned to you right now. New work shows up here automatically.
      </p>
    </div>
  );
}
