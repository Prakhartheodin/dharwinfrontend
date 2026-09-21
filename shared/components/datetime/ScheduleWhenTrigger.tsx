'use client'
import React from 'react'

export interface ScheduleWhenTriggerProps {
  value?: string
  onClick: () => void
  disabled?: boolean
  id?: string
  ariaLabel?: string
}

/** Date/time trigger used by ATS Schedule Interview and Edit HRMS orientation. */
export default function ScheduleWhenTrigger({
  value,
  onClick,
  disabled,
  id = 'schedule-when-trigger',
  ariaLabel,
}: ScheduleWhenTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      id={id}
      className="group flex min-h-11 w-full items-center gap-3 rounded-xl border border-defaultborder bg-white py-2.5 pl-3.5 pr-12 text-left text-sm shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-defaultborder/10 dark:bg-bodybg"
      aria-haspopup="dialog"
      aria-label={ariaLabel ?? (value ? `Interview date and time: ${value}` : 'Choose interview date and time')}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary dark:bg-primary/15">
        <i className="ri-calendar-schedule-line text-lg" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 pr-1">
        <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-textmuted dark:text-white/50">
          Date and time
        </span>
        <span className="block truncate font-medium text-defaulttextcolor dark:text-white">
          {value || 'Select date & time'}
        </span>
      </span>
    </button>
  )
}
