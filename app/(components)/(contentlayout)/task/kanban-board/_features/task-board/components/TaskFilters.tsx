"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { PRIORITY_OPTIONS } from "../lib/constants";
import { useTaskFilters } from "../hooks/useTaskFilters";
import { TaskFilterChip } from "./TaskFilterChip";

const Select = dynamic(() => import("react-select"), { ssr: false });

export interface TaskFiltersProps {
  projects: Array<{ id: string; name: string }>;
}

export function TaskFilters({ projects }: TaskFiltersProps): React.JSX.Element {
  const {
    searchInput,
    setSearchInput,
    projectId,
    setProjectId,
    assignedToMe,
    setAssignedToMe,
    unassigned,
    setUnassigned,
    priorities,
    togglePriority,
    clearFilters,
    hasActiveFilters,
  } = useTaskFilters();

  const selectMenuPortalTarget = useMemo(
    () => (typeof window === "undefined" ? null : document.body),
    []
  );
  const selectMenuLayerStyles = useMemo(
    () => ({
      menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 }),
      menu: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 }),
    }),
    []
  );

  return (
    <div
      id="task-board-filters"
      className="flex flex-wrap items-stretch gap-2"
      role="search"
      aria-label="Task filters"
    >
      <div className="kb-project-select min-w-0 flex-1 sm:w-[16rem] sm:max-w-[18rem] sm:flex-none">
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

      <button
        type="button"
        onClick={() => setAssignedToMe(!assignedToMe)}
        aria-pressed={assignedToMe}
        className={
          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition " +
          (assignedToMe
            ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white/30")
        }
      >
        <i className={`ri-user-${assignedToMe ? "fill" : "line"}`} aria-hidden />
        Assigned to me
      </button>

      <button
        type="button"
        onClick={() => setUnassigned(!unassigned)}
        aria-pressed={unassigned}
        className={
          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition " +
          (unassigned
            ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white/30")
        }
      >
        <i className={`ri-user-unfollow-${unassigned ? "fill" : "line"}`} aria-hidden />
        Unassigned
      </button>

      <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-[22rem]">
        <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          className="h-9 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none dark:border-white/10 dark:bg-bgdark2 dark:text-slate-200 dark:focus:border-white/40"
          placeholder="Search tasks…"
          aria-label="Search tasks"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Priority">
        {PRIORITY_OPTIONS.map((opt) => (
          <TaskFilterChip
            key={opt.value}
            label={opt.label}
            active={priorities.includes(opt.value)}
            onClick={() => togglePriority(opt.value)}
          />
        ))}
      </div>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300"
        >
          <i className="ri-close-circle-line" aria-hidden />
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
