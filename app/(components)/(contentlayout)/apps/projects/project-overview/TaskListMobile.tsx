"use client";

import React from "react";
import { getTaskId, TASK_STATUS_LABELS, type Task, type TaskStatus } from "@/shared/lib/api/tasks";
import type { ProjectPriority } from "@/shared/lib/api/projects";

export type ProjectTasksMobileListProps = {
  tasks: Task[];
  taskStatusBadge: Record<TaskStatus, string>;
  priorityBadge: Record<ProjectPriority, string>;
  renderAssignees: (task: Task) => React.ReactNode;
  renderDueDate: (task: Task) => React.ReactNode;
  listRef?: React.Ref<HTMLDivElement>;
};

/** Stacked task cards for viewports below lg — same data as the desktop table, no extra fetch. */
export function ProjectTasksMobileList({
  tasks,
  taskStatusBadge,
  priorityBadge,
  renderAssignees,
  renderDueDate,
  listRef,
}: ProjectTasksMobileListProps): JSX.Element {
  return (
    <div
      ref={listRef}
      className="lg:hidden flex-1 max-h-[min(60vh,36rem)] w-full min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3 sm:px-4 min-h-0 [scrollbar-width:thin]"
      aria-label="Project tasks"
    >
      <ul className="list-none m-0 p-0 space-y-3" role="list">
        {tasks.map((t) => {
          const taskId = getTaskId(t);
          const title = t.title?.trim() || "Untitled task";
          return (
            <li key={taskId} role="listitem">
              <article
                className="rounded-xl border border-defaultborder/70 dark:border-white/10 bg-white dark:bg-bodybg shadow-sm p-3.5 sm:p-4"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white leading-snug break-words text-[0.9375rem] m-0">
                    {title}
                  </h3>
                  {t.taskCode ? (
                    <p className="mt-0.5 mb-0 text-[0.75rem] font-mono text-[#8c9097] dark:text-white/50 break-all">
                      {t.taskCode}
                    </p>
                  ) : null}
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`badge ${taskStatusBadge[t.status] ?? "bg-light text-default"}`}
                  >
                    {TASK_STATUS_LABELS[t.status] ?? t.status}
                  </span>
                  {t.priority ? (
                    <span
                      className={`badge ${priorityBadge[t.priority] ?? "bg-light text-default"}`}
                    >
                      {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                    </span>
                  ) : (
                    <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">No priority</span>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <span className="block text-[0.6875rem] font-medium uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1">
                      Assignees
                    </span>
                    {renderAssignees(t)}
                  </div>
                  <div className="shrink-0 sm:text-end">
                    <span className="block text-[0.6875rem] font-medium uppercase tracking-wide text-[#8c9097] dark:text-white/50 mb-1">
                      Due date
                    </span>
                    {renderDueDate(t)}
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
