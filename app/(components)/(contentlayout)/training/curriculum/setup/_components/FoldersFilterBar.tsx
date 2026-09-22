"use client"

import React, { useEffect, useMemo, useState } from "react"
import type { Category } from "@/shared/lib/api/categories"
import {
  categoryMatchesFolderQuery,
  orderCategoriesForFilter,
  pickVisibleFolderChips,
} from "../_lib/folderFilter"

export interface FoldersFilterBarProps {
  categories: Category[]
  selectedFolderIds: string[]
  /** Shared search string (header field); narrows chips client-side. */
  folderQuery: string
  onToggleFolder: (id: string) => void
  onClearFolders: () => void
}

function duplicateNameIds(categories: Category[]): Set<string> {
  const counts = new Map<string, number>()
  for (const cat of categories) {
    const key = cat.name.trim().toLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const dupes = new Set<string>()
  for (const cat of categories) {
    const key = cat.name.trim().toLowerCase()
    if ((counts.get(key) ?? 0) > 1) dupes.add(cat.id)
  }
  return dupes
}

export default function FoldersFilterBar({
  categories,
  selectedFolderIds,
  folderQuery,
  onToggleFolder,
  onClearFolders,
}: FoldersFilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  // Collapse the chip strip when the shared query changes (same as the old local input).
  useEffect(() => {
    setExpanded(false)
  }, [folderQuery])

  const nameDupes = useMemo(() => duplicateNameIds(categories), [categories])

  const matched = useMemo(() => {
    const q = folderQuery.trim()
    if (!q) return categories
    const selectedSet = new Set(selectedFolderIds)
    return categories.filter(
      (c) => selectedSet.has(c.id) || categoryMatchesFolderQuery(c, q)
    )
  }, [categories, folderQuery, selectedFolderIds])

  const ordered = useMemo(
    () => orderCategoriesForFilter(matched, selectedFolderIds),
    [matched, selectedFolderIds]
  )

  const { visible, hiddenCount } = useMemo(
    () => pickVisibleFolderChips(ordered, selectedFolderIds, expanded),
    [ordered, selectedFolderIds, expanded]
  )

  const collapsedHidden = useMemo(
    () => pickVisibleFolderChips(ordered, selectedFolderIds, false).hiddenCount,
    [ordered, selectedFolderIds]
  )

  const selectedCount = selectedFolderIds.length
  const showExpandToggle = !expanded && hiddenCount > 0
  const canCollapse = expanded && collapsedHidden > 0

  if (categories.length === 0) {
    return (
      <div className="border-b border-defaultborder/50 px-4 py-2">
        <p className="text-[0.75rem] text-defaulttextcolor/70">
          No folders yet. Use Manage folders to create one.
        </p>
      </div>
    )
  }

  return (
    <div className="border-b border-defaultborder/50 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          id="curriculum-folders-filter-label"
          className="shrink-0 text-[0.7rem] font-semibold uppercase tracking-wide text-defaulttextcolor/60"
        >
          Folders
        </span>
        {selectedCount > 0 ? (
          <button
            type="button"
            className="ms-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-semibold text-defaulttextcolor/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={onClearFolders}
          >
            <i className="ri-close-line" aria-hidden /> Clear ({selectedCount})
          </button>
        ) : null}
      </div>

      <span className="sr-only" aria-live="polite">
        {selectedCount === 0
          ? "No folder filters selected"
          : `${selectedCount} folder filter${selectedCount === 1 ? "" : "s"} selected`}
      </span>

      {matched.length === 0 ? (
        <p className="mt-2 text-[0.75rem] text-defaulttextcolor/70">No folders match that search.</p>
      ) : (
        <div
          className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5"
          role="group"
          aria-labelledby="curriculum-folders-filter-label"
        >
          {visible.map((cat) => {
            const active = selectedFolderIds.includes(cat.id)
            const isDupe = nameDupes.has(cat.id)
            const tip = isDupe ? `${cat.name} (${cat.id})` : cat.name
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={active}
                title={tip}
                aria-label={isDupe ? `${cat.name}, id ${cat.id}` : cat.name}
                className={`inline-flex max-w-[14rem] items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-defaultborder/70 bg-defaulttextcolor/5 text-defaulttextcolor/70 hover:border-primary/40 hover:text-primary"
                }`}
                onClick={() => onToggleFolder(cat.id)}
              >
                {active ? (
                  <i className="ri-check-line shrink-0 text-[0.85rem]" aria-hidden />
                ) : null}
                <span className="min-w-0 truncate">{cat.name}</span>
              </button>
            )
          })}
          {showExpandToggle ? (
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-dashed border-defaultborder/80 px-2.5 py-1 text-[0.7rem] font-semibold text-defaulttextcolor/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={() => setExpanded(true)}
            >
              Show all ({hiddenCount} more)
            </button>
          ) : null}
          {canCollapse ? (
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-dashed border-defaultborder/80 px-2.5 py-1 text-[0.7rem] font-semibold text-defaulttextcolor/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={() => setExpanded(false)}
            >
              Show less
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
