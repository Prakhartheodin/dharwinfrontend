"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Task, TaskStatus } from "@/shared/lib/api/tasks";
import {
  getTaskId,
  listTasks,
} from "@/shared/lib/api/tasks";
import {
  PM_DATA_MUTATED_EVENT,
  usePmRefetchOnFocus,
} from "@/shared/hooks/usePmRefetchOnFocus";
import {
  PAGE_LIMIT,
  QUERY_PAGE,
  STATUS_COLUMNS,
  TASK_LIMIT,
} from "../lib/constants";
import { fetchBoardMetadata, type ProjectRow, type UserRow } from "../lib/fetch-board-metadata";
import { useAuth } from "@/shared/contexts/auth-context";
import { taskBoardScopeToAssignedOnly } from "../lib/task-board-capabilities";
import { getErrorMessage } from "../lib/errors";
import { isEqual, parsePage, serializePage } from "../lib/url-state";
import type {
  OptimisticPatch,
  TaskFilters,
  TaskViewModel,
} from "../types";
import { useTaskFilters } from "./TaskFiltersProvider";
import { trackTaskBoard } from "../lib/telemetry";

export type { ProjectRow, UserRow };

type TaskDataState = {
  tasks: TaskViewModel[];
  serverSnapshot: Record<string, Task>;
  projects: ProjectRow[];
  users: UserRow[];
  activePatches: Record<string, OptimisticPatch>;
};

const initialState = (): TaskDataState => ({
  tasks: [],
  serverSnapshot: {},
  projects: [],
  users: [],
  activePatches: {},
});

type TaskDataAction =
  | { type: "APPLY_PATCH"; payload: OptimisticPatch }
  | { type: "RECONCILE"; payload: { tasks: Task[] } }
  | { type: "REVERT"; payload: { patchId: string } }
  | { type: "EVICT_STALE"; payload: { maxAgeMs: number } }
  | { type: "SET_PROJECTS_USERS"; payload: { projects: ProjectRow[]; users: UserRow[] } }
  | { type: "REORDER_IN_COLUMN"; payload: { activeId: string; overId: string } };

function dispatchRollback(taskId?: string) {
  if (typeof window !== "undefined" && taskId) {
    trackTaskBoard("taskboard.optimistic_rollback", { taskId });
    window.dispatchEvent(new CustomEvent("taskboard.optimistic_rollback", { detail: { taskId } }));
  }
}

function revertState(state: TaskDataState, patchId: string): TaskDataState {
  const patch = state.activePatches[patchId];
  if (!patch) return state;
  dispatchRollback(patch.taskId);
  const nextActive = { ...state.activePatches };
  delete nextActive[patchId];

  if (patch.kind === "create") {
    const tid = patch.taskId;
    return {
      ...state,
      activePatches: nextActive,
      tasks: state.tasks.filter((t) => {
        if (t.pendingPatchId === patchId) return false;
        if (tid && getTaskId(t) === tid) return false;
        return true;
      }),
    };
  }

  if (patch.kind === "delete") {
    const sid = patch.taskId;
    if (!sid) return { ...state, activePatches: nextActive };
    const baseline = state.serverSnapshot[sid];
    if (!baseline) return { ...state, activePatches: nextActive };
    const exists = state.tasks.some((t) => getTaskId(t) === sid);
    return {
      ...state,
      activePatches: nextActive,
      tasks: exists
        ? state.tasks.map((t) =>
            getTaskId(t) === sid
              ? ({ ...baseline } as TaskViewModel)
              : t
          )
        : [...state.tasks, { ...baseline } as TaskViewModel],
    };
  }

  const sid = patch.taskId;
  if (!sid) return { ...state, activePatches: nextActive };
  const baseline = state.serverSnapshot[sid];
  if (!baseline) {
    return { ...state, activePatches: nextActive };
  }
  return {
    ...state,
    activePatches: nextActive,
    tasks: state.tasks.map((t) =>
      getTaskId(t) === sid
        ? ({
            ...baseline,
            isOptimistic: undefined,
            pendingPatchId: undefined,
          } as TaskViewModel)
        : t
    ),
  };
}

function taskDataReducer(
  state: TaskDataState,
  action: TaskDataAction
): TaskDataState {
  switch (action.type) {
    case "SET_PROJECTS_USERS":
      return {
        ...state,
        projects: action.payload.projects,
        users: action.payload.users,
      };
    case "RECONCILE": {
      const list = action.payload.tasks;
      const serverSnapshot: Record<string, Task> = {};
      for (const t of list) {
        serverSnapshot[getTaskId(t)] = t;
      }
      return {
        ...state,
        tasks: list.map((t) => ({ ...t })) as TaskViewModel[],
        serverSnapshot,
        activePatches: {},
      };
    }
    case "APPLY_PATCH": {
      const p = action.payload;
      const nextPatches = { ...state.activePatches, [p.patchId]: p };

      if (p.kind === "delete" && p.taskId) {
        return {
          ...state,
          activePatches: nextPatches,
          tasks: state.tasks.filter((t) => getTaskId(t) !== p.taskId),
        };
      }

      if (p.kind === "create") {
        const raw = p.patch as Partial<Task>;
        const tempId =
          p.taskId ??
          (raw.id ?? raw._id) ??
          `optimistic:${p.patchId}`;
        const newTask: TaskViewModel = {
          ...(raw as Task),
          _id: raw._id ?? tempId,
          id: raw.id ?? tempId,
          title: raw.title ?? "New task",
          status: (raw.status ?? "new") as TaskStatus,
          likesCount: raw.likesCount ?? 0,
          commentsCount: raw.commentsCount ?? 0,
          isOptimistic: true,
          pendingPatchId: p.patchId,
        };
        return {
          ...state,
          activePatches: nextPatches,
          tasks: [...state.tasks, newTask],
        };
      }

      if (!p.taskId) {
        return { ...state, activePatches: nextPatches };
      }

      return {
        ...state,
        activePatches: nextPatches,
        tasks: state.tasks.map((t) =>
          getTaskId(t) === p.taskId
            ? ({
                ...t,
                ...p.patch,
                isOptimistic: true,
                pendingPatchId: p.patchId,
              } as TaskViewModel)
            : t
        ),
      };
    }
    case "REVERT":
      return revertState(state, action.payload.patchId);
    case "EVICT_STALE": {
      const { maxAgeMs } = action.payload;
      const now = Date.now();
      const staleIds = Object.keys(state.activePatches).filter(
        (id) => now - state.activePatches[id].ts > maxAgeMs
      );
      let next = state;
      for (const id of staleIds) {
        next = revertState(next, id);
      }
      return next;
    }
    case "REORDER_IN_COLUMN": {
      const { activeId, overId } = action.payload;
      const oldIdx = state.tasks.findIndex((t) => getTaskId(t) === activeId);
      const newIdx = state.tasks.findIndex((t) => getTaskId(t) === overId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return state;
      return { ...state, tasks: arrayMove(state.tasks, oldIdx, newIdx) };
    }
    default:
      return state;
  }
}

export type TaskDataMutateApi = {
  applyPatch: (patch: OptimisticPatch) => void;
  reconcile: (tasks: Task[]) => void;
  revert: (patchId: string) => void;
  evictStale: (maxAgeMs: number) => void;
  reorderInColumn: (activeId: string, overId: string) => void;
};

export type TaskPaginationApi = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  isFetchingPage: boolean;
  goTo: (page: number, trigger?: PageChangeTrigger) => void;
  next: (trigger?: PageChangeTrigger) => void;
  prev: (trigger?: PageChangeTrigger) => void;
};

export type PageChangeTrigger =
  | "button"
  | "keyboard"
  | "filter"
  | "sort"
  | "drag-empty";

export type TaskDataContextValue = {
  projects: ProjectRow[];
  users: UserRow[];
  tasks: TaskViewModel[];
  tasksByStatus: Record<TaskStatus, TaskViewModel[]>;
  /** Total OPEN tasks assigned to a resigning/resigned employee (all pages, scoped). */
  leavingTotal: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mutate: TaskDataMutateApi;
  pagination: TaskPaginationApi;
};

const TaskDataContext = createContext<TaskDataContextValue | null>(null);

export function TaskDataProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { filters } = useTaskFilters();
  const auth = useAuth();
  const scopeToAssignedOnly = useMemo(() => taskBoardScopeToAssignedOnly(auth), [auth]);
  const [state, dispatch] = useReducer(taskDataReducer, undefined, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leavingTotal, setLeavingTotal] = useState(0);

  // --- Pagination state (P1.5 §5) -----------------------------------------
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [page, setPageState] = useState<number>(1);
  const [pageMeta, setPageMeta] = useState<{ total: number; totalPages: number }>({
    total: 0,
    totalPages: 0,
  });
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const prevFiltersRef = useRef<TaskFilters>(filters);
  const hydratedRef = useRef(false);
  const lastPageWriteRef = useRef<string | null>(null);
  // ------------------------------------------------------------------------

  const projectIdParam = useMemo(() => {
    if (filters.projectIds.length === 1) return filters.projectIds[0];
    return undefined;
  }, [filters.projectIds]);

  const priorityParam = useMemo(() => {
    if (filters.priorities.length > 0) return filters.priorities.join(",");
    return undefined;
  }, [filters.priorities]);

  const sprintIdParam = useMemo(() => {
    if (filters.sprintIds.length === 1) return filters.sprintIds[0];
    return undefined;
  }, [filters.sprintIds]);

  // Hydrate page from `?page=N` on mount only.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const parsed = parsePage(sp);
    if (parsed.clampedReason) {
      trackTaskBoard("taskboard.page_clamped", {
        requested: sp.get(QUERY_PAGE) ?? "",
        applied: 1,
        reason: parsed.clampedReason,
      });
    }
    if (parsed.page !== 1) {
      setPageState(parsed.page);
    }
  }, [sp]);

  // Reset page to 1 when filters change (P1.5 §5.6).
  useEffect(() => {
    if (!hydratedRef.current) {
      prevFiltersRef.current = filters;
      return;
    }
    if (!isEqual(prevFiltersRef.current, filters)) {
      prevFiltersRef.current = filters;
      if (page !== 1) {
        setPageState(1);
        trackTaskBoard("taskboard.page_reset", { trigger: "filter" });
      }
    }
  }, [filters, page]);

  // Sync page state → URL `?page=N` (omit when page=1).
  useEffect(() => {
    if (!hydratedRef.current) return;
    const params = new URLSearchParams(sp.toString());
    const serialized = serializePage(page);
    if (serialized) params.set(QUERY_PAGE, serialized);
    else params.delete(QUERY_PAGE);
    const nextQs = params.toString();
    if (nextQs === sp.toString()) return;
    if (lastPageWriteRef.current === nextQs) return;
    lastPageWriteRef.current = nextQs;
    router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, { scroll: false });
  }, [page, pathname, router, sp]);

  const runFetch = useCallback(async () => {
    setIsLoading(true);
    setIsFetchingPage(true);
    setError(null);
    try {
      const [taskRes, metadata] = await Promise.all([
        listTasks({
          page,
          limit: PAGE_LIMIT,
          ...(filters.q.trim() && { search: filters.q.trim() }),
          ...(projectIdParam && { projectId: projectIdParam }),
          ...(priorityParam && { priority: priorityParam }),
          ...(sprintIdParam && { sprintId: sprintIdParam }),
          ...(scopeToAssignedOnly || filters.assignedToMe ? { assignedToMe: true } : {}),
          ...(filters.unassigned ? { unassigned: true } : {}),
          ...(filters.leaving ? { leaving: true } : {}),
        }),
        fetchBoardMetadata(TASK_LIMIT, { scopeToAssignedOnly }),
      ]);
      const totalPages = taskRes.totalPages ?? 0;
      const totalResults = taskRes.totalResults ?? 0;
      setPageMeta({ total: totalResults, totalPages });
      setLeavingTotal(taskRes.leavingTotal ?? 0);
      // Server returned an out-of-range page → clamp to last valid page (P1.5 §5.6).
      if (totalPages > 0 && page > totalPages) {
        const clamped = totalPages;
        setPageState(clamped);
        trackTaskBoard("taskboard.page_clamped", {
          requested: page,
          applied: clamped,
          reason: "overflow",
        });
      }
      dispatch({
        type: "RECONCILE",
        payload: { tasks: taskRes.results ?? [] },
      });
      dispatch({
        type: "SET_PROJECTS_USERS",
        payload: {
          projects: metadata.projects,
          users: metadata.users,
        },
      });
    } catch (e) {
      setError(getErrorMessage(e));
      trackTaskBoard("taskboard.mutation_failed", { reason: getErrorMessage(e) });
      dispatch({ type: "RECONCILE", payload: { tasks: [] } });
    } finally {
      setIsLoading(false);
      setIsFetchingPage(false);
    }
  }, [
    page,
    filters.q,
    filters.assignedToMe,
    filters.unassigned,
    filters.leaving,
    scopeToAssignedOnly,
    projectIdParam,
    priorityParam,
    sprintIdParam,
  ]);

  useEffect(() => {
    void runFetch();
  }, [runFetch]);

  useEffect(() => {
    const onRefresh = () => void runFetch();
    window.addEventListener(PM_DATA_MUTATED_EVENT, onRefresh);
    return () => window.removeEventListener(PM_DATA_MUTATED_EVENT, onRefresh);
  }, [runFetch]);

  usePmRefetchOnFocus(runFetch);

  const tasksByStatus = useMemo(() => {
    const map = {} as Record<TaskStatus, TaskViewModel[]>;
    for (const col of STATUS_COLUMNS) {
      map[col.status] = [];
    }
    for (const t of state.tasks) {
      if (map[t.status]) map[t.status].push(t);
    }
    return map;
  }, [state.tasks]);

  const mutate = useMemo<TaskDataMutateApi>(
    () => ({
      applyPatch: (patch) => dispatch({ type: "APPLY_PATCH", payload: patch }),
      reconcile: (tasks) =>
        dispatch({ type: "RECONCILE", payload: { tasks } }),
      revert: (patchId) =>
        dispatch({ type: "REVERT", payload: { patchId } }),
      evictStale: (maxAgeMs) =>
        dispatch({ type: "EVICT_STALE", payload: { maxAgeMs } }),
      reorderInColumn: (activeId, overId) =>
        dispatch({ type: "REORDER_IN_COLUMN", payload: { activeId, overId } }),
    }),
    []
  );

  const goTo = useCallback(
    (next: number, trigger: PageChangeTrigger = "button") => {
      const totalPages = pageMeta.totalPages;
      const cap = totalPages > 0 ? totalPages : Math.max(1, Math.floor(next));
      const target = Math.max(1, Math.min(cap, Math.floor(next)));
      if (target === page) return;
      trackTaskBoard("taskboard.page_changed", {
        from: page,
        to: target,
        trigger,
      });
      setPageState(target);
    },
    [page, pageMeta.totalPages]
  );

  const nextPage = useCallback(
    (trigger: PageChangeTrigger = "button") => goTo(page + 1, trigger),
    [goTo, page]
  );

  const prevPage = useCallback(
    (trigger: PageChangeTrigger = "button") => goTo(page - 1, trigger),
    [goTo, page]
  );

  const pagination = useMemo<TaskPaginationApi>(
    () => ({
      page,
      limit: PAGE_LIMIT,
      total: pageMeta.total,
      totalPages: pageMeta.totalPages,
      isFetchingPage,
      goTo,
      next: nextPage,
      prev: prevPage,
    }),
    [page, pageMeta.total, pageMeta.totalPages, isFetchingPage, goTo, nextPage, prevPage]
  );

  const value = useMemo<TaskDataContextValue>(
    () => ({
      projects: state.projects,
      users: state.users,
      tasks: state.tasks,
      tasksByStatus,
      leavingTotal,
      isLoading,
      error,
      refetch: runFetch,
      mutate,
      pagination,
    }),
    [
      state.projects,
      state.users,
      state.tasks,
      tasksByStatus,
      leavingTotal,
      isLoading,
      error,
      runFetch,
      mutate,
      pagination,
    ]
  );

  return (
    <TaskDataContext.Provider value={value}>{children}</TaskDataContext.Provider>
  );
}

export function useTaskData(): TaskDataContextValue {
  const ctx = useContext(TaskDataContext);
  if (!ctx) {
    throw new Error("useTaskData must be used within TaskDataProvider");
  }
  return ctx;
}

export { getTaskId };
