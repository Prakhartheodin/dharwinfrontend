'use client'

import React from 'react'

/**
 * How many distinct positions a folder reaches, counted through its modules.
 *
 * Not `Category.positions`. That field exists and the API accepts it, but no screen
 * ever writes it, so every folder read "No positions". The live mapping is
 * Position -> Modules, set on Setup > Positions, so the folder's reach is the union
 * of its modules' positions.
 *
 * The amber "none" tone is a tinted background with a dark foreground rather than
 * `text-warning`, which measures 1.77:1 on white and fails AA.
 */
export default function FolderPositionsBadge({
  count,
  onOpen,
  expanded,
}: {
  count: number
  /** Opens the positions panel; the badge hands over its own element as the anchor. */
  onOpen: (anchor: HTMLElement) => void
  expanded: boolean
}) {
  const has = count > 0
  const label = has
    ? `Reaches ${count} position${count === 1 ? '' : 's'}. Show which.`
    : 'Not reachable from any position. Add one.'

  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={label}
      // min-h-7 rather than the 44px the list rows use: this is a corner affordance on
      // a card that is itself one large target, and a 44px pill would swamp the header
      // it sits in.
      className={`inline-flex min-h-7 shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        has
          ? 'border-success/30 bg-success/15 text-success hover:bg-success/25'
          : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25'
      }`}
    >
      <i
        className={`text-[0.75rem] ${has ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}`}
        aria-hidden
      />
      {has ? `${count} position${count === 1 ? '' : 's'}` : 'No positions'}
    </button>
  )
}
