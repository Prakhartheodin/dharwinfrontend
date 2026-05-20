"use client";

import React, { createContext, useContext, useMemo } from "react";

export type TaskRealtimeContextValue = Record<string, never>;

const TaskRealtimeContext = createContext<TaskRealtimeContextValue | null>(
  null
);

export function TaskRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useMemo<TaskRealtimeContextValue>(() => ({}), []);
  return (
    <TaskRealtimeContext.Provider value={value}>
      {children}
    </TaskRealtimeContext.Provider>
  );
}

export function useTaskRealtimeCtx(): TaskRealtimeContextValue {
  const ctx = useContext(TaskRealtimeContext);
  if (!ctx) {
    throw new Error("useTaskRealtimeCtx must be used within TaskRealtimeProvider");
  }
  return ctx;
}
