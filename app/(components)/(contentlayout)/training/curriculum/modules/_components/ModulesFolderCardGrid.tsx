'use client'

import Link from 'next/link'
import React, { useState } from 'react'
import type { TrainingModule as ApiTrainingModule } from '@/shared/lib/api/training-modules'
import type { TrainingFolderRow } from '@/shared/lib/training/group-modules-into-folders'
import { MODULES_LIST_SCROLL_CLASS } from './modulesListScroll'
import FolderPositionsBadge from './FolderPositionsBadge'
import FolderPositionsPopover from './FolderPositionsPopover'
import { FolderModuleRow } from './FolderModuleRow'
import { type ModuleLifecycleStatus } from './ModuleStatusBadge'

/**
 * Rows shown before a card collapses the rest behind "Show all".
 *
 * Folders are wildly uneven — a few hold thirty modules, most hold three — and an
 * uncapped card makes one column tower over its neighbours, dragging the whole grid
 * taller. Six keeps the cards close to a uniform height.
 */
const COLLAPSED_ROW_LIMIT = 6

/**
 * Distinct positions a set of modules is reachable from.
 *
 * `positions` arrives on the list unpopulated, so an entry is normally the raw
 * ObjectId string; it is an object on the surfaces that do populate it. Both shapes
 * reduce to the same id, which is all a count needs.
 */
function distinctPositionCount(modules: ApiTrainingModule[]): number {
  const ids = new Set<string>()
  for (const m of modules) {
    for (const p of m.positions ?? []) {
      const id = typeof p === 'string' ? p : p?.id
      if (id) ids.add(String(id))
    }
  }
  return ids.size
}

export interface ModulesFolderCardGridProps {
  folderRows: TrainingFolderRow[]
  /** Folder ids whose module list is hidden. Owned by the page so the toolbar can drive it. */
  collapsedFolderIds: Set<string>
  onToggleFolder: (folderId: string) => void
  selectedIds: Set<string>
  statusUpdatingId: string | null
  /** False on the Drafts / Archived tabs, where the tab already states the grouping. */
  showFolderHeaders?: boolean
  onSelectAllInFolder: (folderModules: ApiTrainingModule[]) => void
  onDelete: (moduleId: string) => void
  onView: (moduleId: string) => void
  onClone: (moduleId: string) => void
  onAssignFolders: (moduleId: string) => void
  onSetStatus: (moduleId: string, status: ModuleLifecycleStatus) => void
  onToggleSelect: (moduleId: string) => void
  /** Refetch the catalog after a position edit, so badge counts stay honest. */
  onPositionsChanged: () => void
}

type RowHandlers = Omit<
  ModulesFolderCardGridProps,
  | 'folderRows'
  | 'collapsedFolderIds'
  | 'onToggleFolder'
  | 'showFolderHeaders'
  | 'onSelectAllInFolder'
  | 'onPositionsChanged'
>

/**
 * The module list shared by every card shape.
 */
function ModuleRows({
  modules,
  emptyCopy,
  handlers,
}: {
  modules: ApiTrainingModule[]
  emptyCopy: string
  handlers: RowHandlers
}) {
  const [expanded, setExpanded] = useState(false)
  const hidden = modules.length - COLLAPSED_ROW_LIMIT
  const visible = expanded ? modules : modules.slice(0, COLLAPSED_ROW_LIMIT)

  if (modules.length === 0) {
    return (
      <p className="mb-0 px-1.5 py-3 text-[0.75rem] text-[#8c9097] dark:text-white/50">
        {emptyCopy}
      </p>
    )
  }

  return (
    <>
      <ul className="mb-0 list-none space-y-0.5 p-0">
        {visible.map((m) => (
          <FolderModuleRow
            key={m.id}
            module={m}
            selected={handlers.selectedIds.has(m.id)}
            statusUpdatingId={handlers.statusUpdatingId}
            onToggleSelect={handlers.onToggleSelect}
            onDelete={handlers.onDelete}
            onView={handlers.onView}
            onClone={handlers.onClone}
            onAssignFolders={handlers.onAssignFolders}
            onSetStatus={handlers.onSetStatus}
          />
        ))}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 min-h-11 border-0 bg-transparent px-1.5 text-start text-[0.75rem] font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
          aria-expanded={expanded}
        >
          {expanded ? 'Show fewer' : `Show all ${modules.length}`}
        </button>
      ) : null}
    </>
  )
}

/**
 * A single category folder rendered as a card.
 *
 * The header is the collapse control. Cards start open, because a wall of shut
 * folders says nothing about what is inside them; collapsing is what you reach for
 * once you have found the one you want to keep on screen.
 */
function FolderCard({
  folder,
  positionCount,
  allSelected,
  open,
  onToggleOpen,
  onSelectAll,
  onPositionsChanged,
  handlers,
}: {
  folder: TrainingFolderRow
  positionCount: number
  allSelected: boolean
  open: boolean
  onToggleOpen: () => void
  onSelectAll: () => void
  onPositionsChanged: () => void
  handlers: RowHandlers
}) {
  const count = folder.modules.length
  const headingId = `folder-card-${folder.id}`
  const panelId = `folder-panel-${folder.id}`
  const [positionsAnchor, setPositionsAnchor] = useState<HTMLElement | null>(null)

  return (
    <article
      className="flex h-full flex-col rounded-xl border border-defaultborder bg-white p-4 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-md dark:bg-bodybg"
      aria-labelledby={headingId}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <i className="ri-folder-2-fill text-lg" />
        </span>
        <FolderPositionsBadge
          count={positionCount}
          expanded={positionsAnchor !== null}
          onOpen={(el) => setPositionsAnchor((prev) => (prev ? null : el))}
        />
      </div>

      {positionsAnchor ? (
        <FolderPositionsPopover
          folderName={folder.name}
          modules={folder.modules}
          anchor={positionsAnchor}
          onClose={() => setPositionsAnchor(null)}
          onSaved={onPositionsChanged}
        />
      ) : null}

      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        aria-controls={panelId}
        className="-mx-1 mt-3 flex min-h-11 items-start gap-1.5 rounded-lg border-0 bg-transparent px-1 text-start transition-colors duration-200 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/5"
      >
        <i
          className={`ri-arrow-down-s-line mt-0.5 shrink-0 text-base text-[#8c9097] transition-transform duration-200 motion-reduce:transition-none dark:text-white/50 ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span
            id={headingId}
            className="block truncate text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white"
            title={folder.name}
          >
            {folder.name}
          </span>
          <span className="mt-0.5 block text-[0.75rem] font-normal text-[#8c9097] dark:text-white/50">
            {count} module{count === 1 ? '' : 's'}
            {' · '}
            {positionCount > 0
              ? `reaches ${positionCount} position${positionCount === 1 ? '' : 's'}`
              : 'no position maps here'}
          </span>
        </span>
      </button>

      {open ? (
        <div id={panelId} className="flex min-h-0 flex-1 flex-col">
          {count > 0 ? (
            <label className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 text-[0.75rem] text-[#8c9097] dark:text-white/50">
              <input
                type="checkbox"
                className="form-check-input !m-0 !h-3.5 !w-3.5 cursor-pointer"
                checked={allSelected}
                onChange={onSelectAll}
                aria-label={
                  allSelected ? `Deselect all in ${folder.name}` : `Select all in ${folder.name}`
                }
              />
              Select all
            </label>
          ) : null}

          <hr className="my-3 border-defaultborder" />

          <div className="min-h-0 flex-1">
            <ModuleRows
              modules={folder.modules}
              emptyCopy="No modules in this folder yet."
              handlers={handlers}
            />
          </div>

          <div className="mt-auto pt-3">
            <Link
              href={`/training/curriculum/modules/create?category=${encodeURIComponent(folder.id)}`}
              className="inline-flex min-h-11 items-center gap-1 text-[0.75rem] font-medium text-primary hover:underline"
            >
              <i className="ri-add-line text-sm" aria-hidden />
              Add module to this folder
            </Link>
          </div>
        </div>
      ) : null}
    </article>
  )
}

/**
 * Folder-first catalog: one card per category, its modules listed inside.
 *
 * Drafts, Archived and Uncategorized are not categories — they cannot be renamed,
 * deleted or assigned to — so they never become cards. The first two are already
 * lifecycle tabs in the toolbar, and Uncategorized lands in a full-width panel under
 * the grid where it reads as a holding area rather than a peer folder.
 */
export function ModulesFolderCardGrid({
  folderRows,
  collapsedFolderIds,
  onToggleFolder,
  selectedIds,
  statusUpdatingId,
  showFolderHeaders = true,
  onSelectAllInFolder,
  onDelete,
  onView,
  onClone,
  onAssignFolders,
  onSetStatus,
  onToggleSelect,
  onPositionsChanged,
}: ModulesFolderCardGridProps) {
  const handlers: RowHandlers = {
    selectedIds,
    statusUpdatingId,
    onDelete,
    onView,
    onClone,
    onAssignFolders,
    onSetStatus,
    onToggleSelect,
  }

  const categoryFolders = folderRows.filter((f) => f.kind === 'category')
  const looseModules = folderRows.filter((f) => f.kind !== 'category').flatMap((f) => f.modules)

  // Drafts / Archived tabs: the tab is the grouping, so one plain panel holds the lot.
  if (!showFolderHeaders) {
    return (
      <div className={MODULES_LIST_SCROLL_CLASS}>
        <div className="mx-1 rounded-xl border border-defaultborder bg-white p-4 shadow-sm dark:bg-bodybg">
          <ModuleRows
            modules={folderRows.flatMap((f) => f.modules)}
            emptyCopy="Nothing here."
            handlers={handlers}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={MODULES_LIST_SCROLL_CLASS}>
      <div className="grid grid-cols-1 gap-4 px-1 pb-4 sm:grid-cols-2 min-[900px]:grid-cols-3">
        {categoryFolders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            positionCount={distinctPositionCount(folder.modules)}
            allSelected={
              folder.modules.length > 0 && folder.modules.every((m) => selectedIds.has(m.id))
            }
            open={!collapsedFolderIds.has(folder.id)}
            onToggleOpen={() => onToggleFolder(folder.id)}
            onSelectAll={() => onSelectAllInFolder(folder.modules)}
            onPositionsChanged={onPositionsChanged}
            handlers={handlers}
          />
        ))}
      </div>

      {looseModules.length > 0 ? (
        <section
          className="mx-1 mb-4 rounded-xl border border-dashed border-defaultborder bg-black/[0.02] p-4 dark:bg-white/[0.02]"
          aria-labelledby="uncategorized-heading"
        >
          <div className="flex items-center gap-2">
            <i className="ri-inbox-line text-base text-[#8c9097]" aria-hidden />
            <h3
              id="uncategorized-heading"
              className="mb-0 text-[0.875rem] font-semibold text-defaulttextcolor dark:text-white"
            >
              Uncategorized
            </h3>
            <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
              {looseModules.length} module{looseModules.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mb-0 mt-0.5 text-[0.75rem] text-[#8c9097] dark:text-white/50">
            Not in any folder yet. Use a module&apos;s menu to move it into one.
          </p>
          <hr className="my-3 border-defaultborder" />
          <ModuleRows modules={looseModules} emptyCopy="Nothing here." handlers={handlers} />
        </section>
      ) : null}
    </div>
  )
}
