'use client'

import React from 'react'
import { MODULES_LIST_SCROLL_CLASS } from './CurriculumFolderSection'

/** Two full rows of the 3-up grid — enough to fill the fold without overrunning it. */
const SKELETON_CARD_COUNT = 6

/** Per-card pulse offset, so the placeholders read as a wave rather than one flashing block. */
const STAGGER_MS = 40

/**
 * One placeholder card, shaped like TrainingModuleCard: h-36 cover, then title,
 * enrolled line, lesson pills, two description lines and a mentors row.
 *
 * Heights are deliberately the card's own, not approximations — the virtualizer
 * estimates real rows at 360px, and a placeholder of a different height means the
 * list jumps the moment data lands.
 */
function SkeletonCard({ delayMs }: { delayMs: number }) {
  const bar = 'rounded bg-black/10 dark:bg-white/10'
  return (
    <div
      className="flex h-full animate-pulse flex-col rounded-xl border border-defaultborder bg-white shadow-sm motion-reduce:animate-none dark:bg-bodybg"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="h-36 shrink-0 rounded-t-xl bg-black/10 dark:bg-white/10" />
      <div className="flex min-h-0 flex-1 flex-col p-3.5 sm:p-4">
        <div className={`h-4 w-3/4 ${bar}`} />
        <div className={`mt-2 h-3 w-24 ${bar}`} />
        <div className="mt-2.5 flex gap-1.5">
          <span className={`h-5 w-16 ${bar}`} />
          <span className={`h-5 w-14 ${bar}`} />
          <span className={`h-5 w-12 ${bar}`} />
        </div>
        <div className={`mt-2.5 h-3 w-full ${bar}`} />
        <div className={`mt-1.5 h-3 w-5/6 ${bar}`} />
        <div className="mt-auto flex items-center gap-2 pt-3">
          <span className="h-6 w-6 rounded-full bg-black/10 dark:bg-white/10" />
          <span className={`h-3 w-20 ${bar}`} />
        </div>
      </div>
    </div>
  )
}

/**
 * Loading placeholder for the catalog.
 *
 * Lives inside the same scroll container as the real list. Rendering it outside meant
 * the scroller only appeared once data arrived, which moved everything below it.
 *
 * `role="status"` announces the wait once; the bars themselves are decorative, so the
 * whole grid is hidden from assistive tech rather than read out as empty elements.
 */
export function ModulesListSkeleton() {
  return (
    <div className={MODULES_LIST_SCROLL_CLASS} role="status" aria-busy="true">
      <span className="sr-only">Loading modules…</span>
      <div className="flex items-center gap-2 px-1 py-2.5" aria-hidden>
        <span className="h-4 w-4 animate-pulse rounded bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
        <span className="h-4 w-32 animate-pulse rounded bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
      </div>
      <div
        className="grid grid-cols-1 gap-4 px-1 pb-4 sm:grid-cols-2 min-[900px]:grid-cols-3"
        aria-hidden
      >
        {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
          <SkeletonCard key={i} delayMs={i * STAGGER_MS} />
        ))}
      </div>
    </div>
  )
}
