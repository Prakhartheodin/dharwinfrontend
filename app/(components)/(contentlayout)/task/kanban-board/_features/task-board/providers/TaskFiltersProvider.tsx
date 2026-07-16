"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/shared/contexts/auth-context";
import { DEBOUNCE_MS, STORAGE_KEY_FILTERS } from "../lib/constants";
import {
  buildSearchParamsFromFilters,
  deserialize,
  normalize,
} from "../lib/url-state";
import { safeRemove } from "../lib/safe-storage";
import { EMPTY_FILTERS, type TaskFilters } from "../types";
import { trackTaskBoard } from "../lib/telemetry";

export type TaskFiltersContextValue = {
  filters: TaskFilters;
  setFilters: (next: TaskFilters) => void;
  patchFilters: (patch: Partial<TaskFilters>) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  searchInput: string;
  setSearchInput: (v: string) => void;
  projectId: string;
  setProjectId: (id: string) => void;
  assignedToMe: boolean;
  setAssignedToMe: (v: boolean) => void;
  unassigned: boolean;
  setUnassigned: (v: boolean) => void;
  reassigned: boolean;
  setReassigned: (v: boolean) => void;
  priorities: TaskFilters["priorities"];
  setPriorities: (next: TaskFilters["priorities"]) => void;
  togglePriority: (p: TaskFilters["priorities"][number]) => void;
};

export const TaskFiltersContext =
  createContext<TaskFiltersContextValue | null>(null);

export function TaskFiltersProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const userKey = auth?.user?.id ?? "anon";
  const legacyFiltersKey = STORAGE_KEY_FILTERS(userKey);

  const hydratedForKey = useRef<string | null>(null);
  const urlWritesEnabled = useRef(false);
  const filterTelemetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filters, setFiltersState] = useState<TaskFilters>(() =>
    normalize(EMPTY_FILTERS)
  );
  const [searchInput, setSearchInput] = useState("");

  useLayoutEffect(() => {
    if (hydratedForKey.current === legacyFiltersKey) return;
    hydratedForKey.current = legacyFiltersKey;
    const fromUrl = normalize(deserialize(sp));
    setFiltersState(fromUrl);
    setSearchInput(fromUrl.q);
    urlWritesEnabled.current = true;
    // Filters are URL-scoped only; clear legacy localStorage restore keys.
    safeRemove(legacyFiltersKey);
  }, [sp, legacyFiltersKey]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFiltersState((prev) => {
        const q = searchInput.trim();
        if (prev.q === q) return prev;
        return { ...prev, q };
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!urlWritesEnabled.current) return;
    const params = buildSearchParamsFromFilters(filters, sp);
    const nextQs = params.toString();
    const current = sp.toString();
    if (nextQs === current) return;
    router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, {
      scroll: false,
    });
  }, [filters, pathname, router, sp]);

  const emitFilterTelemetry = useCallback((next: TaskFilters) => {
    if (filterTelemetryTimer.current) clearTimeout(filterTelemetryTimer.current);
    filterTelemetryTimer.current = setTimeout(() => {
      trackTaskBoard("taskboard.filter_applied", { hasQuery: !!next.q.trim(), count: next.priorities.length });
    }, 500);
  }, []);

  const setFilters = useCallback((next: TaskFilters) => {
    const n = normalize(next);
      setFiltersState(n);
      emitFilterTelemetry(n);
    setSearchInput(next.q);
  }, [emitFilterTelemetry]);

  const patchFilters = useCallback((patch: Partial<TaskFilters>) => {
    if (patch.q !== undefined) setSearchInput(patch.q);
    setFiltersState((prev) => normalize({ ...prev, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(normalize(EMPTY_FILTERS));
    setSearchInput("");
    safeRemove(legacyFiltersKey);
  }, [legacyFiltersKey]);

  const hasActiveFilters = useMemo(() => {
    return (
      !!filters.q ||
      filters.projectIds.length > 0 ||
      filters.assigneeIds.length > 0 ||
      filters.statuses.length > 0 ||
      filters.priorities.length > 0 ||
      filters.labels.length > 0 ||
      filters.sprintIds.length > 0 ||
      filters.createdByIds.length > 0 ||
      !!filters.due ||
      filters.assignedToMe ||
      filters.unassigned ||
      filters.leaving ||
      filters.reassigned
    );
  }, [filters]);

  const projectId = filters.projectIds[0] ?? "";
  const setProjectId = useCallback(
    (id: string) => {
      patchFilters({ projectIds: id ? [id] : [] });
    },
    [patchFilters]
  );

  const assignedToMe = filters.assignedToMe;
  const setAssignedToMe = useCallback(
    (v: boolean) => patchFilters({ assignedToMe: v }),
    [patchFilters]
  );

  const unassigned = filters.unassigned;
  const setUnassigned = useCallback(
    (v: boolean) => patchFilters({ unassigned: v }),
    [patchFilters]
  );

  const reassigned = filters.reassigned;
  const setReassigned = useCallback(
    (v: boolean) => patchFilters({ reassigned: v }),
    [patchFilters]
  );

  const priorities = filters.priorities;
  const setPriorities = useCallback(
    (next: TaskFilters["priorities"]) => patchFilters({ priorities: next }),
    [patchFilters]
  );

  const togglePriority = useCallback(
    (p: TaskFilters["priorities"][number]) => {
      setPriorities(
        priorities.includes(p)
          ? priorities.filter((x) => x !== p)
          : [...priorities, p]
      );
    },
    [priorities, setPriorities]
  );

  const value = useMemo<TaskFiltersContextValue>(
    () => ({
      filters,
      setFilters,
      patchFilters,
      clearFilters,
      hasActiveFilters,
      searchInput,
      setSearchInput,
      projectId,
      setProjectId,
      assignedToMe,
      setAssignedToMe,
      unassigned,
      setUnassigned,
      reassigned,
      setReassigned,
      priorities,
      setPriorities,
      togglePriority,
    }),
    [
      filters,
      setFilters,
      patchFilters,
      clearFilters,
      hasActiveFilters,
      searchInput,
      projectId,
      setProjectId,
      assignedToMe,
      setAssignedToMe,
      unassigned,
      setUnassigned,
      reassigned,
      setReassigned,
      priorities,
      setPriorities,
      togglePriority,
    ]
  );

  return (
    <TaskFiltersContext.Provider value={value}>
      {children}
    </TaskFiltersContext.Provider>
  );
}

export function useTaskFilters(): TaskFiltersContextValue {
  const ctx = useContext(TaskFiltersContext);
  if (!ctx) {
    throw new Error("useTaskFilters must be used within TaskFiltersProvider");
  }
  return ctx;
}
