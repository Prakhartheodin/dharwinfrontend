"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type TaskSelectionContextValue = {
  selectedIds: ReadonlySet<string>;
  /** Replace selection with a single id (unless `additive` is true). */
  select: (taskId: string, opts?: { additive?: boolean }) => void;
  toggle: (taskId: string) => void;
  selectMany: (taskIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (taskId: string) => boolean;
};

const TaskSelectionContext =
  createContext<TaskSelectionContextValue | null>(null);

export function TaskSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const select = useCallback(
    (taskId: string, opts?: { additive?: boolean }) => {
      setSelectedIds((prev) => {
        if (opts?.additive) {
          const next = new Set(prev);
          next.add(taskId);
          return next;
        }
        return new Set([taskId]);
      });
    },
    []
  );

  const toggle = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const selectMany = useCallback((taskIds: string[]) => {
    setSelectedIds(new Set(taskIds.filter(Boolean)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (taskId: string) => selectedIds.has(taskId),
    [selectedIds]
  );

  const value = useMemo<TaskSelectionContextValue>(
    () => ({
      selectedIds,
      select,
      toggle,
      selectMany,
      clearSelection,
      isSelected,
    }),
    [selectedIds, select, toggle, selectMany, clearSelection, isSelected]
  );

  return (
    <TaskSelectionContext.Provider value={value}>
      {children}
    </TaskSelectionContext.Provider>
  );
}

export function useTaskSelection(): TaskSelectionContextValue {
  const ctx = useContext(TaskSelectionContext);
  if (!ctx) {
    throw new Error("useTaskSelection must be used within TaskSelectionProvider");
  }
  return ctx;
}
