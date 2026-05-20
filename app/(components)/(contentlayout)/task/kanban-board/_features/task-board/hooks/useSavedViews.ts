"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  LocalStorageAdapter,
  type SavedViewsAdapter,
} from "../lib/saved-views-adapter";
import type { SavedView, SavedViewInput } from "../types";
import { TaskFiltersContext } from "../providers/TaskFiltersProvider";
import { TaskUIContext } from "../providers/TaskUIProvider";
import { trackTaskBoard } from "../lib/telemetry";

export function useSavedViews(userId: string) {
  const adapter = useMemo<SavedViewsAdapter>(
    () => new LocalStorageAdapter(userId),
    [userId]
  );
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersCtx = useContext(TaskFiltersContext);
  const uiCtx = useContext(TaskUIContext);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setViews(await adapter.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load views.");
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: SavedViewInput) => {
      const view = await adapter.create(input);
      trackTaskBoard("taskboard.view_saved", { name: input.name });
      await refresh();
      return view;
    },
    [adapter, refresh]
  );

  const update = useCallback(
    async (id: string, patch: Partial<SavedViewInput>) => {
      const view = await adapter.update(id, patch);
      await refresh();
      return view;
    },
    [adapter, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await adapter.delete(id);
      await refresh();
    },
    [adapter, refresh]
  );

  /** Applies filters, board/list mode, and density from a saved view (requires Task board providers). */
  const loadView = useCallback(
    (view: SavedView) => {
      trackTaskBoard("taskboard.view_loaded", { name: view.name });
      filtersCtx?.setFilters(view.filters);
      uiCtx?.setViewMode(view.view);
      uiCtx?.setDensity(view.density);
    },
    [filtersCtx, uiCtx]
  );

  return {
    views,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    loadView,
  };
}
