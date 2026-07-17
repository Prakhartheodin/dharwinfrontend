"use client";

import React, { useState } from "react";
import { SkipLinks } from "./SkipLinks";
import { TaskFilters } from "./TaskFilters";
import { TaskFilterDrawer } from "./TaskFilterDrawer";
import { SavedViewsMenu } from "./SavedViewsMenu";
import { ViewToggle } from "./ViewToggle";
import { DensityToggle } from "./DensityToggle";
import styles from "../../../kanban-board.module.css";

export interface TaskToolbarProps {
  userId: string;
  projects: Array<{ id: string; name: string }>;
  taskCount?: number;
  leavingCount?: number;
  extraActions?: React.ReactNode;
}

export function TaskToolbar({
  userId,
  projects,
  taskCount,
  leavingCount,
  extraActions,
}: TaskToolbarProps): React.JSX.Element {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <>
      <SkipLinks />
      <header className={styles.kbToolbar} role="banner">
        <div className={styles.kbToolbarCluster}>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Task board
          </span>
          <span
            className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {typeof taskCount === "number"
              ? `${taskCount.toString().padStart(2, "0")} tasks match filters`
              : "Loading task count"}
          </span>
        </div>
        <TaskFilters
          projects={projects}
          leavingCount={leavingCount}
          onOpenMobileFilters={() => setMobileFiltersOpen(true)}
          trailing={
            <>
              <ViewToggle />
              <DensityToggle />
              <SavedViewsMenu
                userId={userId}
                onAfterApply={() => setMobileFiltersOpen(false)}
              />
              {extraActions}
            </>
          }
        />
      </header>
      <TaskFilterDrawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        projects={projects}
        leavingCount={leavingCount}
      />
    </>
  );
}
