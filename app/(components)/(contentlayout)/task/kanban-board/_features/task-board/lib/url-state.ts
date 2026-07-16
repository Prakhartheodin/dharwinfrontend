import type { ReadonlyURLSearchParams } from "next/navigation";
import type { TaskStatus } from "@/shared/lib/api/tasks";
import type { DueFilter, Priority, TaskFilters } from "../types";
import { EMPTY_FILTERS } from "../types";
import {
  DUE_PRESETS,
  PRIORITY_SET,
  QUERY_ASSIGNED_TO_ME,
  QUERY_ASSIGNEE,
  QUERY_CREATED_BY,
  QUERY_DUE,
  QUERY_LABEL,
  QUERY_LEAVING,
  QUERY_PAGE,
  QUERY_PRIORITY,
  QUERY_PROJECT,
  QUERY_Q,
  QUERY_REASSIGNED,
  QUERY_SPRINT,
  QUERY_STATUS,
  QUERY_UNASSIGNED,
  STATUS_SET,
} from "./constants";

function splitCsv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseDue(raw: string | null): DueFilter | null {
  if (!raw) return null;
  const preset = DUE_PRESETS.find((p) => p === raw);
  if (preset) return { preset };
  const range = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(raw);
  if (range) return { from: range[1], to: range[2] };
  return null;
}

export function deserializeFilters(sp: ReadonlyURLSearchParams): TaskFilters {
  const statuses = splitCsv(sp.get(QUERY_STATUS)).filter((s): s is TaskStatus =>
    STATUS_SET.has(s as TaskStatus)
  );
  const priorities = splitCsv(sp.get(QUERY_PRIORITY)).filter(
    (p): p is Priority => PRIORITY_SET.has(p as Priority)
  );
  return {
    ...EMPTY_FILTERS,
    q: (sp.get(QUERY_Q) ?? "").trim(),
    projectIds: splitCsv(sp.get(QUERY_PROJECT)),
    assigneeIds: splitCsv(sp.get(QUERY_ASSIGNEE)),
    statuses,
    priorities,
    labels: splitCsv(sp.get(QUERY_LABEL)),
    sprintIds: splitCsv(sp.get(QUERY_SPRINT)),
    createdByIds: splitCsv(sp.get(QUERY_CREATED_BY)),
    due: parseDue(sp.get(QUERY_DUE)),
    assignedToMe: sp.get(QUERY_ASSIGNED_TO_ME) === "1",
    unassigned: sp.get(QUERY_UNASSIGNED) === "1",
    leaving: sp.get(QUERY_LEAVING) === "1",
    reassigned: sp.get(QUERY_REASSIGNED) === "1",
  };
}

/** Alias for provider / URL modules that expect `deserialize`. */
export const deserialize = deserializeFilters;

function sortedCopy(ids: string[]): string[] {
  return [...ids].map((s) => String(s)).filter(Boolean).sort();
}

function dueEqual(a: TaskFilters["due"], b: TaskFilters["due"]): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return (
    a.preset === b.preset &&
    a.from === b.from &&
    a.to === b.to
  );
}

/** Stable, fully-shaped `TaskFilters` (new object, copied arrays). */
export function normalize(raw: Partial<TaskFilters> | TaskFilters): TaskFilters {
  const q = typeof raw.q === "string" ? raw.q : "";
  return {
    ...EMPTY_FILTERS,
    ...raw,
    q: q.trim(),
    projectIds: sortedCopy(raw.projectIds ?? []),
    assigneeIds: sortedCopy(raw.assigneeIds ?? []),
    statuses: [...(raw.statuses ?? [])],
    priorities: [...(raw.priorities ?? [])],
    labels: sortedCopy(raw.labels ?? []),
    sprintIds: sortedCopy(raw.sprintIds ?? []),
    createdByIds: sortedCopy(raw.createdByIds ?? []),
    due: raw.due == null ? null : { ...raw.due },
    assignedToMe: raw.assignedToMe === true,
    unassigned: raw.unassigned === true,
    leaving: raw.leaving === true,
    reassigned: raw.reassigned === true,
  };
}

export function isEqual(a: TaskFilters, b: TaskFilters): boolean {
  return (
    a.q === b.q &&
    a.assignedToMe === b.assignedToMe &&
    a.unassigned === b.unassigned &&
    a.leaving === b.leaving &&
    a.reassigned === b.reassigned &&
    dueEqual(a.due, b.due) &&
    sortedCopy(a.projectIds).join("\0") === sortedCopy(b.projectIds).join("\0") &&
    sortedCopy(a.assigneeIds).join("\0") === sortedCopy(b.assigneeIds).join("\0") &&
    sortedCopy(a.statuses as unknown as string[]).join("\0") ===
      sortedCopy(b.statuses as unknown as string[]).join("\0") &&
    sortedCopy(a.priorities as unknown as string[]).join("\0") ===
      sortedCopy(b.priorities as unknown as string[]).join("\0") &&
    sortedCopy(a.labels).join("\0") === sortedCopy(b.labels).join("\0") &&
    sortedCopy(a.sprintIds).join("\0") === sortedCopy(b.sprintIds).join("\0") &&
    sortedCopy(a.createdByIds).join("\0") === sortedCopy(b.createdByIds).join("\0")
  );
}

export function serializeFilters(
  filters: TaskFilters
): Record<string, string> {
  const out: Record<string, string> = {};
  if (filters.q) out[QUERY_Q] = filters.q;
  if (filters.projectIds.length) out[QUERY_PROJECT] = filters.projectIds.join(",");
  if (filters.assigneeIds.length) out[QUERY_ASSIGNEE] = filters.assigneeIds.join(",");
  if (filters.statuses.length) out[QUERY_STATUS] = filters.statuses.join(",");
  if (filters.priorities.length) out[QUERY_PRIORITY] = filters.priorities.join(",");
  if (filters.labels.length) out[QUERY_LABEL] = filters.labels.join(",");
  if (filters.sprintIds.length) out[QUERY_SPRINT] = filters.sprintIds.join(",");
  if (filters.createdByIds.length) {
    out[QUERY_CREATED_BY] = filters.createdByIds.join(",");
  }
  if (filters.due?.preset) out[QUERY_DUE] = filters.due.preset;
  else if (filters.due?.from && filters.due?.to) {
    out[QUERY_DUE] = `${filters.due.from}..${filters.due.to}`;
  }
  if (filters.assignedToMe) out[QUERY_ASSIGNED_TO_ME] = "1";
  if (filters.unassigned) out[QUERY_UNASSIGNED] = "1";
  if (filters.leaving) out[QUERY_LEAVING] = "1";
  if (filters.reassigned) out[QUERY_REASSIGNED] = "1";
  return out;
}

/** Alias for provider modules that expect `serialize`. */
export const serialize = serializeFilters;

/**
 * Build URL search params from filters. Preserves orthogonal params such as
 * `editTaskId`. Does NOT preserve `?page=` because filter changes must reset
 * pagination to page 1 (P1.5 §5.6). The Data provider writes `?page=`
 * independently when page state changes.
 */
export function buildSearchParamsFromFilters(
  filters: TaskFilters,
  existing?: ReadonlyURLSearchParams
): URLSearchParams {
  const params = new URLSearchParams();
  if (existing) {
    const editId = existing.get("editTaskId");
    if (editId) params.set("editTaskId", editId);
  }
  for (const [k, v] of Object.entries(serializeFilters(filters))) {
    params.set(k, v);
  }
  return params;
}

/**
 * Parse `?page=N` from URL into a valid 1-indexed page number.
 * Aggressively clamps: NaN, negative, zero, non-integer → 1 (P1.5 §5.6).
 * Returns `{ page, reason }` where reason is non-null when clamping occurred
 * so callers can fire `taskboard.page_clamped` telemetry.
 */
export function parsePage(
  sp: ReadonlyURLSearchParams | URLSearchParams | null | undefined
): { page: number; clampedReason: "nan" | "negative" | "overflow" | null } {
  const raw = sp?.get(QUERY_PAGE);
  if (raw == null || raw === "") return { page: 1, clampedReason: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || Number.isNaN(n)) return { page: 1, clampedReason: "nan" };
  if (!Number.isInteger(n)) return { page: 1, clampedReason: "nan" };
  if (n < 1) return { page: 1, clampedReason: "negative" };
  return { page: n, clampedReason: null };
}

/**
 * Serialize a page number into URL form. Returns `undefined` for page=1
 * (omit param from URL by convention; canonical URL has no `?page=1`).
 */
export function serializePage(page: number): string | undefined {
  if (!Number.isInteger(page) || page < 2) return undefined;
  return String(page);
}
