'use client'

import React from 'react'

export function JobsListSkeleton({ rows = 8 }: { rows?: number }): React.JSX.Element {
  return (
    <div className="jobs-surface-x flex-1 overflow-hidden py-3" aria-busy="true" aria-label="Loading jobs">
      <div className="hidden md:block space-y-0 border border-defaultborder/40 dark:border-white/10 rounded-lg overflow-hidden">
        <div className="h-10 bg-gray-100/80 dark:bg-white/[0.04] animate-pulse" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-t border-defaultborder/30 dark:border-white/10 px-3 py-2.5 animate-pulse"
          >
            <div className="h-4 w-4 rounded bg-gray-200 dark:bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/5 max-w-xs rounded bg-gray-200 dark:bg-white/10" />
              <div className="h-3 w-1/3 max-w-[10rem] rounded bg-gray-100 dark:bg-white/[0.06]" />
            </div>
            <div className="h-4 w-24 rounded bg-gray-100 dark:bg-white/[0.06] hidden lg:block" />
            <div className="h-8 w-28 rounded bg-gray-100 dark:bg-white/[0.06] shrink-0" />
          </div>
        ))}
      </div>
      <div className="md:hidden space-y-3">
        {Array.from({ length: Math.min(rows, 4) }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-defaultborder/50 dark:border-white/10 p-3.5 space-y-3 animate-pulse"
          >
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-white/[0.06]" />
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-white/[0.06]" />
              <div className="h-6 w-20 rounded-full bg-gray-100 dark:bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
