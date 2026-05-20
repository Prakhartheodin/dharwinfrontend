"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { VIRTUALIZATION_MIN_COUNT } from "../lib/constants";

export interface UseTaskVirtualizerParams {
  count: number;
  scrollRef: React.RefObject<HTMLElement | null>;
  estimateSize?: number;
  enabled?: boolean;
}

export function useTaskVirtualizer({
  count,
  scrollRef,
  estimateSize = 96,
  enabled,
}: UseTaskVirtualizerParams) {
  const shouldVirtualize = enabled ?? count >= VIRTUALIZATION_MIN_COUNT;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? count : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 6,
  });

  return shouldVirtualize ? virtualizer : null;
}
