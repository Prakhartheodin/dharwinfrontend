"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardCard from "./DashboardCard";
import { countByStatus, TASK_STATUS_META } from "@/shared/lib/dashboard/employeeDashboard";
import { getTaskId, type Task, type TaskStatus } from "@/shared/lib/api/tasks";

export default function MyTasksCard({
  tasks,
  loading,
  error,
}: {
  tasks: Task[];
  loading: boolean;
  error?: string | null;
}) {
  const [active, setActive] = useState<TaskStatus | "all">("all");
  const counts = countByStatus(tasks);
  const shown = active === "all" ? tasks : tasks.filter((t) => t.status === active);

  const action = (
    <Link href="/task/kanban-board/" className="inline-flex items-center gap-1 text-[0.75rem] text-textmuted hover:text-defaulttextcolor dark:text-white/50">
      Task board
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </Link>
  );

  return (
    <DashboardCard title="All my tasks" meta={`${tasks.length} assigned`} action={action} bodyClassName="p-0">
      <div role="group" aria-label="Filter by task board status" className="flex flex-wrap gap-1 border-b border-defaultborder/60 px-5 py-3 dark:border-white/[0.07]">
        <button type="button" aria-pressed={active === "all"} onClick={() => setActive("all")}
          className={"flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.7rem] font-semibold transition-colors " +
            (active === "all" ? "bg-teal-500/15 text-teal-600 dark:text-teal-400" : "text-textmuted hover:text-defaulttextcolor dark:text-white/50")}>
          All <span className="font-bold tabular-nums">{tasks.length}</span>
        </button>
        {TASK_STATUS_META.map((s) => (
          <button key={s.key} type="button" aria-pressed={active === s.key} onClick={() => setActive(s.key)}
            style={active === s.key ? { backgroundColor: `${s.color}22`, color: s.color } : undefined}
            className={"flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.7rem] font-semibold transition-colors " +
              (active === s.key ? "" : "text-textmuted hover:text-defaulttextcolor dark:text-white/50")}>
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} <span className="font-bold tabular-nums">{counts[s.key]}</span>
          </button>
        ))}
      </div>

      <div className="px-5 pb-3.5 pt-1">
        {loading ? (
          <div className="h-32 animate-pulse rounded-lg bg-defaultborder/60 dark:bg-white/5" />
        ) : error ? (
          <div className="py-6 text-center" role="alert">
            <p className="text-[0.8125rem] font-semibold">Couldn&apos;t load your tasks</p>
            <p className="mt-1 text-[0.72rem] text-textmuted dark:text-white/50">{error}</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-[0.75rem] text-textmuted dark:text-white/50">
            Nothing in {active === "all" ? "your list" : TASK_STATUS_META.find((s) => s.key === active)?.label}.
          </p>
        ) : (
          shown.map((t, i) => {
            const meta = TASK_STATUS_META.find((s) => s.key === t.status);
            const taskId = getTaskId(t) || t._id || t.id || `task-${i}`;
            return (
              <div key={taskId} className="flex min-h-[2.625rem] items-center gap-2.5 border-b border-defaultborder/60 py-2 last:border-b-0 dark:border-white/[0.07]">
                <span aria-hidden="true" title={meta?.label} className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta?.color }} />
                <span className="min-w-0 flex-1 truncate text-[0.78rem]">{t.title}</span>
                <span className="shrink-0 text-[0.7rem] text-textmuted dark:text-white/50">{meta?.label}</span>
                {t.dueDate ? (
                  <span className="w-14 shrink-0 text-end text-[0.66rem] tabular-nums text-textmuted dark:text-white/50">
                    {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </DashboardCard>
  );
}
