'use client'

import React from 'react'

export function JobOriginBadge({
  jobOrigin,
}: {
  jobOrigin?: 'internal' | 'external' | string | null
}): React.JSX.Element {
  const ext = jobOrigin === 'external'
  return (
    <span
      className={`inline-flex items-center h-6 rounded-md border px-2 text-xs font-medium ${
        ext
          ? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25'
          : 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/25'
      }`}
    >
      {ext ? 'External' : 'Internal'}
    </span>
  )
}
