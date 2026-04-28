'use client'

import React from 'react'
import {
  formatJoiningDateDisplay,
  joiningDatePresent,
} from '@/shared/lib/ats/joining-date-display'

type Props = { value: string | Date | null | undefined }

/** Shared ATS table cell: emerald dot + `May 27, 2026` style, or muted “Not set”. */
export function JoiningDateTableCell({ value }: Props) {
  const label = joiningDatePresent(value)
    ? formatJoiningDateDisplay(value instanceof Date ? value : String(value ?? ''))
    : ''

  return (
    <div className="text-[12px] text-slate-600 dark:text-slate-300">
      {label ? (
        <div className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" title="Date set" />
          {label}
        </div>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-slate-400">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
          Not set
        </span>
      )}
    </div>
  )
}
