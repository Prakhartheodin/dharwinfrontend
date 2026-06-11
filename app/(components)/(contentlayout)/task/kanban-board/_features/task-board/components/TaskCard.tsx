"use client";

import React, { memo, useCallback } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { Task } from "@/shared/lib/api/tasks";
import { formatDueDate } from "@/shared/lib/api/tasks";
import { sanitizeText } from "../lib/sanitize";
import { resolveAssigneeInitials } from "../lib/initials";
import { useTaskKeyboard } from "../hooks/useTaskKeyboard";
import { useTaskUI } from "../hooks/useTaskUI";
import { useTaskData } from "../providers/TaskDataProvider";
import { TaskBadge } from "./TaskBadge";
import { TaskMeta } from "./TaskMeta";
import styles from "../../../kanban-board.module.css";

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "URGENT",
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

export interface TaskCardProps {
  task: Task;
  selected?: boolean;
  isDragging?: boolean;
  readOnly?: boolean;
  canDelete?: boolean;
  onOpen?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onToggleSelect?: (taskId: string) => void;
  dragAttributes?: DraggableAttributes;
  dragListeners?: Record<string, unknown> | undefined;
  assigneeInitials?: string[];
}

export const TaskCard = memo(function TaskCard({
  task,
  selected,
  isDragging,
  readOnly,
  canDelete,
  onOpen,
  onDelete,
  onToggleSelect,
  dragAttributes,
  dragListeners,
  assigneeInitials,
}: TaskCardProps): React.JSX.Element {
  const title = sanitizeText(task.title);
  const code = sanitizeText(task.taskCode ?? "");
  const priority = String((task as Task & { priority?: string }).priority ?? "medium");
  const priorityLabel = PRIORITY_LABEL[priority] ?? "";
  const hasPriority = priority in PRIORITY_LABEL;

  const { density } = useTaskUI();
  const isCompact = density === "compact";

  // Board users (from TaskDataProvider) let us resolve bare assignee ID
  // strings — unpopulated refs — into real names/initials.
  const { users } = useTaskData();

  const onActivate = useCallback(() => {
    if (readOnly || !onOpen) return;
    const id = task._id ?? task.id ?? "";
    if (id) onOpen(id);
  }, [onOpen, readOnly, task._id, task.id]);

  const { onKeyDown } = useTaskKeyboard({ onActivate });

  const dueLabel = formatDueDate(task.dueDate, task.status);

  const initials =
    assigneeInitials ?? resolveAssigneeInitials(task.assignedTo, users);

  const taskId = task._id ?? task.id ?? "";
  const tagsToShow = isCompact ? [] : (task.tags ?? []).slice(0, 2);

  return (
    <article
      id={taskId ? `task-card-${taskId}` : undefined}
      data-task-id={taskId || undefined}
      role="article"
      tabIndex={readOnly ? -1 : 0}
      aria-describedby={readOnly ? undefined : "dnd-instructions"}
      aria-grabbed={isDragging}
      data-priority={priority}
      data-readonly={readOnly ? "true" : undefined}
      className={`${styles.kbTaskCard} ${isDragging ? styles.kbTaskCardDragging : ""} ${selected ? styles.kbTaskCardSelected : ""} ${readOnly ? styles.kbTaskCardReadOnly : ""}`}
      onKeyDown={readOnly ? undefined : onKeyDown}
      onClick={() => {
        if (readOnly || !onOpen || !taskId) return;
        onOpen(taskId);
      }}
      {...dragAttributes}
      {...dragListeners}
    >
      {/* Row 1 — priority signal + id (comfortable) / hidden on compact */}
      {!isCompact ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {hasPriority ? (
              <>
                <span
                  className={styles.kbPriorityDot}
                  data-priority={priority}
                  aria-hidden
                />
                <span
                  className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--kb-priority-" + priority + ")" }}
                >
                  {priorityLabel}
                </span>
              </>
            ) : null}
            {code ? (
              <span className="ml-auto font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {code}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canDelete && onDelete && taskId ? (
              <button
                type="button"
                className={styles.kbTaskDeleteBtn}
                aria-label="Delete task"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(taskId);
                }}
              >
                <i className="ri-delete-bin-line" aria-hidden />
              </button>
            ) : null}
            {onToggleSelect ? (
            <label className="flex shrink-0 cursor-pointer items-center" onClick={(e) => e.stopPropagation()}>
              <span className="sr-only">Select task</span>
              <input
                type="checkbox"
                checked={!!selected}
                onChange={(e) => {
                  e.stopPropagation();
                  if (taskId) onToggleSelect(taskId);
                }}
                className="h-4 w-4 rounded border-slate-300"
              />
            </label>
          ) : null}
          </div>
        </div>
      ) : null}

      {/* Row 2 — title (always present) */}
      <h3
        className={
          isCompact
            ? "line-clamp-1 text-start text-[12px] font-medium leading-tight text-slate-900 dark:text-slate-100"
            : "mt-1 line-clamp-2 text-start text-[13px] font-semibold leading-snug text-slate-900 dark:text-slate-100"
        }
        title={title || "Untitled task"}
      >
        {title || "Untitled task"}
      </h3>

      {/* Row 3 — labels (comfortable only) */}
      {tagsToShow.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tagsToShow.map((t) => (
            <TaskBadge key={t} variant="label" value={t} />
          ))}
        </div>
      ) : null}

      {/* Row 4 — compact meta: priority dot + due + avatars */}
      {isCompact ? (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          {hasPriority ? (
            <>
              <span className={styles.kbPriorityDot} data-priority={priority} aria-hidden />
              <span aria-hidden>·</span>
            </>
          ) : null}
          {dueLabel ? (
            <>
              <span className="font-mono">{dueLabel}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          {code ? (
            <span className="font-mono text-[10px]">{code}</span>
          ) : null}
          <TaskMeta
            avatars={initials.slice(0, 2)}
            dueLabel={undefined}
            commentsCount={undefined}
            attachmentsCount={undefined}
          />
          {onToggleSelect ? (
            <label className="ms-auto flex shrink-0 cursor-pointer items-center" onClick={(e) => e.stopPropagation()}>
              <span className="sr-only">Select task</span>
              <input
                type="checkbox"
                checked={!!selected}
                onChange={(e) => {
                  e.stopPropagation();
                  if (taskId) onToggleSelect(taskId);
                }}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
            </label>
          ) : null}
        </div>
      ) : (
        <TaskMeta
          avatars={initials}
          dueLabel={dueLabel}
          commentsCount={task.commentsCount}
          attachmentsCount={
            (task as Task & { attachmentsCount?: number }).attachmentsCount
          }
        />
      )}
    </article>
  );
});
