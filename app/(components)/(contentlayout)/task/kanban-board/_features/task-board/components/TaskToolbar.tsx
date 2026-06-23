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
        <div className={`${styles.kbToolbarCluster} min-w-0 flex-1 flex-col !items-stretch sm:flex-row sm:items-center`}>
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
          <div className="hidden w-full lg:block">
            <TaskFilters projects={projects} leavingCount={leavingCount} />
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:hidden">
            <button
              type="button"
              className="ti-btn ti-btn-light flex-1 !py-2"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <i className="ri-filter-3-line me-1" aria-hidden />
              Filters
            </button>
          </div>
        </div>
        <div className={styles.kbToolbarCluster}>
          <ViewToggle />
          <DensityToggle />
          <SavedViewsMenu userId={userId} onAfterApply={() => setMobileFiltersOpen(false)} />
          {extraActions}
        </div>
      </header>
      <TaskFilterDrawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        projects={projects}
      />
    </>
  );
}
