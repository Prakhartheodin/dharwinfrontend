'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { TrainingModule as ApiTrainingModule } from '@/shared/lib/api/training-modules'
import type { TrainingFolderRow } from '@/shared/lib/training/group-modules-into-folders'
import CurriculumFolderSection, {
  CurriculumFolderEmpty,
  MODULES_LIST_SCROLL_CLASS,
} from './CurriculumFolderSection'
import {
  TrainingModuleCard,
  type ModuleLifecycleStatus,
} from './TrainingModuleCard'

const HEADER_ESTIMATE_PX = 44
const EMPTY_ESTIMATE_PX = 40
const CARD_ROW_ESTIMATE_PX = 360

type VirtualRow =
  | { kind: 'header'; folder: TrainingFolderRow }
  | { kind: 'empty'; folder: TrainingFolderRow }
  | { kind: 'cards'; folder: TrainingFolderRow; modules: ApiTrainingModule[] }

export interface ModulesFolderListProps {
  folderRows: TrainingFolderRow[]
  collapsedCategoryIds: Set<string>
  selectedIds: Set<string>
  statusUpdatingId: string | null
  /** When false, skip folder chrome (Drafts / Archived tabs already label the list). */
  showFolderHeaders?: boolean
  onToggleCategory: (categoryId: string) => void
  onSelectAllInFolder: (folderModules: ApiTrainingModule[]) => void
  onDelete: (moduleId: string) => void
  onView: (moduleId: string) => void
  onClone: (moduleId: string) => void
  onAssignFolders: (moduleId: string) => void
  onSetStatus: (moduleId: string, status: ModuleLifecycleStatus) => void
  onToggleSelect: (moduleId: string) => void
}

/**
 * Column count from scroller width. 3-up kicks in at 900px so a sidebar layout still gets 3 cards.
 */
function columnCountForWidth(width: number): number {
  if (width >= 900) return 3
  if (width >= 640) return 2
  return 1
}

/**
 * Flatten folders into virtual rows: optional header, empty copy, then modules in chunks of `cols`.
 * @param showFolderHeaders When false (Drafts/Archived tabs), skip chrome already implied by the tab.
 */
function buildVirtualRows(
  folderRows: TrainingFolderRow[],
  collapsedCategoryIds: Set<string>,
  showFolderHeaders: boolean,
  cols: number
): VirtualRow[] {
  const chunk = Math.max(1, cols)
  const rows: VirtualRow[] = []
  for (const folder of folderRows) {
    if (showFolderHeaders) rows.push({ kind: 'header', folder })
    if (showFolderHeaders && collapsedCategoryIds.has(folder.id)) continue
    if (folder.modules.length === 0) {
      rows.push({ kind: 'empty', folder })
      continue
    }
    for (let i = 0; i < folder.modules.length; i += chunk) {
      rows.push({ kind: 'cards', folder, modules: folder.modules.slice(i, i + chunk) })
    }
  }
  return rows
}

/**
 * Estimated pixel height before measureElement runs.
 */
function estimateVirtualRowSize(row: VirtualRow): number {
  if (row.kind === 'header') return HEADER_ESTIMATE_PX
  if (row.kind === 'empty') return EMPTY_ESTIMATE_PX
  return CARD_ROW_ESTIMATE_PX
}

/**
 * Virtualized folder list with measured N-up module cards.
 */
export function ModulesFolderList({
  folderRows,
  collapsedCategoryIds,
  selectedIds,
  statusUpdatingId,
  onToggleCategory,
  showFolderHeaders = true,
  onSelectAllInFolder,
  onDelete,
  onView,
  onClone,
  onAssignFolders,
  onSetStatus,
  onToggleSelect,
}: ModulesFolderListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(1)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    /**
     * Sync column count to the scroller’s client width.
     */
    const apply = () => {
      setCols(columnCountForWidth(el.clientWidth))
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const virtualRows = useMemo(
    () => buildVirtualRows(folderRows, collapsedCategoryIds, showFolderHeaders, cols),
    [folderRows, collapsedCategoryIds, showFolderHeaders, cols]
  )

  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const row = virtualRows[index]
      return row ? estimateVirtualRowSize(row) : CARD_ROW_ESTIMATE_PX
    },
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (el) => el.getBoundingClientRect().height
        : undefined,
    overscan: 8,
  })

  useEffect(() => {
    virtualizer.measure()
  }, [cols, virtualizer])

  const renderHeader = useCallback(
    (folder: TrainingFolderRow) => {
      const isCollapsed = collapsedCategoryIds.has(folder.id)
      const allInFolderSelected =
        folder.modules.length > 0 && folder.modules.every((m) => selectedIds.has(m.id))
      return (
        <CurriculumFolderSection
          folderId={folder.id}
          name={folder.name}
          moduleCount={folder.modules.length}
          kind={folder.kind}
          collapsed={isCollapsed}
          allSelected={allInFolderSelected}
          showSelectAll={folder.modules.length > 0}
          onToggle={() => onToggleCategory(folder.id)}
          onSelectAll={() => onSelectAllInFolder(folder.modules)}
          renderBody={false}
        >
          {null}
        </CurriculumFolderSection>
      )
    },
    [collapsedCategoryIds, selectedIds, onSelectAllInFolder, onToggleCategory]
  )

  return (
    <div
      ref={scrollRef}
      className={MODULES_LIST_SCROLL_CLASS}
      role="region"
      aria-label="Training module folders"
    >
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const row = virtualRows[vItem.index]
          if (!row) return null
          return (
            <div
              key={`${row.kind}-${row.folder.id}-${vItem.index}`}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${vItem.start}px)` }}
            >
              {row.kind === 'header' ? renderHeader(row.folder) : null}
              {row.kind === 'empty' ? <CurriculumFolderEmpty kind={row.folder.kind} /> : null}
              {row.kind === 'cards' ? (
                <div
                  className="px-1 pb-4 gap-4 grid"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {row.modules.map((m) => (
                    <TrainingModuleCard
                      key={m.id ?? (m as unknown as { _id?: string })._id ?? m.moduleName}
                      module={m}
                      onDelete={onDelete}
                      onView={onView}
                      onClone={onClone}
                      onAssignFolders={onAssignFolders}
                      onSetStatus={onSetStatus}
                      statusUpdatingId={statusUpdatingId}
                      selected={selectedIds.has(m.id)}
                      onToggleSelect={onToggleSelect}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
