'use client'

import React from 'react'

export type ModuleLifecycleStatus = 'draft' | 'published' | 'archived'

const STATUS_STYLES: Record<ModuleLifecycleStatus, string> = {
  published:
    'bg-success/15 text-success border-success/30 dark:bg-success/20',
  draft:
    'bg-warning/15 text-warning border-warning/40 dark:bg-warning/20',
  archived:
    'bg-black/10 text-[#6b7280] border-black/15 dark:bg-white/10 dark:text-white/60 dark:border-white/20',
}

/**
 * Maps unknown API status strings to a known lifecycle status.
 */
export function normalizeModuleStatus(status: string | undefined): ModuleLifecycleStatus {
  if (status === 'published' || status === 'archived' || status === 'draft') return status
  return 'draft'
}

/**
 * Compact, high-contrast lifecycle badge for module cards and folder chrome.
 */
export default function ModuleStatusBadge({
  status,
  className = '',
}: {
  status: string | undefined
  className?: string
}) {
  const normalized = normalizeModuleStatus(status)
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1)

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[0.6875rem] font-semibold uppercase tracking-wide border ${STATUS_STYLES[normalized]} ${className}`}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  )
}
