'use client'

import React from 'react'

const STATUS_CLASS: Record<string, string> = {
  Active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  Closed: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  Archived: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  Draft: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30',
}

const pillBase = 'inline-flex items-center h-6 rounded-md border px-2 text-xs font-medium'

export function JobStatusBadge({ status }: { status?: string | null }): React.JSX.Element {
  const label = status?.trim() || '\u2014'
  const cls =
    STATUS_CLASS[label] ?? 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30'
  return <span className={`${pillBase} ${cls}`}>{label}</span>
}

export function JobOriginBadge({
  jobOrigin,
}: {
  jobOrigin?: 'internal' | 'external' | string | null
}): React.JSX.Element {
  const ext = jobOrigin === 'external'
  const cls = ext
    ? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25'
    : 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/25'
  return <span className={`${pillBase} ${cls}`}>{ext ? 'External' : 'Internal'}</span>
}
