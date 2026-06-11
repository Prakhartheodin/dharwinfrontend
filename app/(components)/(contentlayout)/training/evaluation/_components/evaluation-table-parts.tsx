'use client'

import React from 'react'

export const EVAL_TABLE_SURFACE_CLASS =
  'overflow-hidden rounded-lg border border-defaultborder/70 bg-white dark:border-white/10 dark:bg-bodybg'

export const EVAL_TH_CLASS =
  'px-3 py-2.5 text-start text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-defaulttextcolor/50 bg-slate-50/80 dark:bg-white/[0.03] sticky top-0 z-20 border-b border-defaultborder/70 dark:border-white/10'

export const EVAL_TD_CLASS =
  'px-3 py-2 align-middle text-[0.8125rem] text-defaulttextcolor'

export function evalRowClass(index: number) {
  return index % 2 === 1 ? 'bg-slate-50/40 dark:bg-white/[0.015]' : ''
}

export function CompletionBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="flex items-center gap-2 min-w-[7.5rem] max-w-[10rem]">
      <div
        className="flex-1 h-2 rounded-full bg-gray-200/90 dark:bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% complete`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none ${
            pct >= 100 ? 'bg-success' : pct > 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-white/25'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[0.75rem] font-medium tabular-nums text-defaulttextcolor/80 w-9 text-end shrink-0">
        {pct}%
      </span>
    </div>
  )
}

export function AtRiskCountButton({
  count,
  labelSuffix,
  onClick,
  compact = false,
}: {
  count: number
  labelSuffix?: string
  onClick?: () => void
  compact?: boolean
}) {
  if (count <= 0) {
    return <span className="text-defaulttextcolor/45 tabular-nums text-[0.75rem]">0</span>
  }
  const label = labelSuffix ? `${count} ${labelSuffix}` : String(count)
  return (
    <button
      type="button"
      className={
        compact
          ? 'relative z-[1] inline-flex items-center gap-1 rounded-full border border-danger/25 bg-danger/5 px-2 py-0.5 text-[0.6875rem] font-medium text-danger hover:bg-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 cursor-pointer transition-colors'
          : 'relative z-[1] inline-flex items-center gap-1 text-danger text-[0.8125rem] font-medium min-h-[44px] px-2 py-2 -mx-2 rounded-md hover:bg-danger/5 hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 cursor-pointer transition-colors'
      }
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      aria-label={
        labelSuffix
          ? `View ${count} ${labelSuffix}`
          : `View ${count} at-risk ${count === 1 ? 'student' : 'students'}`
      }
    >
      <i className={`ri-alert-line ${compact ? 'text-[0.75rem]' : ''}`} aria-hidden />
      {label}
    </button>
  )
}

export function CountCompleted({ completed, total }: { completed: number; total: number }) {
  return (
    <span className="tabular-nums text-defaulttextcolor whitespace-nowrap">
      <span className="font-semibold">{completed}</span>
      <span className="text-defaulttextcolor/50">/{total}</span>
      <span className="text-defaulttextcolor/55 text-[0.6875rem] ms-1 font-normal">done</span>
    </span>
  )
}

export function StudentNameCell({
  studentId,
  studentName,
  onPreview,
  onViewProfile,
  viewProfileLoading,
}: {
  studentId: string
  studentName: string
  onPreview: (id: string, name: string) => void
  onViewProfile: (id: string) => void
  viewProfileLoading?: boolean
}) {
  return (
    <div className="group relative z-[1] min-w-[9rem] max-w-[14rem]">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <button
          type="button"
          className="font-semibold text-[0.8125rem] text-defaulttextcolor text-start hover:text-primary truncate max-w-full rounded px-0.5 py-0.5 -mx-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onPreview(studentId, studentName)
          }}
          aria-label={`Preview ${studentName}`}
        >
          {studentName}
        </button>
        <span className="text-defaulttextcolor/25 select-none" aria-hidden>
          ·
        </span>
        <button
          type="button"
          disabled={viewProfileLoading}
          aria-busy={viewProfileLoading}
          className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-defaulttextcolor/55 hover:text-primary whitespace-nowrap rounded px-0.5 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50 disabled:cursor-wait transition-colors sm:opacity-70 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onViewProfile(studentId)
          }}
          aria-label={`View full profile for ${studentName}`}
        >
          {viewProfileLoading ? (
            <i className="ri-loader-4-line animate-spin motion-reduce:animate-none text-[0.75rem]" aria-hidden />
          ) : (
            <i className="ri-user-line text-[0.75rem]" aria-hidden />
          )}
          {viewProfileLoading ? 'Opening…' : 'Profile'}
        </button>
      </div>
    </div>
  )
}

export function SortHeaderLabel({
  label,
  isSorted,
  isSortedDesc,
}: {
  label: React.ReactNode
  isSorted: boolean
  isSortedDesc?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1 w-full">
      <span>{label}</span>
      <i
        className={`text-[0.75rem] shrink-0 transition-opacity duration-150 ${
          isSorted
            ? isSortedDesc
              ? 'ri-arrow-down-s-line text-primary'
              : 'ri-arrow-up-s-line text-primary'
            : 'ri-arrow-up-down-line text-defaulttextcolor/35 group-hover/th:text-defaulttextcolor/60'
        }`}
        aria-hidden
      />
    </span>
  )
}
