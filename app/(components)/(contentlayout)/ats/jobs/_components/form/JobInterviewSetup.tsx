'use client'

import React, { useId, useState, type ReactNode } from 'react'
import { JOB_INTERVIEW_SETUP_PANEL_ID } from './jobFormConstants'

export function JobInterviewSetup({
  children,
  defaultOpen = false,
  headingId,
  panelId = JOB_INTERVIEW_SETUP_PANEL_ID,
  required = false,
}: {
  children: ReactNode
  defaultOpen?: boolean
  headingId?: string
  panelId?: string
  required?: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const fallbackHeadingId = useId()
  const resolvedHeadingId = headingId ?? fallbackHeadingId
  return (
    <section className="rounded-lg border border-defaultborder/60 dark:border-white/10" aria-labelledby={resolvedHeadingId}>
      <button
        type="button"
        id={resolvedHeadingId}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-2">
          <i className="ri-calendar-schedule-line text-primary" aria-hidden />
          Interview setup
          {required ? (
            <>
              {' '}
              <span className="text-danger text-xs font-semibold">(required)</span>
            </>
          ) : null}
        </span>
        <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line`} aria-hidden />
      </button>
      {open ? (
        <div
          id={panelId}
          className="border-t border-defaultborder/50 dark:border-white/10 px-4 py-4 space-y-4"
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
