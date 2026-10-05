'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  JOBS_LIST_MOBILE_VIEWPORT_MAX_WIDTH,
  resolveJobsListLayout,
  type JobsListLayout,
} from './jobsTableResponsive'

function readViewportWidth(): number {
  if (typeof window === 'undefined') return Number.POSITIVE_INFINITY
  return window.innerWidth
}

function isNarrowViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${JOBS_LIST_MOBILE_VIEWPORT_MAX_WIDTH}px)`).matches
}

function initialJobsListLayout(): JobsListLayout {
  return isNarrowViewport() ? 'cards' : 'table'
}

/**
 * Mirrors `@container jobs-list` breakpoints so only one list implementation mounts (table or cards).
 * Uses a callback ref so ResizeObserver attaches when `.jobs-list-container` mounts after the first fetch.
 */
export function useJobsListContainerLayout() {
  const elementRef = useRef<HTMLDivElement | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const [layout, setLayout] = useState<JobsListLayout>(initialJobsListLayout)

  const applyLayout = useCallback((containerWidth: number) => {
    setLayout(resolveJobsListLayout(containerWidth, readViewportWidth()))
  }, [])

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      elementRef.current = node
      if (!node) return

      applyLayout(node.getBoundingClientRect().width)

      const ro = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        const w =
          entry.contentBoxSize?.[0]?.inlineSize ??
          entry.contentRect.width
        applyLayout(w)
      })
      ro.observe(node)
      resizeObserverRef.current = ro
    },
    [applyLayout]
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${JOBS_LIST_MOBILE_VIEWPORT_MAX_WIDTH}px)`)
    const onViewportChange = () => {
      const el = elementRef.current
      if (el) {
        applyLayout(el.getBoundingClientRect().width)
        return
      }
      setLayout(initialJobsListLayout())
    }
    mq.addEventListener('change', onViewportChange)
    return () => mq.removeEventListener('change', onViewportChange)
  }, [applyLayout])

  useEffect(() => {
    return () => resizeObserverRef.current?.disconnect()
  }, [])

  return {
    containerRef,
    layout,
    showTable: layout === 'table',
    showCards: layout === 'cards',
  }
}
