'use client'

import React from 'react'

const STATUS_CLASS: Record<string, string> = {
  Active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  Closed: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  Archived: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  Draft: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30',
}

export function JobStatusBadge({ status }: { status?: string | null }): React.JSX.Element {
  const label = status?.trim() || '—'
  const cls =
    STATUS_CLASS[label] ?? 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30'
  return (
    <span
      className={`inline-flex items-center h-6 rounded-md border px-2 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  )
}
