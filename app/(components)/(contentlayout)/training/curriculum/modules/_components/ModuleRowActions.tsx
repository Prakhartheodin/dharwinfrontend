'use client'

import Link from 'next/link'
import React, { useEffect, type RefObject } from 'react'
import type { ModuleLifecycleStatus } from './ModuleStatusBadge'

export type ModuleRowActionsProps = {
  moduleId: string
  moduleName: string
  currentStatus: ModuleLifecycleStatus
  statusBusy: boolean
  dropdownRef: RefObject<HTMLDivElement | null>
  onView: () => void
  onClone: () => void
  onAssignFolders: () => void
  onSetStatus: (next: ModuleLifecycleStatus) => void
  onDelete: () => void
  onToggle: (e: React.MouseEvent) => void
}

/**
 * Closes the Preline-style kebab menu attached to a module row.
 */
export function closeHsDropdown(root: HTMLDivElement | null): void {
  if (!root) return
  const menu = root.querySelector('.hs-dropdown-menu') as HTMLElement | null
  const button = root.querySelector('button') as HTMLElement | null
  if (menu) {
    menu.classList.add('hidden')
    menu.style.cssText =
      'opacity: 0 !important; pointer-events: none !important; display: none !important;'
  }
  if (button) button.setAttribute('aria-expanded', 'false')
}

/**
 * Toggles one kebab menu and hides every other `.hs-dropdown-menu` on the page.
 */
export function toggleHsDropdown(root: HTMLDivElement | null, e: React.MouseEvent): void {
  e.preventDefault()
  e.stopPropagation()
  if (!root) return
  const menu = root.querySelector('.hs-dropdown-menu') as HTMLElement | null
  const button = root.querySelector('button') as HTMLElement | null
  if (!menu || !button) return
  const isHidden = menu.classList.contains('hidden')
  document.querySelectorAll('.hs-dropdown-menu').forEach((otherMenu) => {
    if (otherMenu === menu) return
    const otherMenuEl = otherMenu as HTMLElement
    otherMenuEl.classList.add('hidden')
    otherMenuEl.style.cssText =
      'opacity: 0 !important; pointer-events: none !important; display: none !important;'
    const otherButton = otherMenuEl.closest('.hs-dropdown')?.querySelector('button')
    if (otherButton) otherButton.setAttribute('aria-expanded', 'false')
  })
  if (isHidden) {
    menu.classList.remove('hidden')
    menu.style.cssText = 'opacity: 1 !important; pointer-events: auto !important; display: block !important;'
    button.setAttribute('aria-expanded', 'true')
  } else {
    closeHsDropdown(root)
  }
}

/**
 * Kebab menu: View, Edit, Clone, Publish, Draft, Archive, Move, Delete.
 */
export default function ModuleRowActions({
  moduleId,
  moduleName,
  currentStatus,
  statusBusy,
  dropdownRef,
  onView,
  onClone,
  onAssignFolders,
  onSetStatus,
  onDelete,
  onToggle,
}: ModuleRowActionsProps) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeHsDropdown(dropdownRef.current)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownRef])

  return (
    <div className="hs-dropdown ti-dropdown shrink-0" ref={dropdownRef}>
      <button
        type="button"
        id={`dropdown-menu-${moduleId}`}
        className="ti-btn ti-btn-sm ti-btn-light !mb-0 !px-1.5 !py-1 min-h-8 min-w-8"
        aria-expanded="false"
        aria-haspopup="menu"
        onClick={onToggle}
        aria-label={`Actions for ${moduleName}`}
      >
        <i className="fe fe-more-vertical" aria-hidden />
      </button>
      <ul
        className="hs-dropdown-menu ti-dropdown-menu hidden absolute right-0 top-full mt-1 z-[100] min-w-[168px] bg-bodybg border border-defaultborder rounded-md shadow-lg"
        role="menu"
        aria-labelledby={`dropdown-menu-${moduleId}`}
      >
        <li>
          <button type="button" className="ti-dropdown-item w-full text-left" onClick={onView} role="menuitem">
            <i className="ri-eye-line align-middle me-1 inline-flex" aria-hidden /> View
          </button>
        </li>
        <li>
          <Link className="ti-dropdown-item" href={`/training/curriculum/modules/edit?id=${moduleId}`} role="menuitem">
            <i className="ri-edit-line align-middle me-1 inline-flex" aria-hidden /> Edit
          </Link>
        </li>
        <li>
          <button type="button" className="ti-dropdown-item w-full text-left" onClick={onClone} role="menuitem">
            <i className="ri-file-copy-line me-1 align-middle inline-flex" aria-hidden /> Clone
          </button>
        </li>
        <li>
          <button
            type="button"
            className="ti-dropdown-item w-full text-left disabled:opacity-50 disabled:pointer-events-none"
            disabled={statusBusy || currentStatus === 'published'}
            onClick={() => onSetStatus('published')}
            role="menuitem"
          >
            <i className="ri-send-plane-2-line me-1 align-middle inline-flex" aria-hidden /> Publish
          </button>
        </li>
        <li>
          <button
            type="button"
            className="ti-dropdown-item w-full text-left disabled:opacity-50 disabled:pointer-events-none"
            disabled={statusBusy || currentStatus === 'draft'}
            onClick={() => onSetStatus('draft')}
            role="menuitem"
          >
            <i className="ri-file-edit-line me-1 align-middle inline-flex" aria-hidden /> Draft
          </button>
        </li>
        <li>
          <button
            type="button"
            className="ti-dropdown-item w-full text-left disabled:opacity-50 disabled:pointer-events-none"
            disabled={statusBusy || currentStatus === 'archived'}
            onClick={() => onSetStatus('archived')}
            role="menuitem"
          >
            <i className="ri-archive-2-line me-1 align-middle inline-flex" aria-hidden /> Archive
          </button>
        </li>
        <li>
          <button type="button" className="ti-dropdown-item w-full text-left" onClick={onAssignFolders} role="menuitem">
            <i className="ri-folder-transfer-line me-1 align-middle inline-flex" aria-hidden /> Move to folder(s)
          </button>
        </li>
        <li>
          <button type="button" className="ti-dropdown-item w-full text-left" onClick={onDelete} role="menuitem">
            <i className="ri-delete-bin-line me-1 align-middle inline-flex" aria-hidden /> Delete
          </button>
        </li>
      </ul>
    </div>
  )
}
