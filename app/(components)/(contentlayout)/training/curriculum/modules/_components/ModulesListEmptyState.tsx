'use client'

import Link from 'next/link'
import React from 'react'
import type { TrainingModulesListStatus } from '@/shared/lib/training/group-modules-into-folders'

const COPY: Record<
  TrainingModulesListStatus,
  { title: string; body: string; showCreate: boolean }
> = {
  all: {
    title: 'No modules yet',
    body: 'Create a module to start the curriculum. Save as draft while you work, then publish when it is ready.',
    showCreate: true,
  },
  draft: {
    title: 'No drafts',
    body: 'Nothing in progress. Create a module and keep it as a draft until you are ready to publish.',
    showCreate: true,
  },
  published: {
    title: 'No published modules yet',
    body: 'Publish a draft when its playlist is ready. Published modules appear in category folders here.',
    showCreate: false,
  },
  archived: {
    title: 'Nothing archived',
    body: 'Archived modules are hidden from the live catalog. Archive a module from its row actions when you need it out of sight.',
    showCreate: false,
  },
}

export interface ModulesListEmptyStateProps {
  statusFilter: TrainingModulesListStatus
  /** When All is empty but archived modules exist. */
  archivedCount?: number
}

/**
 * Filter-specific empty catalog copy (not per-folder empty posters).
 */
export function ModulesListEmptyState({
  statusFilter,
  archivedCount = 0,
}: ModulesListEmptyStateProps) {
  const copy =
    statusFilter === 'all' && archivedCount > 0
      ? {
          title: 'No live modules',
          body: 'Nothing in Drafts or Published. Open the Archived tab to see hidden modules.',
          showCreate: true,
        }
      : COPY[statusFilter]
  return (
    <div className="rounded-xl border border-defaultborder bg-bodybg px-4 py-8 text-center">
      <p className="text-defaulttextcolor font-medium mb-1">{copy.title}</p>
      <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-0 max-w-lg mx-auto">
        {copy.body}
      </p>
      {copy.showCreate ? (
        <Link
          href="/training/curriculum/modules/create"
          className="ti-btn ti-btn-sm ti-btn-primary-full !mb-0 mt-3"
        >
          Create module
        </Link>
      ) : null}
    </div>
  )
}
