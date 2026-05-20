"use client";

import React, { memo } from "react";
import type { TaskStatus } from "@/shared/lib/api/tasks";
import { TASK_STATUS_LABELS } from "@/shared/lib/api/tasks";
import type { Priority } from "../types";
import styles from "../../../kanban-board.module.css";

export type TaskBadgeVariant = "status" | "priority" | "label";

export interface TaskBadgeProps {
  variant: TaskBadgeVariant;
  value: string;
  className?: string;
}

function priorityClass(p: string): string {
  switch (p) {
    case "low":
      return styles.kbBadgePriorityLow;
    case "medium":
      return styles.kbBadgePriorityMedium;
    case "high":
      return styles.kbBadgePriorityHigh;
    case "urgent":
      return styles.kbBadgePriorityUrgent;
    default:
      return styles.kbBadgePriorityMedium;
  }
}

export const TaskBadge = memo(function TaskBadge({
  variant,
  value,
  className,
}: TaskBadgeProps): React.JSX.Element {
  const label =
    variant === "status"
      ? TASK_STATUS_LABELS[value as TaskStatus] ?? value
      : value;

  const extra =
    variant === "status"
      ? styles.kbBadgeStatus
      : variant === "priority"
        ? priorityClass(value as Priority)
        : styles.kbBadgeLabel;

  return (
    <span className={`${styles.kbBadge} ${extra} ${className ?? ""}`}>
      {label}
    </span>
  );
});
