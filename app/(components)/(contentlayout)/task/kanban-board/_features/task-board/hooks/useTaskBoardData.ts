"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Task, TaskStatus } from "@/shared/lib/api/tasks";
import {
  getTaskId,
  listTasks,
  updateTaskStatus,
} from "@/shared/lib/api/tasks";
import { listProjects } from "@/shared/lib/api/projects";
import { listUsers } from "@/shared/lib/api/users";
import {
  PM_DATA_MUTATED_EVENT,
  usePmRefetchOnFocus,
} from "@/shared/hooks/usePmRefetchOnFocus";
import { getErrorMessage } from "../lib/errors";
import { TASK_LIMIT } from "../lib/constants";
import type { TaskFilters } from "../types";

export type ProjectRow = { id: string; name: string };
export type UserRow = { id: string; name: string; email: string };

export function useTaskBoardData(filters: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectIdParam = useMemo(() => {
    if (filters.projectIds.length === 1) return filters.projectIds[0];
    return undefined;
  }, [filters.projectIds]);

  const priorityParam = useMemo(() => {
    if (filters.priorities.length > 0) return filters.priorities.join(",");
    return undefined;
  }, [filters.priorities]);

  const sprintIdParam = useMemo(() => {
    if (filters.sprintIds.length === 1) return filters.sprintIds[0];
    return undefined;
  }, [filters.sprintIds]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskRes, projRes, userRes] = await Promise.all([
        listTasks({
          limit: TASK_LIMIT,
          ...(filters.q.trim() && { search: filters.q.trim() }),
          ...(projectIdParam && { projectId: projectIdParam }),
          ...(priorityParam && { priority: priorityParam }),
          ...(sprintIdParam && { sprintId: sprintIdParam }),
          ...(filters.assignedToMe && { assignedToMe: true }),
        }),
        listProjects({ limit: 200 }),
        listUsers({ limit: 200 }),
      ]);
      setTasks(taskRes.results ?? []);
      setProjects(
        (projRes.results ?? []).map((p) => ({
          id: (p as { id?: string }).id ?? p._id,
          name: p.name ?? "",
        }))
      );
      setUsers(
        (userRes.results ?? []).map((u) => ({
          id: u.id ?? u._id ?? "",
          name: u.name ?? "",
          email: u.email ?? "",
        }))
      );
    } catch (e) {
      setError(getErrorMessage(e));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filters.q, filters.assignedToMe, projectIdParam, priorityParam, sprintIdParam]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => void load();
    window.addEventListener(PM_DATA_MUTATED_EVENT, onRefresh);
    return () => window.removeEventListener(PM_DATA_MUTATED_EVENT, onRefresh);
  }, [load]);

  usePmRefetchOnFocus(load);

  const moveTask = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const prev = tasks;
      setTasks((list) =>
        list.map((t) => (getTaskId(t) === taskId ? { ...t, status: newStatus } : t))
      );
      try {
        await updateTaskStatus(taskId, newStatus);
        void load();
      } catch {
        setTasks(prev);
        throw new Error("Failed to update task status.");
      }
    },
    [tasks, load]
  );

  return {
    tasks,
    projects,
    users,
    loading,
    error,
    reload: load,
    moveTask,
  };
}

export { getTaskId };

/** Alias for consumers expecting `useTaskData`. */
export { useTaskBoardData as useTaskData };
