import type { TaskStatus } from "@/shared/lib/api/tasks";
import type { Priority } from "../types";

export const STORAGE_KEY_PREFIX = "taskboard:v2";
export const STORAGE_KEY_SAVED_VIEWS = (userId: string) =>
  `${STORAGE_KEY_PREFIX}:views:${userId}`;
export const STORAGE_KEY_DENSITY = (userId: string) =>
  `${STORAGE_KEY_PREFIX}:density:${userId}`;
export const STORAGE_KEY_VIEW_MODE = (userId: string) =>
  `${STORAGE_KEY_PREFIX}:view:${userId}`;
export const STORAGE_KEY_LAST_FILTERS = (userId: string) =>
  `${STORAGE_KEY_PREFIX}:lastFilters:${userId}`;

/** Alias for filter persistence keys (same backing key as last-applied filters). */
export const STORAGE_KEY_FILTERS = STORAGE_KEY_LAST_FILTERS;

export const TASK_LIMIT = 200;
/** Page size for board-wide offset pagination (P1.5 §5). */
export const PAGE_LIMIT = 20;
export const VIRTUALIZATION_MIN_COUNT = 50;
export const DEBOUNCE_MS = 300;
export const MAX_SAVED_VIEWS = 50;
export const SAVED_VIEWS_SIZE_CAP_BYTES = 256 * 1024;

/** Matches V1 columns / API TaskStatus. */
export const STATUS_COLUMNS: Array<{
  status: TaskStatus;
  label: string;
  className: string;
}> = [
  { status: "new", label: "NEW", className: "new" },
  { status: "todo", label: "TODO", className: "todo" },
  { status: "on_going", label: "ON GOING", className: "in-progress" },
  { status: "in_review", label: "IN REVIEW", className: "inreview" },
  { status: "completed", label: "COMPLETED", className: "completed" },
];

export const STATUS_SET = new Set<TaskStatus>(STATUS_COLUMNS.map((c) => c.status));

export const QUERY_Q = "q";
export const QUERY_PROJECT = "project";
export const QUERY_STATUS = "status";
export const QUERY_PRIORITY = "priority";
export const QUERY_LABEL = "label";
export const QUERY_SPRINT = "sprint";
export const QUERY_ASSIGNEE = "assignee";
export const QUERY_CREATED_BY = "createdBy";
export const QUERY_DUE = "due";
export const QUERY_ASSIGNED_TO_ME = "assignedToMe";
export const QUERY_UNASSIGNED = "unassigned";
export const QUERY_LEAVING = "leaving";
export const QUERY_TASK_EDIT = "editTaskId";
/** Pagination URL param (P1.5 §5.6). */
export const QUERY_PAGE = "page";

export const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const PRIORITY_SET = new Set<Priority>(
  PRIORITY_OPTIONS.map((p) => p.value)
);

export const DUE_PRESETS = ["overdue", "today", "week", "month"] as const;
