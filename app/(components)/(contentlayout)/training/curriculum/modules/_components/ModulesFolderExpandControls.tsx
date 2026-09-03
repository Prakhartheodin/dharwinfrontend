'use client'

import React from 'react'

export interface ModulesFolderExpandControlsProps {
  /** True when every folder id is in the collapsed set. */
  allCollapsed: boolean
  folderCount: number
  /** Expand all if collapsed; otherwise collapse all (including partial). */
  onToggleAll: () => void
}

/**
 * Single toolbar toggle: Expand all when every folder is collapsed, else Collapse all.
 */
export function ModulesFolderExpandControls({
  allCollapsed,
  folderCount,
  onToggleAll,
}: ModulesFolderExpandControlsProps) {
  const collapsed = allCollapsed
  const label = collapsed ? 'Expand all' : 'Collapse all'
  const iconClass = collapsed ? 'ri-arrow-down-double-line' : 'ri-arrow-up-double-line'

  return (
    <button
      type="button"
      className="ti-btn ti-btn-light !mb-0 h-9 !py-0 !px-2.5 !w-auto shrink-0 whitespace-nowrap inline-flex items-center"
      aria-label={label}
      aria-pressed={!collapsed}
      disabled={folderCount === 0}
      onClick={onToggleAll}
    >
      <i className={`${iconClass} me-1 font-semibold align-middle`} aria-hidden />
      {label}
    </button>
  )
}
