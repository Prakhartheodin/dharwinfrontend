'use client'

import Link from 'next/link'
import React, { useCallback } from 'react'
import type {
  TrainingModuleLifecycleCounts,
  TrainingModulesListStatus,
} from '@/shared/lib/training/group-modules-into-folders'

const TABS: { id: TrainingModulesListStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'published', label: 'Published' },
  { id: 'archived', label: 'Archived' },
]

export interface ModulesStatusFilterProps {
  value: TrainingModulesListStatus
  counts: TrainingModuleLifecycleCounts
  /** URL for each tab (`?status=`). Click uses Link so the filter always lands. */
  hrefFor: (id: TrainingModulesListStatus) => string
  onChange: (next: TrainingModulesListStatus) => void
}

/**
 * Segmented status filter for the training modules catalog.
 */
export function ModulesStatusFilter({ value, counts, hrefFor, onChange }: ModulesStatusFilterProps) {
  const selectedIndex = Math.max(
    0,
    TABS.findIndex((t) => t.id === value)
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
        return
      }
      e.preventDefault()
      let nextIndex = selectedIndex
      if (e.key === 'ArrowRight') nextIndex = (selectedIndex + 1) % TABS.length
      if (e.key === 'ArrowLeft') nextIndex = (selectedIndex - 1 + TABS.length) % TABS.length
      if (e.key === 'Home') nextIndex = 0
      if (e.key === 'End') nextIndex = TABS.length - 1
      const next = TABS[nextIndex]
      if (next) onChange(next.id)
    },
    [onChange, selectedIndex]
  )

  return (
    <div
      role="tablist"
      aria-label="Filter modules by status"
      className="inline-flex flex-nowrap shrink-0 gap-0.5 rounded-md border border-defaultborder bg-black/[0.03] dark:bg-white/[0.04] p-0.5 h-9 items-center"
      onKeyDown={handleKeyDown}
    >
      {TABS.map((tab) => {
        const selected = value === tab.id
        const count = counts[tab.id]
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            scroll={false}
            role="tab"
            id={`modules-status-${tab.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`inline-flex items-center gap-1 rounded px-2 min-h-8 text-[0.75rem] font-medium no-underline whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              selected
                ? 'bg-bodybg text-defaulttextcolor shadow-sm'
                : 'text-[#8c9097] dark:text-white/60 hover:text-defaulttextcolor'
            }`}
          >
            {tab.label}
            <span
              className={`inline-flex min-w-[1.125rem] justify-center rounded-full px-1 text-[0.625rem] tabular-nums ${
                selected
                  ? 'bg-primary/10 text-primary'
                  : 'bg-black/5 text-[#8c9097] dark:bg-white/10 dark:text-white/50'
              }`}
            >
              {count}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
