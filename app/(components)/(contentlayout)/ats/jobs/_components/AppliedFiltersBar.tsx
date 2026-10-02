'use client'

import React, { useMemo } from 'react'
import type { JobListQueryScope, JobSidebarFilters } from '@/shared/lib/ats/job-list-filters'
import {
  APPLIED_FILTER_CHIP_CLASS,
  buildAppliedFilterChips,
  removeAppliedFilterChip,
} from './jobsAppliedFilters'

export interface AppliedFiltersBarProps {
  filters: JobSidebarFilters
  setFilters: React.Dispatch<React.SetStateAction<JobSidebarFilters>>
  listJobOrigin: '' | 'internal' | 'external'
  setListJobOrigin: React.Dispatch<React.SetStateAction<'' | 'internal' | 'external'>>
  committedScope: JobListQueryScope | null
  setCommittedScope: React.Dispatch<React.SetStateAction<JobListQueryScope | null>>
  setPreviewScope: React.Dispatch<React.SetStateAction<JobListQueryScope | null>>
  salaryRangesConst: { min: number; max: number }
  experienceRangesConst: { min: number; max: number }
  onClearAll: () => void
  hasActiveFilters: boolean
}

export function AppliedFiltersBar({
  filters,
  setFilters,
  listJobOrigin,
  setListJobOrigin,
  committedScope,
  setCommittedScope,
  setPreviewScope,
  salaryRangesConst,
  experienceRangesConst,
  onClearAll,
  hasActiveFilters,
}: AppliedFiltersBarProps): React.JSX.Element | null {
  const chips = useMemo(
    () =>
      buildAppliedFilterChips({
        filters,
        listJobOrigin,
        committedScope,
        salaryMin: salaryRangesConst.min,
        salaryMax: salaryRangesConst.max,
        experienceMin: experienceRangesConst.min,
        experienceMax: experienceRangesConst.max,
      }),
    [filters, listJobOrigin, committedScope, salaryRangesConst, experienceRangesConst]
  )

  if (chips.length === 0) return null

  const removeCtx = {
    filters,
    setFilters,
    setListJobOrigin,
    setCommittedScope,
    setPreviewScope,
    salaryMin: salaryRangesConst.min,
    salaryMax: salaryRangesConst.max,
    experienceMin: experienceRangesConst.min,
    experienceMax: experienceRangesConst.max,
    defaultStatus: 'Active',
  }

  return (
    <div className="jobs-surface-x shrink-0 min-w-0 max-w-full border-b border-defaultborder/50 dark:border-white/10 bg-gray-50/80 dark:bg-black/10 py-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 shrink-0">
          Applied
        </span>
        {chips.map((chip) => (
          <span key={chip.id} className={APPLIED_FILTER_CHIP_CLASS}>
            <span className="truncate max-w-[14rem]">{chip.label}</span>
            <button
              type="button"
              className="shrink-0 rounded-full p-0.5 hover:bg-gray-200/80 dark:hover:bg-white/10 transition-colors"
              aria-label={`Remove filter ${chip.label}`}
              onClick={() => removeAppliedFilterChip(chip.id, removeCtx)}
            >
              <i className="ri-close-line text-[0.65rem]" aria-hidden />
            </button>
          </span>
        ))}
        {hasActiveFilters ? (
          <button
            type="button"
            className="text-[0.7rem] font-medium text-primary hover:underline ms-auto sm:ms-0"
            onClick={onClearAll}
          >
            Clear all
          </button>
        ) : null}
      </div>
    </div>
  )
}
