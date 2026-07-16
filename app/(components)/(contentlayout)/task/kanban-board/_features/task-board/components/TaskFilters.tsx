"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useTaskFilters } from "../hooks/useTaskFilters";
import { TaskAdvancedFilter } from "./TaskAdvancedFilter";
import { TaskFilterPill } from "./TaskFilterPill";
import { usePmReactSelectStyles } from "@/shared/hooks/usePmReactSelectStyles";
import styles from "../../../kanban-board.module.css";

const Select = dynamic(() => import("react-select"), { ssr: false });

export interface TaskFiltersProps {
  projects: Array<{ id: string; name: string }>;
  leavingCount?: number;
}

export function TaskFilters({ projects, leavingCount = 0 }: TaskFiltersProps): React.JSX.Element {
  const {
    searchInput,
    setSearchInput,
    projectId,
    setProjectId,
    assignedToMe,
    setAssignedToMe,
    unassigned,
    setUnassigned,
    reassigned,
    setReassigned,
    clearFilters,
    hasActiveFilters,
  } = useTaskFilters();

  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } =
    usePmReactSelectStyles(9999);

  return (
    <div
      id="task-board-filters"
      className={styles.kbFilterBar}
      role="search"
      aria-label="Task filters"
    >
      <div className={styles.kbFilterBarPrimary}>
        <div className={`kb-project-select ${styles.kbFilterProject}`}>
          <Select
            name="project"
            placeholder="All projects"
            options={[
              { value: "", label: "All projects" },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={
              projectId
                ? {
                    value: projectId,
                    label: projects.find((p) => p.id === projectId)?.name ?? projectId,
                  }
                : { value: "", label: "All projects" }
            }
            onChange={(opt) =>
              setProjectId(((opt as { value: string } | null)?.value) ?? "")
            }
            className="w-full"
            menuPlacement="auto"
            menuPosition="fixed"
            menuPortalTarget={selectMenuPortalTarget}
            styles={selectMenuLayerStyles}
            classNamePrefix="Select2"
          />
        </div>

        <div className={styles.kbFilterAssignment} role="group" aria-label="Assignment">
          <TaskFilterPill
            label="Assigned to me"
            active={assignedToMe}
            iconClass={`ri-user-${assignedToMe ? "fill" : "line"}`}
            onClick={() => setAssignedToMe(!assignedToMe)}
          />
          <TaskFilterPill
            label="Unassigned"
            active={unassigned}
            iconClass={`ri-user-unfollow-${unassigned ? "fill" : "line"}`}
            onClick={() => setUnassigned(!unassigned)}
          />
          <TaskFilterPill
            label="Reassigned"
            active={reassigned}
            iconClass={`ri-user-shared-${reassigned ? "fill" : "line"}`}
            onClick={() => setReassigned(!reassigned)}
          />
        </div>

        <div className={styles.kbFilterSearchWrap}>
          <i className={`ri-search-line ${styles.kbFilterSearchIcon}`} aria-hidden />
          <input
            type="search"
            className={styles.kbFilterSearchInput}
            placeholder="Search by task, employee, or ID"
            aria-label="Search by task, employee, or ID"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.kbFilterBarSecondary}>
        <TaskAdvancedFilter leavingCount={leavingCount} />

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className={styles.kbFilterClearBtn}
          >
            <i className="ri-close-circle-line" aria-hidden />
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
