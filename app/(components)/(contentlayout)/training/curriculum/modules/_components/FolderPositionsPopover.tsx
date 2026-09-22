'use client'

import Link from 'next/link'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as positionsApi from '@/shared/lib/api/positions'
import type { PositionRosterItem } from '@/shared/lib/api/positions'
import type { TrainingModule as ApiTrainingModule } from '@/shared/lib/api/training-modules'

const PANEL_WIDTH = 320
const GUTTER = 8

export interface FolderPositionsPopoverProps {
  folderName: string
  modules: ApiTrainingModule[]
  anchor: HTMLElement
  onClose: () => void
  /** Called after a successful save so the catalog can pick up new module.positions. */
  onSaved: () => void
}

/** Position ids on a module, whether the field arrived populated or as raw ids. */
function positionIdsOf(m: ApiTrainingModule): string[] {
  return (m.positions ?? [])
    .map((p) => (typeof p === 'string' ? p : p?.id))
    .filter((id): id is string => Boolean(id))
    .map(String)
}

/**
 * Clamp the panel inside the viewport; the badge sits at a card's top-right, so an
 * unclamped panel runs off screen in the right-hand column.
 */
function panelCoords(anchor: HTMLElement) {
  const r = anchor.getBoundingClientRect()
  const left = Math.max(
    GUTTER,
    Math.min(r.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - GUTTER)
  )
  const spaceBelow = window.innerHeight - r.bottom
  const openUp = spaceBelow <= 280
  const maxHeight = Math.max(200, (openUp ? r.top : spaceBelow) - GUTTER * 2)
  return {
    left,
    top: openUp ? Math.max(GUTTER, r.top - maxHeight - GUTTER) : r.bottom + GUTTER,
    maxHeight,
  }
}

/**
 * The positions behind a folder's badge, and the editor for them.
 *
 * A folder has no positions of its own — the live mapping is Position -> Modules, so
 * what the badge counts is the union across the folder's modules. Editing therefore
 * means editing one position's module list, and the panel shows exactly which of this
 * folder's modules that position covers.
 *
 * `PUT /positions/:id/modules` replaces the whole list, so a save keeps every module
 * the position holds outside this folder and rewrites only the ones shown here.
 * Two people editing the same position at once still means last write wins.
 */
export default function FolderPositionsPopover({
  folderName,
  modules,
  anchor,
  onClose,
  onSaved,
}: FolderPositionsPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState(() => panelCoords(anchor))
  const [roster, setRoster] = useState<PositionRosterItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftModuleIds, setDraftModuleIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)

  const folderModuleIds = useMemo(() => modules.map((m) => m.id), [modules])

  // Fetched on open, not with the catalog: most visits never touch a badge, and the
  // module list is already the slowest thing on this page.
  useEffect(() => {
    let cancelled = false
    positionsApi
      .getPositionRoster()
      .then((res) => {
        if (!cancelled) setRoster(res.results ?? [])
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load positions.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const reposition = () => setCoords(panelCoords(anchor))
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [anchor])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || anchor.contains(t)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [anchor, onClose])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  /** Positions that already reach at least one module here, plus their coverage. */
  const reaching = useMemo(() => {
    if (!roster) return []
    const covered = new Map<string, number>()
    for (const m of modules) {
      for (const id of positionIdsOf(m)) covered.set(id, (covered.get(id) ?? 0) + 1)
    }
    return roster
      .filter((p) => covered.has(p.id))
      .map((p) => ({ position: p, covers: covered.get(p.id) ?? 0 }))
      .sort((a, b) => b.covers - a.covers || a.position.name.localeCompare(b.position.name))
  }, [roster, modules])

  const unreaching = useMemo(() => {
    if (!roster) return []
    const reachingIds = new Set(reaching.map((r) => r.position.id))
    return roster
      .filter((p) => !reachingIds.has(p.id) && !p.unlinked)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [roster, reaching])

  const startEditing = useCallback(
    (position: PositionRosterItem) => {
      const assigned = new Set((position.assignedModules ?? []).map((m) => m.id))
      setDraftModuleIds(new Set(folderModuleIds.filter((id) => assigned.has(id))))
      setEditingId(position.id)
      setAdding(false)
    },
    [folderModuleIds]
  )

  const handleSave = useCallback(async () => {
    const position = roster?.find((p) => p.id === editingId)
    if (!position) return
    setSaving(true)
    try {
      // Everything this position holds elsewhere is preserved; only the folder's own
      // modules are rewritten from the checkboxes.
      const outside = (position.assignedModules ?? [])
        .map((m) => m.id)
        .filter((id) => !folderModuleIds.includes(id))
      const next = [...new Set([...outside, ...draftModuleIds])]
      const res = await positionsApi.setPositionModules(position.id, next)
      setRoster((prev) =>
        (prev ?? []).map((p) =>
          p.id === position.id ? { ...p, assignedModules: res.assignedModules } : p
        )
      )
      setEditingId(null)
      onSaved()
    } catch {
      setLoadError('Could not save. Nothing was changed.')
    } finally {
      setSaving(false)
    }
  }, [roster, editingId, folderModuleIds, draftModuleIds, onSaved])

  const editing = roster?.find((p) => p.id === editingId) ?? null

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Positions for ${folderName}`}
      tabIndex={-1}
      className="fixed z-[140] flex flex-col overflow-hidden rounded-xl border border-defaultborder bg-white shadow-xl focus:outline-none dark:bg-bodybg"
      style={{
        top: coords.top,
        left: coords.left,
        width: PANEL_WIDTH,
        maxHeight: coords.maxHeight,
      }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-defaultborder p-3">
        <div className="min-w-0">
          <p className="mb-0 truncate text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-white">
            {editing ? editing.name : 'Positions reaching this folder'}
          </p>
          <p className="mb-0 truncate text-[0.6875rem] text-[#8c9097] dark:text-white/50">
            {editing ? `Which modules in ${folderName} it covers` : folderName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ti-btn ti-btn-light !mb-0 !h-7 !w-7 !p-0"
          aria-label="Close"
        >
          <i className="ri-close-line" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loadError ? (
          <p className="mb-0 text-[0.75rem] text-danger">{loadError}</p>
        ) : roster === null ? (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded bg-black/10 motion-reduce:animate-none dark:bg-white/10"
              />
            ))}
          </div>
        ) : editing ? (
          <ul className="mb-0 list-none space-y-0.5 p-0">
            {modules.map((m) => (
              <li key={m.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1.5 hover:bg-black/5 dark:hover:bg-white/5">
                  <input
                    type="checkbox"
                    className="form-check-input !m-0 !h-3.5 !w-3.5 shrink-0 cursor-pointer"
                    checked={draftModuleIds.has(m.id)}
                    onChange={() =>
                      setDraftModuleIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(m.id)) next.delete(m.id)
                        else next.add(m.id)
                        return next
                      })
                    }
                  />
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-defaulttextcolor dark:text-white/90">
                    {m.moduleName}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {reaching.length > 0 ? (
              <ul className="mb-0 list-none space-y-0.5 p-0">
                {reaching.map(({ position, covers }) => (
                  <li key={position.id}>
                    <button
                      type="button"
                      onClick={() => startEditing(position)}
                      className="flex min-h-11 w-full items-center gap-2 rounded-lg border-0 bg-transparent px-1.5 text-start hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8125rem] text-defaulttextcolor dark:text-white/90">
                          {position.name}
                        </span>
                        <span className="block text-[0.6875rem] text-[#8c9097] dark:text-white/50">
                          {covers} of {modules.length} module{modules.length === 1 ? '' : 's'}
                        </span>
                      </span>
                      <i
                        className="ri-pencil-line shrink-0 text-[#8c9097] dark:text-white/50"
                        aria-hidden
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-0 px-1.5 py-2 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                No position maps to any module in this folder yet.
              </p>
            )}

            {adding ? (
              <div className="mt-2 border-t border-defaultborder pt-2">
                <p className="mb-1 px-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-[#8c9097] dark:text-white/50">
                  Add a position
                </p>
                {unreaching.length === 0 ? (
                  <p className="mb-0 px-1.5 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                    Every position already reaches this folder.
                  </p>
                ) : (
                  <ul className="mb-0 list-none space-y-0.5 p-0">
                    {unreaching.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => startEditing(p)}
                          className="flex min-h-11 w-full items-center gap-2 rounded-lg border-0 bg-transparent px-1.5 text-start text-[0.8125rem] text-defaulttextcolor hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-white/90 dark:hover:bg-white/5"
                        >
                          <span className="min-w-0 flex-1 truncate">{p.name}</span>
                          <i className="ri-add-line shrink-0 text-primary" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-defaultborder p-3">
        {editing ? (
          <>
            <button
              type="button"
              className="ti-btn ti-btn-light !mb-0 h-9 !py-0"
              onClick={() => setEditingId(null)}
              disabled={saving}
            >
              Back
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-primary !mb-0 h-9 !py-0"
              onClick={handleSave}
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="ti-btn ti-btn-light !mb-0 h-9 !py-0"
              onClick={() => setAdding((v) => !v)}
              aria-expanded={adding}
              disabled={roster === null}
            >
              <i className="ri-add-line me-1" aria-hidden />
              Add position
            </button>
            <Link
              href="/training/curriculum/setup?tab=positions"
              className="text-[0.75rem] font-medium text-primary hover:underline"
            >
              Manage
            </Link>
          </>
        )}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(panel, document.body)
}
