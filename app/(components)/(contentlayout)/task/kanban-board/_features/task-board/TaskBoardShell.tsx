"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { deleteTask, getTaskId } from "@/shared/lib/api/tasks";
import type { TaskStatus } from "@/shared/lib/api/tasks";
import { compilePredicate } from "./lib/filter-predicates";
import { getTaskBoardCapabilities } from "./lib/task-board-capabilities";
import { toast } from "./lib/toast";
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
  const { canCreate: canCreateTask, canEdit: canEditTask, canDelete: canDeleteTask } =
    getTaskBoardCapabilities(auth);
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

  const { projects, users, tasks, leavingTotal, refetch, isLoading } = useTaskData();

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
  // True total across all pages (server-computed, scoped), not just the loaded page.
  const leavingCount = leavingTotal;

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

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      if (!canDeleteTask || !taskId) return;
      const r = await toast.confirm("Delete this task permanently?", {
        title: "Delete task?",
      });
      if (!r.isConfirmed) return;
      try {
        await deleteTask(taskId);
        if (drawerTaskId === taskId) closeDrawer();
        trackTaskBoard("taskboard.task_deleted", { taskId });
        await refetch();
        toast.success("Task deleted.");
      } catch {
        toast.error("Could not delete task.");
      }
    },
    [canDeleteTask, closeDrawer, drawerTaskId, refetch]
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
        leavingCount={leavingCount}
        extraActions={createButton}
      />
      <BulkActionBar canEdit={canEditTask} canDelete={canDeleteTask} />
      {viewMode === "list" ? (
        <TaskListView
          canEdit={canEditTask}
          canDelete={canDeleteTask}
          onOpenTask={canEditTask ? handleOpenTask : undefined}
          onDeleteTask={canDeleteTask ? handleDeleteTask : undefined}
        />
      ) : (
        <TaskBoard
          canCreate={canCreateTask}
          canEdit={canEditTask}
          canDelete={canDeleteTask}
          onQuickAdd={handleQuickAdd}
          onOpenTask={canEditTask ? handleOpenTask : undefined}
          onDeleteTask={canDeleteTask ? handleDeleteTask : undefined}
        />
      )}
      <TaskDrawer
        open={!!drawerMode}
        mode={drawerMode}
        task={drawerTask}
        createStatus={drawerCreateStatus}
        projects={projects}
        users={users}
        canDelete={canDeleteTask}
        onDelete={
          drawerMode === "edit" && drawerTask && canDeleteTask
            ? () => void handleDeleteTask(getTaskId(drawerTask))
            : undefined
        }
        onClose={closeDrawer}
        onSaved={() => void refetch()}
      />
    </>
  );
}
