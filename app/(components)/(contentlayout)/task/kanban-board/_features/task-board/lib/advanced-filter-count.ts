import type { TaskFilters } from "../types";

/** Count active advanced filters (priority + leaving). Excludes reassigned — main toolbar toggle. */
export function countAdvancedFilters(
  filters: Pick<TaskFilters, "priorities" | "leaving">
): number {
  return filters.priorities.length + (filters.leaving ? 1 : 0);
}
