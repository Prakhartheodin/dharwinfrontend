"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export interface UseUnsavedChangesParams<T> {
  /** Current editable snapshot */
  value: T;
  /** When this changes, baseline resets to the current `value` */
  baselineKey?: string | number | null;
}

/**
 * Tracks whether `value` differs from the baseline captured when `baselineKey` last changed.
 */
export function useUnsavedChanges<T>({ value, baselineKey }: UseUnsavedChangesParams<T>) {
  const baselineRef = useRef<string | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    baselineRef.current = stableStringify(value);
    bump((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- baseline only when identity changes
  }, [baselineKey]);

  const serialized = useMemo(() => stableStringify(value), [value]);

  const isDirty = baselineRef.current !== null && serialized !== baselineRef.current;

  const resetBaseline = useCallback(() => {
    baselineRef.current = stableStringify(value);
    bump((n) => n + 1);
  }, [value]);

  return { isDirty, resetBaseline };
}
