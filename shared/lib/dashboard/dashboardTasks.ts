/**
 * Query shape and row classification for the dashboard's single task widget.
 *
 * One widget, not two. "Daily Tasks" and "Main Tasks" asked the same question of the
 * same array — open work assigned to me, ordered by when it is due — and rendered the
 * overlap twice, so they are merged here.
 *
 * The server returns open, assigned-to-me tasks. Mongo sorts missing due dates FIRST on
 * an ascending sort, so we over-fetch and re-order client-side: overdue first, then
 * upcoming by due date, then undated open tasks last.
 */
import type { Task, TaskStatus } from "@/shared/lib/api/tasks";
import { filterDueToday } from "@/shared/lib/dashboard/employeeDashboard";

/**
 * Everything that is not `completed`. Mirrors OPEN_TASK_STATUSES in the backend's
 * chatAssistant/taskAccess.js — kept as a literal list because the API takes a
 * comma-joined string, and an "all except completed" expression does not exist there.
 */
export const OPEN_TASK_STATUSES: TaskStatus[] = ["new", "todo", "on_going", "in_review"];

/** Comma-joined form for the `status` query param. */
export const OPEN_TASK_STATUS_PARAM = OPEN_TASK_STATUSES.join(",");

/** Rows the widget shows. Beyond this, the user goes to My Tasks. */
export const DASHBOARD_TASKS_LIMIT = 10;

/**
 * How many rows to fetch before client-side ordering. Mongo puts missing due dates
 * first on ascending sort, so we over-fetch and re-order locally.
 */
export const DASHBOARD_TASKS_FETCH_LIMIT = 200;

/** Server ordering hint: soonest due first, id as a stable tiebreak for equal due dates. */
export const DASHBOARD_TASKS_SORT = "dueDate:asc,_id:asc";

export type TaskDueBucket = "overdue" | "today" | "upcoming";

/** Local midnight for day-granularity comparison. Never a UTC string slice. */
function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Params for the single task request the dashboard makes.
 *
 * Includes undated tasks so the widget matches the My Tasks page scope. The widget
 * row cap is applied after client-side ordering via `prepareDashboardTasks`.
 */
export function dashboardTaskQuery(): {
  assignedToMe: true;
  status: string;
  sortBy: string;
  limit: number;
} {
  return {
    assignedToMe: true,
    status: OPEN_TASK_STATUS_PARAM,
    sortBy: DASHBOARD_TASKS_SORT,
    limit: DASHBOARD_TASKS_FETCH_LIMIT,
  };
}

/**
 * Which band a task falls in, by the VIEWER's calendar day.
 *
 * A task with no due date cannot be classified and is treated as upcoming.
 */
export function dueBucket(task: Task, now: Date = new Date()): TaskDueBucket {
  if (!task.dueDate) return "upcoming";
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return "upcoming";
  const today = startOfLocalDay(now);
  const day = startOfLocalDay(due);
  if (day < today) return "overdue";
  if (day === today) return "today";
  return "upcoming";
}

/** Whole days a task is past due; 0 when not overdue. */
export function daysOverdue(task: Task, now: Date = new Date()): number {
  if (!task.dueDate) return 0;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return 0;
  const diff = startOfLocalDay(now) - startOfLocalDay(due);
  return diff > 0 ? Math.round(diff / 86400000) : 0;
}

/**
 * Open tasks needing attention today — overdue plus due today, excluding completed.
 *
 * Delegates to the tested `filterDueToday` in employeeDashboard.ts rather than
 * reimplementing the local-date rule, so both dashboards agree on what "today" means.
 */
export function dueTodayOrOverdue(tasks: Task[], now: Date = new Date()): Task[] {
  return filterDueToday(tasks, now);
}

/**
 * Defensive client-side ordering, matching what the server was asked for.
 *
 * The response already arrives sorted; this guarantees the same order if the server
 * ignores sortBy, and keeps rendering stable while an optimistic toggle is in flight.
 */
export function sortByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const at = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const bt = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (at !== bt) return at - bt;
    return String(a._id ?? a.id ?? "").localeCompare(String(b._id ?? b.id ?? ""));
  });
}

/** Open tasks only. Completed rows are dropped by the query; this covers optimistic state. */
export function openOnly(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status !== "completed");
}

/** Open assigned tasks for the widget: overdue first, then by due date, undated last. */
export function prepareDashboardTasks(tasks: Task[]): Task[] {
  return sortByDueDate(openOnly(tasks)).slice(0, DASHBOARD_TASKS_LIMIT);
}
