'use client'

import React, { useRef, type ReactNode } from 'react'
import { useDrawerFocusTrap } from './useDrawerFocusTrap'

export interface FilterDrawerShellProps {
  open: boolean
  onClose: () => void
  panelId: string
  title: string
  subtitle?: ReactNode
  ariaLabel?: string
  restoreFocusRef?: React.RefObject<HTMLElement | null>
  headerExtra?: ReactNode
  footer: ReactNode
  children: ReactNode
}

export function FilterDrawerShell({
  open,
  onClose,
  panelId,
  title,
  subtitle,
  ariaLabel = 'Filters',
  restoreFocusRef,
  headerExtra,
  footer,
  children,
}: FilterDrawerShellProps): React.JSX.Element {
  const panelRef = useRef<HTMLElement>(null)
  useDrawerFocusTrap(open, panelRef, onClose, restoreFocusRef)

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={
          'fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ' +
          (open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')
        }
      />
      <aside
        id={panelId}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-hidden={!open}
        tabIndex={-1}
        className={
          'fixed right-0 top-0 z-[61] h-screen w-full sm:max-w-[28rem] transform-gpu bg-white dark:bg-bodybg flex flex-col shadow-[-12px_0_40px_-12px_rgba(15,23,42,0.25)] border-l border-defaultborder/60 dark:border-white/10 transition-transform duration-300 ease-out motion-reduce:transition-none ' +
          (open ? 'translate-x-0' : 'translate-x-full pointer-events-none')
        }
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-defaultborder/60 dark:border-white/10 bg-white/95 dark:bg-bodybg/95 backdrop-blur px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <i className="ri-filter-3-line text-[1rem]" aria-hidden />
            </span>
            <div className="leading-tight min-w-0">
              <div className="text-base font-semibold text-gray-900 dark:text-white truncate">{title}</div>
              {subtitle ? (
                <div className="text-[0.7rem] text-gray-500 dark:text-gray-400 truncate">{subtitle}</div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {headerExtra}
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
              onClick={onClose}
              aria-label="Close filters"
            >
              <i className="ri-close-line text-base" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">{children}</div>

        <div className="sticky bottom-0 z-10 border-t border-defaultborder/60 dark:border-white/10 bg-white/95 dark:bg-bodybg/95 backdrop-blur px-5 py-3">
          {footer}
        </div>
      </aside>
    </>
  )
}
