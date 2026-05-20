"use client";

import React, { useMemo } from "react";
import type { TaskStatus } from "@/shared/lib/api/tasks";
import { getTaskId } from "@/shared/lib/api/tasks";
import { compilePredicate } from "../lib/filter-predicates";
import { STATUS_COLUMNS } from "../lib/constants";
import { useTaskFilters } from "../hooks/useTaskFilters";
import { useTaskUI } from "../hooks/useTaskUI";
import { useTaskSelection } from "../providers/TaskSelectionProvider";
import { useTaskData } from "../providers/TaskDataProvider";
import type { TaskViewModel } from "../types";
import { TaskCard } from "./TaskCard";
import { PaginationBar } from "./PaginationBar";
import styles from "../../../kanban-board.module.css";

export interface TaskListViewProps {
  onOpenTask?: (taskId: string) => void;
}

/**
 * Workflow-grouped list view (P1.5 refinement).
 *
 * Tasks render under sticky workflow status headers so status context is
 * never lost — flat dumps were an anti-pattern. Groups follow the same
 * order as the kanban columns.
 */
export function TaskListView({
  onOpenTask,
}: TaskListViewProps): React.JSX.Element {
  const { filters } = useTaskFilters();
  const { density } = useTaskUI();
  const { toggle, isSelected } = useTaskSelection();
  const { tasks, isLoading, error, refetch } = useTaskData();

  const predicate = useMemo(() => compilePredicate(filters), [filters]);
  const visibleTasks = useMemo(
    () => tasks.filter((t) => predicate(t)),
    [tasks, predicate]
  );

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, TaskViewModel[]> = {
      new: [],
      todo: [],
      on_going: [],
      in_review: [],
      completed: [],
    };
    for (const t of visibleTasks) {
      if (map[t.status]) map[t.status].push(t);
    }
    return map;
  }, [visibleTasks]);

  return (
    <div
      id="task-board-main"
      data-density={density}
      className={`${styles.kbRoot} px-2 pb-6 pt-2`}
    >
      {error ? (
        <div
          role="alert"
          className="mb-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {STATUS_COLUMNS.map((col) => {
        const items = grouped[col.status] ?? [];
        if (items.length === 0) return null;
        return (
          <section
            key={col.status}
            aria-labelledby={`list-group-${col.status}`}
            className={`${styles.kbColumn} mb-3 border`}
            data-status={col.status}
          >
            <header
              className={`${styles.kbColumnHeader} flex items-center justify-between gap-2 px-3 py-2`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  id={`list-group-${col.status}`}
                  className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200"
                >
                  {col.label}
                </span>
                <span className="font-mono text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                  {String(items.length).padStart(2, "0")}
                </span>
              </div>
            </header>
            <ul className="flex flex-col gap-1.5 p-2" aria-label={`${col.label} tasks`}>
              {items.map((task) => {
                const id = getTaskId(task);
                return (
                  <li key={id}>
                    <TaskCard
                      task={task}
                      selected={isSelected(id)}
                      onToggleSelect={toggle}
                      onOpen={onOpenTask}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {!isLoading && visibleTasks.length === 0 ? (
        <p className="py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          No tasks match your filters.
        </p>
      ) : null}
      {isLoading ? (
        <div className="py-6 text-center text-sm text-slate-500" aria-busy="true">
          Loading tasks...
        </div>
      ) : null}

      <PaginationBar />
    </div>
  );
}

