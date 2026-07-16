import type { Task, TaskStatus } from "@/shared/lib/api/tasks";
import type { DueFilter, TaskFilters } from "../types";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function taskDueDate(task: Task): Date | null {
  if (!task.dueDate) return null;
  const d = new Date(task.dueDate);
  return Number.isNaN(d.getTime()) ? null : d;
}

function matchesDue(task: Task, due: DueFilter): boolean {
  const d = taskDueDate(task);
  const today = startOfDay(new Date());
  if (due.preset === "overdue") {
    if (!d) return false;
    return d < today && task.status !== "completed";
  }
  if (!d) return false;
  const day = startOfDay(d);
  if (due.preset === "today") return day.getTime() === today.getTime();
  if (due.preset === "week") {
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    return day >= today && day <= end;
  }
  if (due.preset === "month") {
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    return day >= today && day <= end;
  }
  if (due.from && due.to) {
    const from = startOfDay(new Date(due.from));
    const to = startOfDay(new Date(due.to));
    return day >= from && day <= to;
  }
  return true;
}

function assigneeIds(task: Task): string[] {
  return (task.assignedTo ?? [])
    .map((u) => {
      if (!u) return "";
      if (typeof u === "string") return u;
      return String((u as { id?: string }).id ?? (u as { _id?: string })._id ?? "");
    })
    .filter(Boolean);
}

function assigneeSearchText(task: Task): string {
  return (task.assignedTo ?? [])
    .map((u) => (u ? `${u.name ?? ""} ${u.email ?? ""}` : ""))
    .join(" ")
    .toLowerCase();
}

function assigneeDirectorySearchText(task: Task): string {
  const employeeIds = (task.assigneeEmployeeIds ?? []).join(" ");
  const employeeNames = (task.assigneeEmployeeNames ?? []).join(" ");
  return `${employeeIds} ${employeeNames}`.toLowerCase().trim();
}

function createdById(task: Task): string | undefined {
  const u = task.createdBy;
  if (!u) return undefined;
  if (typeof u === "string") return u;
  return String((u as { id?: string }).id ?? (u as { _id?: string })._id ?? "");
}

function normalizeTaskPriority(raw: unknown): TaskFilters["priorities"][number] {
  const p = String(raw ?? "").trim().toLowerCase();
  if (!p) return "medium";
  if (p === "med") return "medium";
  return p as TaskFilters["priorities"][number];
}

function sprintIdOf(task: Task): string | undefined {
  const s = (task as Task & { sprintId?: unknown }).sprintId;
  if (!s) return undefined;
  if (typeof s === "string") return s;
  if (typeof s === "object" && s) {
    return String(
      (s as { id?: string }).id ?? (s as { _id?: string })._id ?? ""
    );
  }
  return undefined;
}

export function compilePredicate(filters: TaskFilters): (task: Task) => boolean {
  const q = filters.q.trim().toLowerCase();
  const statusSet =
    filters.statuses.length > 0 ? new Set<TaskStatus>(filters.statuses) : null;
  const prioritySet =
    filters.priorities.length > 0 ? new Set(filters.priorities) : null;
  const labelSet = filters.labels.length > 0 ? new Set(filters.labels) : null;
  const sprintSet =
    filters.sprintIds.length > 0 ? new Set(filters.sprintIds) : null;
  const assigneeSet =
    filters.assigneeIds.length > 0 ? new Set(filters.assigneeIds) : null;
  const createdBySet =
    filters.createdByIds.length > 0 ? new Set(filters.createdByIds) : null;

  return (task: Task) => {
    if (q) {
      const title = (task.title ?? "").toLowerCase();
      const desc = String(task.description ?? "").toLowerCase();
      const code = String(task.taskCode ?? "").toLowerCase();
      const assignees = assigneeSearchText(task);
      const directory = assigneeDirectorySearchText(task);
      if (
        !title.includes(q) &&
        !desc.includes(q) &&
        !code.includes(q) &&
        !assignees.includes(q) &&
        !directory.includes(q)
      ) {
        return false;
      }
    }
    if (statusSet && !statusSet.has(task.status)) return false;
    if (prioritySet) {
      const p = normalizeTaskPriority((task as Task & { priority?: string }).priority);
      if (!prioritySet.has(p as TaskFilters["priorities"][number])) return false;
    }
    if (labelSet) {
      const tags = task.tags ?? [];
      if (!tags.some((t) => labelSet.has(t))) return false;
    }
    if (sprintSet) {
      const sid = sprintIdOf(task);
      if (!sid || !sprintSet.has(sid)) return false;
    }
    if (filters.unassigned && assigneeIds(task).length > 0) return false;
    if (assigneeSet) {
      const ids = assigneeIds(task);
      if (!ids.some((id) => assigneeSet.has(id))) return false;
    }
    if (createdBySet) {
      const cid = createdById(task);
      if (!cid || !createdBySet.has(cid)) return false;
    }
    if (filters.due && !matchesDue(task, filters.due)) return false;
    if (filters.leaving && !task.offboardingFlag) return false;
    if (filters.reassigned && (task.formerAssignees?.length ?? 0) === 0) return false;
    return true;
  };
}

export function applyClientFilters(tasks: Task[], filters: TaskFilters): Task[] {
  const pred = compilePredicate(filters);
  return tasks.filter(pred);
}
