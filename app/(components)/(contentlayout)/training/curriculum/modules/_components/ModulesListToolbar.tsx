'use client'

import Link from 'next/link'
import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type {
  TrainingModuleLifecycleCounts,
  TrainingModulesListStatus,
} from '@/shared/lib/training/group-modules-into-folders'
import { ModulesFolderExpandControls } from './ModulesFolderExpandControls'
import { ModulesStatusFilter } from './ModulesStatusFilter'

const OVERFLOW_MENU_WIDTH = 184

type OverflowMenuCoords = { top: number; left: number }

/**
 * Viewport-fixed coords so the kebab is not clipped by the toolbar's overflow-x row.
 */
function computeOverflowMenuCoords(button: HTMLElement): OverflowMenuCoords {
  const rect = button.getBoundingClientRect()
  const gutter = 8
  const gap = 4
  const left = Math.max(
    gutter,
    Math.min(rect.right - OVERFLOW_MENU_WIDTH, window.innerWidth - OVERFLOW_MENU_WIDTH - gutter),
  )
  return { top: rect.bottom + gap, left }
}

export type ModulesSortOption = { value: string; label: string }

export interface ModulesListToolbarProps {
  search: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  sortValue: ModulesSortOption
  sortOptions: ModulesSortOption[]
  onSortChange: (option: ModulesSortOption) => void
  statusFilter: TrainingModulesListStatus
  lifecycleCounts: TrainingModuleLifecycleCounts
  hrefForStatus: (id: TrainingModulesListStatus) => string
  onStatusChange: (next: TrainingModulesListStatus) => void
  showFolderHeaders: boolean
  allCollapsed: boolean
  folderCount: number
  onToggleAll: () => void
  onNewFolder: () => void
}

/**
 * Catalog toolbar: controls stay on one row (search → sort → collapse → new module
 * → overflow, status tabs on the right). The page title is screen-reader only.
 */
export function ModulesListToolbar({
  search,
  onSearchChange,
  onSearchKeyDown,
  sortValue,
  sortOptions,
  onSortChange,
  statusFilter,
  lifecycleCounts,
  hrefForStatus,
  onStatusChange,
  showFolderHeaders,
  allCollapsed,
  folderCount,
  onToggleAll,
  onNewFolder,
}: ModulesListToolbarProps) {
  const moreButtonRef = useRef<HTMLButtonElement | null>(null)
  const moreMenuRef = useRef<HTMLUListElement | null>(null)
  const moreMenuId = useId()
  const [moreOpen, setMoreOpen] = useState(false)
  const [moreCoords, setMoreCoords] = useState<OverflowMenuCoords | null>(null)

  /**
   * Recomputes fixed position against the overflow trigger.
   */
  const updateMorePosition = useCallback(() => {
    const button = moreButtonRef.current
    if (!button) return
    setMoreCoords(computeOverflowMenuCoords(button))
  }, [])

  useEffect(() => {
    if (!moreOpen) return
    updateMorePosition()

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (moreButtonRef.current?.contains(target) || moreMenuRef.current?.contains(target)) return
      setMoreOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    const handleScrollOrResize = () => {
      const button = moreButtonRef.current
      if (!button) {
        setMoreOpen(false)
        return
      }
      updateMorePosition()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [moreOpen, updateMorePosition])

  /**
   * Opens or closes the overflow kebab. Fully React-controlled — Preline's
   * `.hs-dropdown` auto-init races the click and immediately closes the menu.
   */
  const handleMoreToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (moreOpen) {
      setMoreOpen(false)
      return
    }
    const button = moreButtonRef.current
    if (button) setMoreCoords(computeOverflowMenuCoords(button))
    setMoreOpen(true)
  }, [moreOpen])

  /**
   * Maps native select value onto the existing sort option objects used by fetch/group.
   */
  const handleSortSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next = sortOptions.find((opt) => opt.value === e.target.value)
      if (next) onSortChange(next)
    },
    [onSortChange, sortOptions],
  )

  /**
   * Closes overflow after a secondary action is chosen.
   */
  const handleOverflowAction = useCallback(() => {
    setMoreOpen(false)
  }, [])

  /**
   * Opens the new-folder modal from the overflow menu.
   */
  const handleNewFolderFromMenu = useCallback(() => {
    handleOverflowAction()
    onNewFolder()
  }, [handleOverflowAction, onNewFolder])

  return (
    <div>
      {/* Visually removed: the sidebar and breadcrumb already say where you are, so the
          heading was a wasted band above the fold. Kept in the accessibility tree
          because it is this page's only h1 — deleting it leaves the document with no
          top-level heading to orient a screen reader. */}
      <h1 className="sr-only">Modules</h1>
      <div className="box custom-box">
        <div className="box-body !py-2 !px-3">
          <div className="flex items-center gap-1.5 flex-nowrap min-w-0 overflow-x-auto">
            <div className="relative w-48 shrink-0" role="search">
              <i
                className="ri-search-line absolute start-3 top-1/2 -translate-y-1/2 text-[0.875rem] leading-none text-[#8c9097] dark:text-white/50 pointer-events-none"
                aria-hidden
              />
              <input
                className="form-control !ps-9 !pe-3 !py-0 h-9 text-sm leading-none"
                type="search"
                placeholder="Search modules"
                aria-label="Search modules"
                value={search}
                onChange={onSearchChange}
                onKeyDown={onSearchKeyDown}
              />
            </div>
            <label className="sr-only" htmlFor="modules-sort">
              Sort modules
            </label>
            <select
              id="modules-sort"
              className="form-control h-9 !py-0 text-sm w-auto shrink-0"
              value={sortValue.value}
              onChange={handleSortSelect}
              aria-label="Sort modules"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {showFolderHeaders ? (
              <ModulesFolderExpandControls
                allCollapsed={allCollapsed}
                folderCount={folderCount}
                onToggleAll={onToggleAll}
              />
            ) : null}
            <Link
              href="/training/curriculum/modules/create"
              className="ti-btn ti-btn-primary-full !mb-0 h-9 !py-0 !px-3 !w-auto shrink-0 whitespace-nowrap inline-flex items-center"
            >
              <i className="ri-add-line me-1 font-semibold align-middle" aria-hidden />
              New module
            </Link>
            <div className="relative shrink-0">
              <button
                ref={moreButtonRef}
                type="button"
                id={moreMenuId}
                className="ti-btn ti-btn-light !mb-0 !px-0 !py-0 h-9 w-9 inline-flex items-center justify-center"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-controls={moreOpen ? `${moreMenuId}-menu` : undefined}
                aria-label="More module actions"
                onClick={handleMoreToggle}
              >
                <i className="fe fe-more-vertical" aria-hidden />
              </button>
              {moreOpen && moreCoords && typeof document !== 'undefined'
                ? createPortal(
                    <ul
                      ref={moreMenuRef}
                      id={`${moreMenuId}-menu`}
                      className="m-0 rounded-md border border-defaultborder bg-white py-1 shadow-lg dark:bg-bodybg"
                      role="menu"
                      aria-labelledby={moreMenuId}
                      style={{
                        position: 'fixed',
                        top: moreCoords.top,
                        left: moreCoords.left,
                        width: OVERFLOW_MENU_WIDTH,
                        zIndex: 200,
                      }}
                    >
                      <li>
                        <Link
                          className="ti-dropdown-item flex items-center"
                          href="/training/curriculum/modules/create-with-ai"
                          role="menuitem"
                          onClick={handleOverflowAction}
                        >
                          <i className="ri-magic-line me-2 align-middle" aria-hidden />
                          Create with AI
                        </Link>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="ti-dropdown-item w-full text-left flex items-center"
                          role="menuitem"
                          onClick={handleNewFolderFromMenu}
                        >
                          <i className="ri-folder-add-line me-2 align-middle" aria-hidden />
                          New folder
                        </button>
                      </li>
                      <li>
                        <Link
                          className="ti-dropdown-item flex items-center"
                          href="/training/curriculum/categories"
                          role="menuitem"
                          onClick={handleOverflowAction}
                        >
                          <i className="ri-settings-3-line me-2 align-middle" aria-hidden />
                          Manage folders
                        </Link>
                      </li>
                    </ul>,
                    document.body,
                  )
                : null}
            </div>
            <div className="flex-1 min-w-1" aria-hidden />
            <div className="shrink-0 ms-auto">
              <ModulesStatusFilter
                value={statusFilter}
                counts={lifecycleCounts}
                hrefFor={hrefForStatus}
                onChange={onStatusChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
