"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { TaskStatus } from "@/shared/lib/api/tasks";
import { useAuth } from "@/shared/contexts/auth-context";
import type { Density, DrawerMode, ViewMode } from "../types";
import {
  STORAGE_KEY_DENSITY,
  STORAGE_KEY_VIEW_MODE,
} from "../lib/constants";
import { safeGetItem, safeSetItem } from "../lib/safe-storage";

export type TaskUIContextValue = {
  density: Density;
  setDensity: (d: Density) => void;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  drawerMode: DrawerMode;
  drawerTaskId: string | null;
  drawerCreateStatus: TaskStatus | null;
  openDrawer: (
    mode: DrawerMode,
    taskId?: string,
    createStatus?: TaskStatus
  ) => void;
  closeDrawer: () => void;
};

export const TaskUIContext = createContext<TaskUIContextValue | null>(null);

export function TaskUIProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const auth = useAuth();
  const userKey = auth?.user?.id ?? "anon";

  // P1.5 §6.2 — compact is the new default. Existing users keep their saved
  // preference (rehydrated below); new users land on compact.
  const [density, setDensityState] = useState<Density>("compact");
  const [viewMode, setViewModeState] = useState<ViewMode>("board");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [drawerCreateStatus, setDrawerCreateStatus] =
    useState<TaskStatus | null>(null);

  useEffect(() => {
    const dRaw = safeGetItem(STORAGE_KEY_DENSITY(userKey));
    if (dRaw === "compact" || dRaw === "comfortable") {
      setDensityState(dRaw);
    }
    const vRaw = safeGetItem(STORAGE_KEY_VIEW_MODE(userKey));
    if (vRaw === "board" || vRaw === "list") {
      setViewModeState(vRaw);
    }
  }, [userKey]);

  const setDensity = useCallback(
    (d: Density) => {
      setDensityState(d);
      safeSetItem(STORAGE_KEY_DENSITY(userKey), d);
    },
    [userKey]
  );

  const setViewMode = useCallback(
    (m: ViewMode) => {
      setViewModeState(m);
      safeSetItem(STORAGE_KEY_VIEW_MODE(userKey), m);
    },
    [userKey]
  );

  const openDrawer = useCallback(
    (mode: DrawerMode, taskId?: string, createStatus?: TaskStatus) => {
      setDrawerMode(mode);
      if (mode === "create") {
        setDrawerTaskId(null);
        setDrawerCreateStatus(createStatus ?? "new");
      } else if (mode === "edit") {
        setDrawerTaskId(taskId ?? null);
        setDrawerCreateStatus(null);
      } else {
        setDrawerTaskId(null);
        setDrawerCreateStatus(null);
      }
    },
    []
  );

  const closeDrawer = useCallback(() => {
    setDrawerMode(null);
    setDrawerTaskId(null);
    setDrawerCreateStatus(null);
  }, []);


  const value = useMemo<TaskUIContextValue>(
    () => ({
      density,
      setDensity,
      viewMode,
      setViewMode,
      drawerMode,
      drawerTaskId,
      drawerCreateStatus,
      openDrawer,
      closeDrawer,
    }),
    [
      density,
      setDensity,
      viewMode,
      setViewMode,
      drawerMode,
      drawerTaskId,
      drawerCreateStatus,
      openDrawer,
      closeDrawer,
    ]
  );

  return (
    <TaskUIContext.Provider value={value}>{children}</TaskUIContext.Provider>
  );
}

export function useTaskUI(): TaskUIContextValue {
  const ctx = useContext(TaskUIContext);
  if (!ctx) {
    throw new Error("useTaskUI must be used within TaskUIProvider");
  }
  return ctx;
}
