"use client";

import React from "react";
import { TaskFiltersProvider } from "./TaskFiltersProvider";
import { TaskDataProvider } from "./TaskDataProvider";
import { TaskSelectionProvider } from "./TaskSelectionProvider";
import { TaskUIProvider } from "./TaskUIProvider";
import { TaskRealtimeProvider } from "./TaskRealtimeProvider";

/**
 * Composes task-board context providers. Nest order: filters → UI → realtime →
 * data (reads filters) → selection.
 */
export function TaskBoardProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <TaskFiltersProvider>
      <TaskUIProvider>
        <TaskRealtimeProvider>
          <TaskDataProvider>
            <TaskSelectionProvider>{children}</TaskSelectionProvider>
          </TaskDataProvider>
        </TaskRealtimeProvider>
      </TaskUIProvider>
    </TaskFiltersProvider>
  );
}

export { useTaskData } from "./TaskDataProvider";
export { useTaskFilters } from "./TaskFiltersProvider";
export { useTaskSelection } from "./TaskSelectionProvider";
export { useTaskUI } from "./TaskUIProvider";
export { useTaskRealtimeCtx } from "./TaskRealtimeProvider";
