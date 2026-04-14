/**
 * PM query sync strategy (no TanStack Query in this repo):
 *
 * 1. After local mutations, callers invoke the same fetch/list function used on mount.
 * 2. `usePmRefetchOnFocus` re-runs that fetch when the tab becomes visible or the window gains focus
 *    so data changed elsewhere (or by the PM assistant) is picked up.
 * 3. Assistant-driven writes: after successful `apply`/`applyAssignmentRun`, navigate or call refetch
 *    on the affected project/task views.
 */
export const PM_QUERY_SYNC_STRATEGY_DOC = "refetch_on_mutate_and_focus";
