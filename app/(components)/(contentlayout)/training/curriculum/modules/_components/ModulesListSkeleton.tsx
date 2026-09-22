'use client'

import React from 'react'
import { MODULES_LIST_SCROLL_CLASS } from './modulesListScroll'

/** Two full rows of the 3-up grid — enough to fill the fold without overrunning it. */
const SKELETON_CARD_COUNT = 6

/** Per-card pulse offset, so the placeholders read as a wave rather than one flashing block. */
const STAGGER_MS = 40

/**
 * One placeholder folder card: icon tile, positions badge, name, meta line, then the
 * module rows and the add link.
 *
 * Heights are the real card's, not approximations — a placeholder of a different
 * height means the grid jumps the moment data lands.
 */
function SkeletonFolderCard({ delayMs }: { delayMs: number }) {
  const bar = 'rounded bg-black/10 dark:bg-white/10'
  return (
    <div
      className="flex h-full animate-pulse flex-col rounded-xl border border-defaultborder bg-white p-4 shadow-sm motion-reduce:animate-none dark:bg-bodybg"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="h-9 w-9 shrink-0 rounded-lg bg-black/10 dark:bg-white/10" />
        <span className={`h-5 w-24 ${bar}`} />
      </div>
      <div className={`mt-3 h-4 w-3/4 ${bar}`} />
      <div className={`mt-1.5 h-3 w-2/3 ${bar}`} />
      <hr className="my-3 border-defaultborder" />
      <div className="flex-1 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 shrink-0 rounded-sm bg-black/10 dark:bg-white/10" />
            <span className={`h-3 flex-1 ${bar}`} />
            <span className="h-3.5 w-3.5 shrink-0 rounded-sm bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
      <div className={`mt-auto pt-3 h-3 w-40 ${bar}`} />
    </div>
  )
}

export function ModulesListSkeleton() {
  return (
    <div className={MODULES_LIST_SCROLL_CLASS} role="status" aria-busy="true">
      <span className="sr-only">Loading folders…</span>
      <div
        className="grid grid-cols-1 gap-4 px-1 pb-4 sm:grid-cols-2 min-[900px]:grid-cols-3"
        aria-hidden
      >
        {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
          <SkeletonFolderCard key={i} delayMs={i * STAGGER_MS} />
        ))}
      </div>
    </div>
  )
}
