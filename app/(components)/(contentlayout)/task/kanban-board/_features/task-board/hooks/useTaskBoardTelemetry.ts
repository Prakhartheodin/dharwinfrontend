"use client";

import { useCallback, useRef } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

export interface TaskBoardTelemetryPayload {
  taskId: string;
  fromStatus?: string;
  toStatus?: string;
  durationMs?: number;
}

export interface UseTaskBoardTelemetryParams {
  onDragStart?: (p: TaskBoardTelemetryPayload) => void;
  onDragEnd?: (p: TaskBoardTelemetryPayload) => void;
}

export function useTaskBoardTelemetry({
  onDragStart,
  onDragEnd,
}: UseTaskBoardTelemetryParams) {
  const dragStartedAt = useRef<number | null>(null);
  const lastTaskId = useRef<string | null>(null);

  const handleDragStart = useCallback(
    (e: DragStartEvent) => {
      const taskId = String(e.active.id);
      lastTaskId.current = taskId;
      dragStartedAt.current =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      onDragStart?.({ taskId });
    },
    [onDragStart]
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent, resolved: { toStatus?: string; fromStatus?: string }) => {
      const taskId = String(e.active.id);
      const started = dragStartedAt.current;
      const durationMs =
        started != null && typeof performance !== "undefined"
          ? Math.round(performance.now() - started)
          : undefined;
      dragStartedAt.current = null;
      onDragEnd?.({
        taskId,
        fromStatus: resolved.fromStatus,
        toStatus: resolved.toStatus,
        durationMs,
      });
    },
    [onDragEnd]
  );

  return { handleDragStart, handleDragEnd, lastDraggedId: lastTaskId };
}
