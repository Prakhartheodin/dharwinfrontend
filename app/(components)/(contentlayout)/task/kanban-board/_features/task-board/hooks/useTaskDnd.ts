"use client";

import { useCallback, useState } from "react";
import {
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

export interface UseTaskDndParams {
  onDragEnd: (event: DragEndEvent) => void;
}

// Prefer the droppable directly under the pointer; fall back to rect intersection.
// This ensures individual task cards win over the large column-body droppable.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length > 0) return hits;
  return rectIntersection(args);
};

export function useTaskDnd({ onDragEnd }: UseTaskDndParams) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const onDragEndWrapped = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      onDragEnd(e);
    },
    [onDragEnd]
  );

  const onDragCancel = useCallback((_e?: DragCancelEvent) => {
    setActiveId(null);
  }, []);

  return {
    sensors,
    collisionDetection,
    activeId,
    onDragStart,
    onDragEnd: onDragEndWrapped,
    onDragCancel,
  };
}
