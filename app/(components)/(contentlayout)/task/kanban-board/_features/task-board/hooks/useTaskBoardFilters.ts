"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEBOUNCE_MS } from "../lib/constants";
import {
  buildSearchParamsFromFilters,
  deserializeFilters,
} from "../lib/url-state";
import { EMPTY_FILTERS, type TaskFilters } from "../types";

export function useTaskBoardFilters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const didHydrate = useRef(false);
  const urlWritesEnabled = useRef(false);

  const [filters, setFiltersState] = useState<TaskFilters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");

  useLayoutEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;
    const fromUrl = deserializeFilters(sp);
    setFiltersState(fromUrl);
    setSearchInput(fromUrl.q);
    urlWritesEnabled.current = true;
  }, [sp]);

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

  const setFilters = useCallback((next: TaskFilters) => {
    setFiltersState(next);
    setSearchInput(next.q);
  }, []);

  const patchFilters = useCallback((patch: Partial<TaskFilters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...patch };
      if (patch.q !== undefined) setSearchInput(patch.q);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({ ...EMPTY_FILTERS });
    setSearchInput("");
  }, []);

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

  return {
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
    priorities,
    setPriorities,
    togglePriority,
  };
}
