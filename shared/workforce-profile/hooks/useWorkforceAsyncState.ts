"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncConflict = {
  kind: "conflict";
  status: number;
  message: string;
  serverVersion?: number | string;
};

export type AsyncErrorState = {
  message: string;
  status?: number;
  conflict?: AsyncConflict;
  raw?: unknown;
};

export type LoadFn<TLoaded> = (
  id: string | undefined,
  signal: AbortSignal,
) => Promise<TLoaded>;

export type SaveFn<TPayload, TResult> = (
  payload: TPayload,
  signal: AbortSignal,
) => Promise<TResult>;

export type UseWorkforceAsyncStateOptions<TLoaded, TPayload, TResult> = {
  load: LoadFn<TLoaded>;
  save: SaveFn<TPayload, TResult>;
  onLoaded?: (data: TLoaded) => void;
  onSaved?: (result: TResult, payload: TPayload) => void;
  onConflict?: (conflict: AsyncConflict, payload: TPayload) => void;
  parseError?: (err: unknown) => AsyncErrorState;
};

export type UseWorkforceAsyncStateReturn<TLoaded, TPayload, TResult> = {
  isLoading: boolean;
  isSaving: boolean;
  loadError: AsyncErrorState | null;
  saveError: AsyncErrorState | null;
  lastLoadedAt: number | null;
  lastSavedAt: number | null;
  load: (id?: string) => Promise<TLoaded | null>;
  save: (payload: TPayload) => Promise<TResult | null>;
  clearLoadError: () => void;
  clearSaveError: () => void;
};

const isAbort = (err: unknown): boolean =>
  err instanceof DOMException
    ? err.name === "AbortError"
    : (err as { name?: string })?.name === "AbortError";

function defaultParseError(err: unknown): AsyncErrorState {
  if (err && typeof err === "object") {
    const e = err as {
      message?: string;
      response?: { status?: number; data?: { message?: string; version?: number | string } };
      status?: number;
    };
    const status = e.response?.status ?? e.status;
    const message =
      e.response?.data?.message ?? e.message ?? "Unexpected error";
    if (status === 409) {
      return {
        message,
        status,
        conflict: {
          kind: "conflict",
          status,
          message,
          serverVersion: e.response?.data?.version,
        },
        raw: err,
      };
    }
    return { message, status, raw: err };
  }
  return { message: String(err ?? "Unexpected error"), raw: err };
}

export function useWorkforceAsyncState<TLoaded, TPayload, TResult>(
  opts: UseWorkforceAsyncStateOptions<TLoaded, TPayload, TResult>,
): UseWorkforceAsyncStateReturn<TLoaded, TPayload, TResult> {
  const { load: loadFn, save: saveFn, onLoaded, onSaved, onConflict } = opts;
  const parseError = opts.parseError ?? defaultParseError;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<AsyncErrorState | null>(null);
  const [saveError, setSaveError] = useState<AsyncErrorState | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const loadTokenRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);
  const saveInFlightRef = useRef(false);
  const saveAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loadAbortRef.current?.abort();
      saveAbortRef.current?.abort();
    };
  }, []);

  const load = useCallback(
    async (id?: string): Promise<TLoaded | null> => {
      loadAbortRef.current?.abort();
      const controller = new AbortController();
      loadAbortRef.current = controller;
      const token = ++loadTokenRef.current;

      setIsLoading(true);
      setLoadError(null);

      try {
        const data = await loadFn(id, controller.signal);
        if (!mountedRef.current) return null;
        if (token !== loadTokenRef.current) return null;
        setLastLoadedAt(Date.now());
        onLoaded?.(data);
        return data;
      } catch (err) {
        if (isAbort(err)) return null;
        if (!mountedRef.current) return null;
        if (token !== loadTokenRef.current) return null;
        setLoadError(parseError(err));
        return null;
      } finally {
        if (mountedRef.current && token === loadTokenRef.current) {
          setIsLoading(false);
        }
      }
    },
    [loadFn, onLoaded, parseError],
  );

  const save = useCallback(
    async (payload: TPayload): Promise<TResult | null> => {
      if (saveInFlightRef.current) return null;
      saveInFlightRef.current = true;

      saveAbortRef.current?.abort();
      const controller = new AbortController();
      saveAbortRef.current = controller;

      setIsSaving(true);
      setSaveError(null);

      try {
        const result = await saveFn(payload, controller.signal);
        if (!mountedRef.current) return null;
        setLastSavedAt(Date.now());
        onSaved?.(result, payload);
        return result;
      } catch (err) {
        if (isAbort(err)) return null;
        if (!mountedRef.current) return null;
        const parsed = parseError(err);
        setSaveError(parsed);
        if (parsed.conflict) onConflict?.(parsed.conflict, payload);
        return null;
      } finally {
        saveInFlightRef.current = false;
        if (mountedRef.current) setIsSaving(false);
      }
    },
    [saveFn, onSaved, onConflict, parseError],
  );

  const clearLoadError = useCallback(() => setLoadError(null), []);
  const clearSaveError = useCallback(() => setSaveError(null), []);

  return {
    isLoading,
    isSaving,
    loadError,
    saveError,
    lastLoadedAt,
    lastSavedAt,
    load,
    save,
    clearLoadError,
    clearSaveError,
  };
}
