import type { Task as ApiTask, TaskStatus } from "@/shared/lib/api/tasks";

export type Density = "compact" | "comfortable";
export type ViewMode = "board" | "list";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface DueFilter {
  preset?: "overdue" | "today" | "week" | "month";
  from?: string;
  to?: string;
}

export interface TaskFilters {
  q: string;
  projectIds: string[];
  assigneeIds: string[];
  statuses: TaskStatus[];
  priorities: Priority[];
  labels: string[];
  sprintIds: string[];
  createdByIds: string[];
  due: DueFilter | null;
  assignedToMe: boolean;
  unassigned: boolean;
  leaving: boolean;
}

export const EMPTY_FILTERS: TaskFilters = Object.freeze({
  q: "",
  projectIds: [],
  assigneeIds: [],
  statuses: [],
  priorities: [],
  labels: [],
  sprintIds: [],
  createdByIds: [],
  due: null,
  assignedToMe: false,
  unassigned: false,
  leaving: false,
});

export type TaskViewModel = ApiTask & {
  isOptimistic?: boolean;
  pendingPatchId?: string;
  serverUpdatedAt?: string;
  uiSelectionState?: "idle" | "selected";
};

export interface SavedView {
  id: string;
  name: string;
  filters: TaskFilters;
  view: ViewMode;
  density: Density;
  pinned?: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  source: "local" | "remote";
}

export type SavedViewInput = Omit<SavedView, "id" | "createdAt" | "updatedAt" | "source">;
export type DrawerMode = "create" | "edit" | null;
export type MutationKind =
  | "move"
  | "create"
  | "update"
  | "delete"
  | "comment"
  | "assign";

export interface OptimisticPatch {
  patchId: string;
  ts: number;
  kind: MutationKind;
  taskId?: string;
  patch: Partial<ApiTask> | { status: TaskStatus };
}

export type RealtimeEvent =
  | "task.created"
  | "task.updated"
  | "task.moved"
  | "task.deleted"
  | "task.commented";
