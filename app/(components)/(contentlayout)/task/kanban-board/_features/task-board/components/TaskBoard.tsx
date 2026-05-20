"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Task } from "@/shared/lib/api/tasks";
import { getTaskId, updateTaskStatus } from "@/shared/lib/api/tasks";
import type { TaskStatus } from "@/shared/lib/api/tasks";
import { compilePredicate } from "../lib/filter-predicates";
import { STATUS_COLUMNS, STATUS_SET } from "../lib/constants";
import { useTaskFilters } from "../hooks/useTaskFilters";
import { useTaskUI } from "../hooks/useTaskUI";
import { useTaskSelection } from "../providers/TaskSelectionProvider";
import { useTaskData } from "../providers/TaskDataProvider";
import { useTaskDnd } from "../hooks/useTaskDnd";
import { bulkDragTaskIds } from "../hooks/useBulkTaskActions";
import { useTaskBoardTelemetry } from "../hooks/useTaskBoardTelemetry";
import { extractCorrelationId, humanizeApiError } from "../lib/errors";
import { toast } from "../lib/toast";
import { emitPmDataMutated } from "@/shared/hooks/usePmRefetchOnFocus";
import { TaskColumn } from "./TaskColumn";
import { TaskCardGhost } from "./TaskCardGhost";
import { DnDInstructions } from "./DnDInstructions";
import { PaginationBar } from "./PaginationBar";
import styles from "../../../kanban-board.module.css";

export interface TaskBoardProps {
  canCreate?: boolean;
  onQuickAdd?: (status: TaskStatus) => void;
  onOpenTask?: (taskId: string) => void;
  onTelemetry?: (event: "drag_start" | "drag_end", detail: Record<string, unknown>) => void;
}

export function TaskBoard({
  canCreate,
  onQuickAdd,
  onOpenTask,
  onTelemetry,
}: TaskBoardProps): React.JSX.Element {
  const { filters } = useTaskFilters();
  const { density } = useTaskUI();
  const { selectedIds, toggle, clearSelection } = useTaskSelection();

  const { tasks, isLoading, error, refetch, mutate, pagination } = useTaskData();

  const moveTask = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const patchId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `patch-${Date.now()}`;
      mutate.applyPatch({
        patchId,
        ts: Date.now(),
        kind: "move",
        taskId,
        patch: { status: newStatus },
      });
      try {
        await updateTaskStatus(taskId, newStatus);
        await refetch();
      } catch (e) {
        mutate.revert(patchId);
        throw e;
      }
    },
    [mutate, refetch]
  );

  const predicate = useMemo(() => compilePredicate(filters), [filters]);
  const visibleTasks = useMemo(
    () => tasks.filter((t) => predicate(t)),
    [tasks, predicate]
  );

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      new: [],
      todo: [],
      on_going: [],
      in_review: [],
      completed: [],
    };
    visibleTasks.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [visibleTasks]);

  const taskMap = useMemo(() => {
    const m = new Map<string, Task>();
    visibleTasks.forEach((t) => m.set(getTaskId(t), t));
    return m;
  }, [visibleTasks]);

  const telemetry = useTaskBoardTelemetry({
    onDragStart: (p) =>
      onTelemetry?.("drag_start", { taskId: p.taskId, density }),
    onDragEnd: (p) =>
      onTelemetry?.("drag_end", {
        taskId: p.taskId,
        fromStatus: p.fromStatus,
        toStatus: p.toStatus,
        durationMs: p.durationMs,
      }),
  });

  // originalStatusRef: status at drag-start, before any onDragOver updates.
  const originalStatusRef = useRef<TaskStatus | null>(null);

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      lastOverIdRef.current = null;

      const taskId = String(active.id);
      const moved = taskMap.get(taskId);
      const originalStatus = originalStatusRef.current;
      originalStatusRef.current = null;

      if (!over) {
        telemetry.handleDragEnd(event, {});
        // Revert any live reorder — task stays where it was.
        if (originalStatus && moved && originalStatus !== moved.status) {
          void refetch();
        }
        return;
      }

      const overId = String(over.id);

      // Resolve where the card landed.
      let newStatus: TaskStatus | null = null;
      if (STATUS_SET.has(overId as TaskStatus)) {
        newStatus = overId as TaskStatus;
      } else {
        const hit = visibleTasks.find((t) => getTaskId(t) === overId);
        if (hit) newStatus = hit.status;
      }

      telemetry.handleDragEnd(event, {
        fromStatus: originalStatus ?? moved?.status,
        toStatus: newStatus ?? undefined,
      });

      if (!moved) return;

      // Within-column: onDragOver already updated state live; nothing more to do.
      // Also handles the case where user drops back onto the same column with no card target.
      if (!newStatus || newStatus === originalStatus) {
        // If the final over target is a card in the same column, do a final reorder to confirm.
        if (newStatus && taskId !== overId && !STATUS_SET.has(overId as TaskStatus)) {
          mutate.reorderInColumn(taskId, overId);
        }
        return;
      }

      // Cross-column move: call the API (batch when multi-select includes dragged card).
      const statusById = new Map(
        visibleTasks.map((t) => [getTaskId(t), t.status] as const)
      );
      const idsToMove = bulkDragTaskIds(
        taskId,
        selectedIds,
        statusById,
        newStatus
      );
      if (!idsToMove.length) return;

      let failed = 0;
      for (const id of idsToMove) {
        try {
          await moveTask(id, newStatus);
        } catch (e) {
          failed += 1;
          if (idsToMove.length === 1) {
            toast.error(humanizeApiError(e, "Failed to update task status."), {
              correlationId: extractCorrelationId(e),
            });
          }
        }
      }
      if (failed > 0 && idsToMove.length > 1) {
        toast.warning(
          `Moved ${idsToMove.length - failed} of ${idsToMove.length} tasks.`
        );
      } else if (idsToMove.length > 1) {
        toast.success(`Moved ${idsToMove.length} tasks.`);
      }
      if (failed === 0 || failed < idsToMove.length) {
        emitPmDataMutated();
      }
      if (failed > 0) {
        void refetch();
      }
      if (idsToMove.length > 1) {
        clearSelection();
      }
    },
    [moveTask, mutate, refetch, taskMap, telemetry, visibleTasks, selectedIds, clearSelection]
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const taskId = (e as CustomEvent<{ taskId?: string }>).detail?.taskId;
      if (!taskId) return;
      const el = document.querySelector(
        `[data-task-id="${taskId}"]`
      ) as HTMLElement | null;
      el?.focus({ preventScroll: true });
    };
    window.addEventListener("taskboard.optimistic_rollback", handler);
    return () => window.removeEventListener("taskboard.optimistic_rollback", handler);
  }, []);

  const dnd = useTaskDnd({ onDragEnd });

  // Track the last overId so we only dispatch when it changes (avoids excessive renders).
  const lastOverIdRef = useRef<string | null>(null);

  const onDragStart = useCallback(
    (e: DragStartEvent) => {
      lastOverIdRef.current = null;
      const task = taskMap.get(String(e.active.id));
      originalStatusRef.current = task?.status ?? null;
      telemetry.handleDragStart(e);
      dnd.onDragStart(e);
      if (typeof performance !== "undefined") {
        performance.mark("taskboard.first_drag");
      }
    },
    [dnd, taskMap, telemetry]
  );

  // onDragOver: live reorder within the same column so cards animate to show the
  // insertion point. Cross-column moves are handled only in onDragEnd.
  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const taskId = String(active.id);
      const overId = String(over.id);

      // Nothing changed since last frame — skip.
      if (lastOverIdRef.current === overId) return;
      lastOverIdRef.current = overId;

      // Hovering over self or a column header — nothing to do.
      if (taskId === overId || STATUS_SET.has(overId as TaskStatus)) return;

      const moved = taskMap.get(taskId);
      if (!moved) return;

      const overTask = visibleTasks.find((t) => getTaskId(t) === overId);
      if (!overTask) return;

      // Only reorder within the same column; cross-column is handled in onDragEnd.
      if (moved.status === overTask.status) {
        mutate.reorderInColumn(taskId, overId);
      }
    },
    [mutate, taskMap, visibleTasks]
  );

  const titleOf = useCallback(
    (id: string) => visibleTasks.find((t) => getTaskId(t) === id)?.title ?? "task",
    [visibleTasks]
  );
  const labelOfStatus = useCallback(
    (status: string) => STATUS_COLUMNS.find((c) => c.status === status)?.label ?? status,
    []
  );

  const throttleAnnounce = useMemo(() => {
    let last = 0;
    return (fn: () => string | undefined, ms = 150) => {
      const now = Date.now();
      if (now - last < ms) return undefined;
      last = now;
      return fn();
    };
  }, []);

  type AnnounceActive = { id: string | number };
  type AnnounceOver = AnnounceActive | null;
  const dragAnnouncements = useMemo(
    () => ({
      onDragStart: ({ active }: { active: AnnounceActive }) =>
        `Picked up ${titleOf(String(active.id))}.`,
      onDragOver: ({ over }: { active: AnnounceActive; over: AnnounceOver }) =>
        throttleAnnounce(() =>
          over ? `Moving over ${labelOfStatus(String(over.id))}.` : undefined
        ),
      onDragEnd: ({ active, over }: { active: AnnounceActive; over: AnnounceOver }) =>
        over
          ? `Dropped ${titleOf(String(active.id))} in ${labelOfStatus(String(over.id))}.`
          : "Returned to source.",
      onDragCancel: (_: { active: AnnounceActive; over: AnnounceOver }) => "Drag cancelled.",
    }),
    [labelOfStatus, throttleAnnounce, titleOf]
  );

  const activeTask = dnd.activeId ? taskMap.get(dnd.activeId) : undefined;

  return (
    <div id="task-board-main" role="grid" aria-label="Tasks by status" data-density={density} className={styles.kbRoot}>
      <DnDInstructions />
      {error ? (
        <div
          role="alert"
          className="mx-2 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {/* ── Stats bar ────────────────────────────────────────── */}
      <div className="mx-2 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 pb-3 dark:border-white/10">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Tasks
        </span>
        <span className="hidden h-3 w-px bg-slate-300 sm:inline-block dark:bg-white/15" aria-hidden />
        <BoardStat label="Total"  value={pagination.total} />
        <BoardStat label="New"    value={tasksByStatus.new?.length    ?? 0} />
        <BoardStat label="Todo"   value={tasksByStatus.todo?.length   ?? 0} tone="primary" />
        <BoardStat label="Active" value={tasksByStatus.on_going?.length  ?? 0} tone="warning" />
        <BoardStat label="Review" value={tasksByStatus.in_review?.length ?? 0} tone="info" />
        <BoardStat label="Done"   value={tasksByStatus.completed?.length ?? 0} tone="success" />
      </div>

      <DndContext
        accessibility={{ announcements: dragAnnouncements }}
        sensors={dnd.sensors}
        collisionDetection={dnd.collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={dnd.onDragEnd}
        onDragCancel={dnd.onDragCancel}
      >
        <div className="grid gap-3 px-2 pb-6 pt-2 md:grid-cols-2 xl:grid-cols-5">
          {STATUS_COLUMNS.map((col) => (
            <TaskColumn
              key={col.status}
              status={col.status}
              label={col.label}
              tasks={tasksByStatus[col.status] ?? []}
              isDragging={!!dnd.activeId}
              canCreate={canCreate}
              onQuickAdd={onQuickAdd}
              onOpenTask={onOpenTask}
              selectedIds={[...selectedIds]}
              onToggleSelect={toggle}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
          <TaskCardGhost
            task={activeTask}
            batchCount={
              selectedIds.has(dnd.activeId ?? "") && selectedIds.size > 1
                ? selectedIds.size
                : 1
            }
          />
        ) : null}
        </DragOverlay>
      </DndContext>

      <PaginationBar />

      {isLoading ? (
        <div className="px-3 py-6 text-center text-sm text-slate-500" aria-busy="true">
          Loading tasks...
        </div>
      ) : null}
    </div>
  );
}

/* ── BoardStat pill ─────────────────────────────────────────────────────── */

type BoardStatTone = "slate" | "primary" | "warning" | "info" | "success";

const BOARD_STAT_VALUE_CLS: Record<BoardStatTone, string> = {
  slate:   "text-slate-900 dark:text-white",
  primary: "text-primary",
  warning: "text-warning",
  info:    "text-info",
  success: "text-success",
};

function BoardStat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: BoardStatTone;
}): React.JSX.Element {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className={`font-mono text-sm font-semibold tabular-nums ${BOARD_STAT_VALUE_CLS[tone]}`}>
        {value.toString().padStart(2, "0")}
      </span>
    </span>
  );
}

