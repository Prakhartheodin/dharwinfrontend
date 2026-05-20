"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import { getTaskId } from "@/shared/lib/api/tasks";
import type { TaskStatus } from "@/shared/lib/api/tasks";
import { compilePredicate } from "./lib/filter-predicates";
import { trackTaskBoard } from "./lib/telemetry";
import { useTaskFilters } from "./hooks/useTaskFilters";
import { useTaskUI } from "./hooks/useTaskUI";
import { useTaskData } from "./providers/TaskDataProvider";
import { useTaskBoardKeyboard } from "./hooks/useTaskBoardKeyboard";
import { TaskToolbar } from "./components/TaskToolbar";
import { TaskBoard } from "./components/TaskBoard";
import { TaskListView } from "./components/TaskListView";
import { BulkActionBar } from "./components/BulkActionBar";
import { TaskDrawer } from "./components/TaskDrawer";

export function TaskBoardShell(): React.JSX.Element {
  const auth = useAuth();
  const userId = auth?.user?.id ?? "anon";
  const canCreateTask = hasPermission(auth, "create_task");
  const canEditTask = hasPermission(auth, "update_task");
  const viewed = useRef(false);

  const { filters } = useTaskFilters();
  const {
    density,
    viewMode,
    drawerMode,
    drawerTaskId,
    drawerCreateStatus,
    openDrawer,
    closeDrawer,
  } = useTaskUI();

  const { projects, users, tasks, refetch, isLoading } = useTaskData();

  useTaskBoardKeyboard({ canCreate: canCreateTask });

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackTaskBoard("taskboard.viewed", { boardVersion: "v2" });
    if (typeof performance !== "undefined") {
      performance.mark("taskboard.first_paint");
    }
  }, []);

  useEffect(() => {
    if (!isLoading && typeof performance !== "undefined") {
      performance.mark("taskboard.first_interactive");
    }
  }, [isLoading]);

  const predicate = useMemo(() => compilePredicate(filters), [filters]);
  const visibleCount = useMemo(
    () => tasks.filter((t) => predicate(t)).length,
    [tasks, predicate]
  );

  const drawerTask = useMemo(() => {
    if (!drawerTaskId) return null;
    return tasks.find((t) => getTaskId(t) === drawerTaskId) ?? null;
  }, [drawerTaskId, tasks]);

  useEffect(() => {
    const root = document.querySelector("[data-kb-root]") as HTMLElement | null;
    if (root) root.dataset.density = density;
  }, [density]);

  useEffect(() => {
    const root = document.querySelector("[data-kb-root]") as HTMLElement | null;
    if (!root || typeof navigator === "undefined") return;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowPerf =
      navigator.hardwareConcurrency <= 4 ||
      (nav.deviceMemory ?? 8) < 4 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.dataset.lowPerf = lowPerf ? "true" : "false";
  }, []);

  const handleQuickAdd = useCallback(
    (status: TaskStatus) => {
      if (!canCreateTask) return;
      openDrawer("create", undefined, status);
    },
    [canCreateTask, openDrawer]
  );

  const handleOpenTask = useCallback(
    (taskId: string) => {
      if (!canEditTask) return;
      openDrawer("edit", taskId);
    },
    [canEditTask, openDrawer]
  );

  const createButton = canCreateTask ? (
    <button
      type="button"
      className="ti-btn ti-btn-primary !py-2"
      onClick={() => openDrawer("create", undefined, "new")}
    >
      <i className="ri-add-line me-1" aria-hidden />
      New task
    </button>
  ) : null;

  return (
    <>
      <TaskToolbar
        userId={userId}
        projects={projects}
        taskCount={visibleCount}
        extraActions={createButton}
      />
      <BulkActionBar />
      {viewMode === "list" ? (
        <TaskListView onOpenTask={handleOpenTask} />
      ) : (
        <TaskBoard
          canCreate={canCreateTask}
          onQuickAdd={handleQuickAdd}
          onOpenTask={handleOpenTask}
        />
      )}
      <TaskDrawer
        open={!!drawerMode}
        mode={drawerMode}
        task={drawerTask}
        createStatus={drawerCreateStatus}
        projects={projects}
        users={users}
        onClose={closeDrawer}
        onSaved={() => void refetch()}
      />
    </>
  );
}
