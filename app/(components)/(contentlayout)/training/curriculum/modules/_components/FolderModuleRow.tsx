'use client'

import React from 'react'
import type { TrainingModule as ApiTrainingModule } from '@/shared/lib/api/training-modules'
import ModuleStatusBadge, {
  normalizeModuleStatus,
  type ModuleLifecycleStatus,
} from './ModuleStatusBadge'
import ModuleRowActions from './ModuleRowActions'

export interface FolderModuleRowProps {
  module: ApiTrainingModule
  selected: boolean
  statusUpdatingId: string | null
  onToggleSelect: (moduleId: string) => void
  onDelete: (moduleId: string) => void
  onView: (moduleId: string) => void
  onClone: (moduleId: string) => void
  onAssignFolders: (moduleId: string) => void
  onSetStatus: (moduleId: string, status: ModuleLifecycleStatus) => void
}

/**
 * One module inside a folder card: select, open, status, row menu.
 *
 * The row is now the whole of a module's presence on this screen, so the kebab keeps
 * clone / move / publish / delete reachable rather than pushing them into the editor.
 * `min-h-11` holds the 44px touch target even though the label is a single line.
 */
export function FolderModuleRow({
  module: m,
  selected,
  statusUpdatingId,
  onToggleSelect,
  onDelete,
  onView,
  onClone,
  onAssignFolders,
  onSetStatus,
}: FolderModuleRowProps) {
  const currentStatus = normalizeModuleStatus(m.status)
  const lessonTotal = m.playlistSummary
    ? Object.values(m.playlistSummary).reduce((a, n) => a + n, 0)
    : (m.playlist?.length ?? 0)

  return (
    <li
      className={`flex min-h-11 items-center gap-2 rounded-lg px-1.5 transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/5 ${
        selected ? 'bg-primary/5' : ''
      }`}
    >
      <label className="flex h-11 w-6 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          className="form-check-input !m-0 !h-3.5 !w-3.5 cursor-pointer"
          checked={selected}
          onChange={() => onToggleSelect(m.id)}
          aria-label={`Select ${m.moduleName}`}
        />
      </label>

      <button
        type="button"
        onClick={() => onView(m.id)}
        className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-start text-[0.8125rem] leading-snug text-defaulttextcolor hover:text-primary focus-visible:underline focus-visible:outline-none dark:text-white/90"
        title={m.moduleName}
      >
        {m.moduleName}
      </button>

      <span
        className="shrink-0 text-[0.6875rem] tabular-nums text-[#8c9097] dark:text-white/50"
        aria-label={`${lessonTotal} lesson${lessonTotal === 1 ? '' : 's'}`}
      >
        {lessonTotal}
      </span>

      {currentStatus === 'published' ? (
        <i
          className="ri-check-line shrink-0 text-base text-success"
          role="img"
          aria-label="Published"
        />
      ) : (
        <ModuleStatusBadge status={currentStatus} className="shrink-0" />
      )}

      <ModuleRowActions
        moduleId={m.id}
        moduleName={m.moduleName}
        currentStatus={currentStatus}
        statusBusy={statusUpdatingId === m.id}
        onView={() => onView(m.id)}
        onClone={() => onClone(m.id)}
        onAssignFolders={() => onAssignFolders(m.id)}
        onSetStatus={(next: ModuleLifecycleStatus) => onSetStatus(m.id, next)}
        onDelete={() => onDelete(m.id)}
      />
    </li>
  )
}
