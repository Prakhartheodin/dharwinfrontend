'use client'

import { useEffect, useRef, useState } from 'react'
import { getJobsListLayout, type JobsListLayout } from './jobsTableResponsive'

/**
 * Mirrors `@container jobs-list` breakpoints so only one list implementation mounts (table or cards).
 */
export function useJobsListContainerLayout() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<JobsListLayout>('table')

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = (width: number) => {
      setLayout(getJobsListLayout(width))
    }

    update(el.getBoundingClientRect().width)

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const w =
        entry.contentBoxSize?.[0]?.inlineSize ??
        entry.contentRect.width
      update(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return {
    containerRef,
    layout,
    showTable: layout === 'table',
    showCards: layout === 'cards',
  }
}
