"use client"
import React, { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export const DROPDOWN_MENU =
  'overflow-y-auto rounded-xl border border-defaultborder/70 bg-white py-1 shadow-2xl dark:border-white/15 dark:bg-bodybg ring-1 ring-black/5'
export const DROPDOWN_ITEM =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors'

/** Renders dropdown at document.body level to escape overflow:hidden clipping. */
export function PortalDropdown({
  open,
  inputRef,
  children,
  maxHeightClass = 'max-h-44',
}: {
  open: boolean
  /** Element the dropdown is positioned under (an input, or the box wrapping one). */
  inputRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  /** Tailwind max-height for the scrolling menu; defaults to the filter-panel size. */
  maxHeightClass?: string
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const [ready, setReady] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useLayoutEffect(() => {
    if (!open || !inputRef.current) {
      setReady(false)
      return
    }
    const r = inputRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 2, left: r.left, width: r.width })
    setReady(true)
  }, [open, inputRef])

  useEffect(() => {
    if (!open) return
    const update = () => {
      if (!inputRef.current) return
      const r = inputRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 2, left: r.left, width: r.width })
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, inputRef])

  if (!mounted || !open || !ready) return null

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className={`${DROPDOWN_MENU} ${maxHeightClass}`}
    >
      {children}
    </div>,
    document.body
  )
}
