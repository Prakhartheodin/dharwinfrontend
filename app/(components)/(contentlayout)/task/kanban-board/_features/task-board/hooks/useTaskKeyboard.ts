"use client";

import { useCallback } from "react";

export interface UseTaskKeyboardParams {
  onActivate?: () => void;
  disabled?: boolean;
}

/**
 * Shared keyboard handling for task cards (activate with Enter / Space).
 */
export function useTaskKeyboard({
  onActivate,
  disabled,
}: UseTaskKeyboardParams) {
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || !onActivate) return;
      if (e.key === "Enter" || e.key === " ") {
        if (e.key === " ") e.preventDefault();
        onActivate();
      }
    },
    [disabled, onActivate]
  );

  return { onKeyDown };
}
