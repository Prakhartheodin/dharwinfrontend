"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getTaskId } from "@/shared/lib/api/tasks";
import type { Task } from "@/shared/lib/api/tasks";
import { TaskCard } from "./TaskCard";

export interface SortableCardRowProps {
  task: Task;
  selected?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onOpen?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onToggleSelect?: (taskId: string) => void;
}

export function SortableCardRow({
  task,
  selected,
  canEdit = false,
  canDelete,
  onOpen,
  onDelete,
  onToggleSelect,
}: SortableCardRowProps): React.JSX.Element {
  const id = getTaskId(task);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !canEdit });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <TaskCard
        task={task}
        selected={selected}
        isDragging={isDragging}
        readOnly={!canEdit}
        canDelete={canDelete}
        onOpen={onOpen}
        onDelete={onDelete}
        onToggleSelect={canEdit ? onToggleSelect : undefined}
        dragAttributes={canEdit ? attributes : undefined}
        dragListeners={canEdit ? listeners : undefined}
      />
    </div>
  );
}
