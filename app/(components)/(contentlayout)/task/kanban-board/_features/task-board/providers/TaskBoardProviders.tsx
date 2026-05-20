"use client";

import React from "react";
import { TaskFiltersProvider } from "./TaskFiltersProvider";
import { TaskUIProvider } from "./TaskUIProvider";

export function TaskBoardProviders({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <TaskFiltersProvider>
      <TaskUIProvider>{children}</TaskUIProvider>
    </TaskFiltersProvider>
  );
}

export { TaskFiltersProvider } from "./TaskFiltersProvider";
export { TaskUIProvider } from "./TaskUIProvider";
export type { TaskFiltersContextValue } from "./TaskFiltersProvider";
export type { TaskUIContextValue } from "./TaskUIProvider";
