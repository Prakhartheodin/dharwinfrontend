"use client";

import React, { memo } from "react";
import type { Task } from "@/shared/lib/api/tasks";
import { sanitizeText } from "../lib/sanitize";
import styles from "../../../kanban-board.module.css";

export const TaskCardGhost = memo(function TaskCardGhost({
  task,
  batchCount = 1,
}: {
  task: Task;
  batchCount?: number;
}): React.JSX.Element {
  const title = sanitizeText(task.title);
  return (
    <div className={styles.kbTaskCardGhost} aria-hidden>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[0.75rem] font-semibold text-slate-700 dark:text-slate-200">
          {title || "Task"}
        </div>
        {batchCount > 1 ? (
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
            {batchCount}
          </span>
        ) : null}
      </div>
      <div className="mt-2 h-2 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
    </div>
  );
});
