"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Task } from "@/shared/lib/api/tasks";
import { getTaskId } from "@/shared/lib/api/tasks";
import type { TaskStatus } from "@/shared/lib/api/tasks";
import { useTaskVirtualizer } from "../hooks/useTaskVirtualizer";
import { QuickAdd } from "./QuickAdd";
import { SortableCardRow } from "./SortableCardRow";
import styles from "../../../kanban-board.module.css";

export interface TaskColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  isDragging?: boolean;
  canCreate?: boolean;
  onQuickAdd?: (status: TaskStatus) => void;
  onOpenTask?: (taskId: string) => void;
  selectedIds?: string[];
  onToggleSelect?: (taskId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function TaskColumn({
  status,
  label,
  tasks,
  isDragging,
  canCreate,
  onQuickAdd,
  onOpenTask,
  selectedIds = [],
  onToggleSelect,
  emptyTitle,
  emptyDescription,
}: TaskColumnProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const ids = useMemo(() => tasks.map((t) => getTaskId(t)), [tasks]);

  const { setNodeRef, isOver } = useDroppable({ id: status });

  const virtualizer = useTaskVirtualizer({
    count: tasks.length,
    scrollRef,
    estimateSize: 104,
  });

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Sticky header shadow when body has scrolled (P1.5 §6.6).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 0);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Quiet empty-state line — P1.5 §6.7. No CTA button at column level; the
  // toolbar "+ New task" action remains the canonical entry point.
  const emptyLineText =
    emptyTitle ?? (canCreate ? "No tasks — drop one here" : "No tasks");

  return (
    <section
      role="region"
      aria-labelledby={`col-${status}`}
      className={`${styles.kbColumn} flex flex-col border border-slate-200/80 bg-white/40 dark:border-white/10 dark:bg-white/[0.03] ${isOver ? "ring-2 ring-indigo-400/40" : ""}`}
      data-status={status}
    >
      <div
        className={`${styles.kbColumnHeader} flex items-center justify-between gap-2 px-3 py-2`}
        data-scrolled={scrolled ? "true" : "false"}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            id={`col-${status}`}
            className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300"
          >
            {label}
          </span>
          <span className="font-mono text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
            {String(tasks.length).padStart(2, "0")}
          </span>
        </div>
        {canCreate ? (
          <QuickAdd
            label="Add"
            onClick={() => onQuickAdd?.(status)}
            disabled={isDragging}
          />
        ) : null}
      </div>

      <div
        ref={(el) => {
          setNodeRef(el);
          (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className="flex-1 px-2 py-2"
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className={styles.kbEmptyPageLine} role="status" aria-live="polite">
              <span>
                {emptyLineText}
                {canCreate && !emptyDescription ? (
                  <>
                    {" — "}
                    <button
                      type="button"
                      onClick={() => onQuickAdd?.(status)}
                      className="font-semibold text-slate-700 underline-offset-2 hover:underline dark:text-slate-200"
                    >
                      add
                    </button>
                  </>
                ) : null}
              </span>
            </div>
          ) : virtualizer ? (
            <div
              className="relative"
              style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
              {virtualizer.getVirtualItems().map((vi) => {
                const task = tasks[vi.index];
                if (!task) return null;
                const tid = getTaskId(task);
                return (
                  <div
                    key={tid}
                    className="absolute left-0 right-0"
                    style={{ transform: `translateY(${vi.start}px)` }}
                  >
                    <SortableCardRow
                      task={task}
                      selected={selectedSet.has(tid)}
                      onOpen={onOpenTask}
                      onToggleSelect={onToggleSelect}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            tasks.map((task) => {
              const tid = getTaskId(task);
              return (
                <SortableCardRow
                  key={tid}
                  task={task}
                  selected={selectedSet.has(tid)}
                  onOpen={onOpenTask}
                  onToggleSelect={onToggleSelect}
                />
              );
            })
          )}
        </SortableContext>
      </div>
    </section>
  );
}

