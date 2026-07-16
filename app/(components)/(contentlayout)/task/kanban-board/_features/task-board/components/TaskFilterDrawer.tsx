"use client";

import React from "react";
import dynamic from "next/dynamic";
import { PRIORITY_OPTIONS } from "../lib/constants";
import { useTaskFilters } from "../hooks/useTaskFilters";
import { TaskFilterChip } from "./TaskFilterChip";
import { usePmReactSelectStyles } from "@/shared/hooks/usePmReactSelectStyles";
import styles from "../../../kanban-board.module.css";

const Select = dynamic(() => import("react-select"), { ssr: false });

export interface TaskFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  leavingCount?: number;
}

export function TaskFilterDrawer({
  open,
  onClose,
  projects,
  leavingCount = 0,
}: TaskFilterDrawerProps): React.JSX.Element {
  const {
    filters,
    patchFilters,
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
    priorities,
    togglePriority,
    clearFilters,
    hasActiveFilters,
  } = useTaskFilters();

  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } =
    usePmReactSelectStyles(10001);

  return (
    <div
      className={`${styles.kbFilterDrawer} ${open ? styles.kbFilterDrawerOpen : ""}`}
      aria-hidden={!open}
    >
      {open ? (
        <>
          <button
            type="button"
            className={styles.kbFilterDrawerBackdrop}
            aria-label="Close filters"
            onClick={onClose}
          />
          <div className={styles.kbFilterDrawerPanel} role="dialog" aria-modal="true">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Filters</h2>
              <button type="button" className="ti-btn ti-btn-light !py-1 !px-2" onClick={onClose}>
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Project</label>
                <Select
                  placeholder="All projects"
                  options={[
                    { value: "", label: "All projects" },
                    ...projects.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                  value={
                    projectId
                      ? {
                          value: projectId,
                          label:
                            projects.find((p) => p.id === projectId)?.name ?? projectId,
                        }
                      : { value: "", label: "All projects" }
                  }
                  onChange={(opt) =>
                    setProjectId(((opt as { value: string } | null)?.value) ?? "")
                  }
                  className="w-full"
                  menuPortalTarget={selectMenuPortalTarget}
                  styles={selectMenuLayerStyles}
                  classNamePrefix="Select2"
                />
              </div>
              <div>
                <label className="form-label">Search</label>
                <input
                  type="search"
                  className="form-control w-full !rounded-md"
                  placeholder="Task name, employee name, or employee ID"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={assignedToMe}
                  onChange={(e) => setAssignedToMe(e.target.checked)}
                />
                Assigned to me
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={unassigned}
                  onChange={(e) => setUnassigned(e.target.checked)}
                />
                Unassigned
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.leaving}
                  onChange={(e) => patchFilters({ leaving: e.target.checked })}
                />
                {leavingCount > 0 ? `Leaving · ${leavingCount}` : "Leaving"}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reassigned}
                  onChange={(e) => setReassigned(e.target.checked)}
                />
                Reassigned
              </label>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </div>
                <div className="flex flex-wrap gap-1">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <TaskFilterChip
                      key={opt.value}
                      label={opt.label}
                      active={priorities.includes(opt.value)}
                      onClick={() => togglePriority(opt.value)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="ti-btn ti-btn-primary flex-1"
                  onClick={onClose}
                >
                  Apply
                </button>
                {hasActiveFilters ? (
                  <button type="button" className="ti-btn ti-btn-light" onClick={clearFilters}>
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
