'use client'

import Link from 'next/link'
import React from 'react'
import './curriculum-modules-scroll.css'

export const DRAFTS_FOLDER_ID = '__drafts__'
export const ARCHIVED_FOLDER_ID = '__archived__'

/** Visible inner-list scrollbar; overrides global `::-webkit-scrollbar { width: 0 }`. */
export const MODULES_LIST_SCROLL_CLASS =
  'curriculum-modules-scroll overflow-y-auto overflow-x-hidden max-h-[calc(100vh-13.5rem)] pr-1 ' +
  '[scrollbar-gutter:stable] [scrollbar-width:thin] ' +
  '[scrollbar-color:rgba(0,0,0,0.32)_rgba(0,0,0,0.06)] ' +
  'dark:[scrollbar-color:rgba(255,255,255,0.42)_rgba(255,255,255,0.12)] ' +
  '[&::-webkit-scrollbar]:!w-2.5 [&::-webkit-scrollbar]:!h-2.5 ' +
  '[&::-webkit-scrollbar-track]:!bg-black/5 dark:[&::-webkit-scrollbar-track]:!bg-white/10 ' +
  '[&::-webkit-scrollbar-thumb]:!rounded-full [&::-webkit-scrollbar-thumb]:!bg-black/30 ' +
  'dark:[&::-webkit-scrollbar-thumb]:!bg-white/40'

export type CurriculumFolderKind = 'drafts' | 'archived' | 'uncategorized' | 'category'

type CurriculumFolderSectionProps = {
  folderId: string
  name: string
  moduleCount: number
  kind: CurriculumFolderKind
  collapsed: boolean
  allSelected: boolean
  showSelectAll: boolean
  onToggle: () => void
  onSelectAll: () => void
  children?: React.ReactNode
  /** When false, only the toggle chrome is rendered (virtualized lists own the body). */
  renderBody?: boolean
}

/**
 * Returns folder chrome classes for drafts / archived / default category rows.
 */
function folderChrome(kind: CurriculumFolderKind): {
  icon: string
  wrap: string
  badge: string | null
  badgeClass: string
} {
  if (kind === 'drafts') {
    return {
      icon: 'ri-folder-2-line text-primary',
      wrap: 'rounded-lg px-2',
      badge: null,
      badgeClass: '',
    }
  }
  if (kind === 'archived') {
    return {
      icon: 'ri-archive-2-line text-[#8c9097] dark:text-white/50',
      wrap: 'rounded-lg px-2 opacity-80',
      badge: 'Archived',
      badgeClass:
        'bg-black/5 text-[#6b7280] border border-defaultborder dark:bg-white/5 dark:text-white/60',
    }
  }
  if (kind === 'uncategorized') {
    return {
      icon: 'ri-inbox-line text-[#8c9097]',
      wrap: 'rounded-lg px-2',
      badge: null,
      badgeClass: '',
    }
  }
  return {
    icon: 'ri-folder-2-line text-primary',
    wrap: 'rounded-lg px-2',
    badge: null,
    badgeClass: '',
  }
}

/**
 * Collapsible folder header with optional select-all and empty/children body.
 */
export default function CurriculumFolderSection({
  folderId,
  name,
  moduleCount,
  kind,
  collapsed,
  allSelected,
  showSelectAll,
  onToggle,
  onSelectAll,
  children,
  renderBody = true,
}: CurriculumFolderSectionProps) {
  const chrome = folderChrome(kind)
  const headingId = `folder-heading-${folderId}`
  const panelId = `folder-panel-${folderId}`

  return (
    <section className={`mb-2 ${chrome.wrap}`} aria-labelledby={headingId}>
      <div className="flex items-center gap-2 min-h-10">
        {showSelectAll ? (
          <label
            className="flex items-center justify-center w-8 h-10 cursor-pointer shrink-0"
            title={allSelected ? 'Deselect all in folder' : 'Select all in folder'}
          >
            <input
              type="checkbox"
              className="form-check-input !m-0 !w-4 !h-4 cursor-pointer"
              checked={allSelected}
              onChange={onSelectAll}
              aria-label={allSelected ? `Deselect all in ${name}` : `Select all in ${name}`}
            />
          </label>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 min-w-0 text-left py-1.5 px-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-expanded={!collapsed}
          aria-controls={panelId}
        >
          <i
            className={`text-defaulttextcolor text-base ${collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'}`}
            aria-hidden
          />
          <i className={`text-base ${chrome.icon}`} aria-hidden />
          <h2 id={headingId} className="text-sm font-semibold text-defaulttextcolor mb-0 truncate">
            {name}
          </h2>
          {chrome.badge ? (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[0.625rem] font-semibold uppercase tracking-wide shrink-0 ${chrome.badgeClass}`}
            >
              {chrome.badge}
            </span>
          ) : null}
          <span className="text-[#8c9097] dark:text-white/50 text-xs shrink-0">
            {moduleCount} module{moduleCount !== 1 ? 's' : ''}
          </span>
        </button>
      </div>
      {!collapsed && renderBody ? (
        <div id={panelId} role="region" aria-labelledby={headingId} className="pb-2">
          {children}
        </div>
      ) : null}
    </section>
  )
}

/**
 * Empty copy + quiet create link for the Drafts folder.
 */
export function DraftsFolderEmpty() {
  return (
    <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mt-1 ms-2 mb-2">
      No draft modules.{' '}
      <Link
        href="/training/curriculum/modules/create"
        className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
      >
        Create module
      </Link>
    </p>
  )
}

/**
 * Empty copy for archived and category folders.
 */
export function CurriculumFolderEmpty({ kind }: { kind: CurriculumFolderKind }) {
  if (kind === 'drafts') return <DraftsFolderEmpty />
  const copy =
    kind === 'archived'
      ? 'No archived modules. Archive a module from its menu to hide it from active folders.'
      : kind === 'uncategorized'
        ? 'All modules are assigned to a folder.'
        : 'No modules in this folder yet. Use “Move to folder(s)” on a module or assign folders when editing.'
  return (
    <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mt-1 ms-2 mb-2">{copy}</p>
  )
}
