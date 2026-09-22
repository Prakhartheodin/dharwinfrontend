"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Swal from "sweetalert2"
import { AxiosError } from "axios"
import type { PositionRosterItem } from "@/shared/lib/api/positions"
import * as positionsApi from "@/shared/lib/api/positions"
import { useModalBehavior } from "@/shared/hooks/useModalBehavior"

export interface BulkAssignDialogProps {
  open: boolean
  positions: PositionRosterItem[]
  onClose: () => void
  onDone: () => void
}

type BulkAction = "assign" | "remove"

function positionIdOf(pos: PositionRosterItem): string {
  return pos.id || (pos as { _id?: string })._id || ""
}

/** Prefer trainable (studentCount); fall back to employeeCount. Display only. */
function enrolableCount(pos: PositionRosterItem): number {
  return pos.studentCount ?? pos.employeeCount ?? 0
}

/** Title for the secondary count: studentCount = trainable, employeeCount = employees. */
function enrolableCountTitle(pos: PositionRosterItem): string {
  const hasStudent = pos.studentCount != null
  const employees = pos.employeeCount ?? 0
  if (hasStudent && pos.employeeCount != null) {
    return `${pos.studentCount} trainable · ${employees} employees`
  }
  if (hasStudent) {
    return `${pos.studentCount} trainable`
  }
  return `${employees} employee${employees === 1 ? "" : "s"}`
}

function duplicatePositionIds(positions: PositionRosterItem[]): Set<string> {
  const counts = new Map<string, number>()
  for (const pos of positions) {
    const key = pos.name.trim().toLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const dupes = new Set<string>()
  for (const pos of positions) {
    const key = pos.name.trim().toLowerCase()
    if ((counts.get(key) ?? 0) > 1) dupes.add(positionIdOf(pos))
  }
  return dupes
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export default function BulkAssignDialog({
  open,
  positions,
  onClose,
  onDone,
}: BulkAssignDialogProps) {
  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<string>>(new Set())
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set())
  const [action, setAction] = useState<BulkAction>("assign")
  const [submitting, setSubmitting] = useState(false)
  const [positionQuery, setPositionQuery] = useState("")
  const [courseQuery, setCourseQuery] = useState("")
  const [mounted, setMounted] = useState(false)
  const selectAllPositionsRef = useRef<HTMLInputElement>(null)
  const selectAllCoursesRef = useRef<HTMLInputElement>(null)

  const { containerRef, backdropProps } = useModalBehavior({ isOpen: open, onClose })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      setSelectedPositionIds(new Set())
      setSelectedModuleIds(new Set())
      setAction("assign")
      setPositionQuery("")
      setCourseQuery("")
      setSubmitting(false)
    }
  }, [open])

  const catalogued = useMemo(
    () => positions.filter((p) => !p.unlinked && !positionIdOf(p).startsWith("unlinked:")),
    [positions]
  )

  const nameDupes = useMemo(() => duplicatePositionIds(catalogued), [catalogued])

  const modules = useMemo(() => {
    const map = new Map<string, string>()
    for (const pos of catalogued) {
      for (const mod of pos.assignedModules ?? []) {
        if (!map.has(mod.id)) map.set(mod.id, mod.name)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [catalogued])

  const filteredPositions = useMemo(() => {
    const q = positionQuery.trim().toLowerCase()
    if (!q) return catalogued
    return catalogued.filter((pos) => {
      const id = positionIdOf(pos)
      return (
        pos.name.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q)
      )
    })
  }, [catalogued, positionQuery])

  const filteredModules = useMemo(() => {
    const q = courseQuery.trim().toLowerCase()
    if (!q) return modules
    return modules.filter((mod) => mod.name.toLowerCase().includes(q))
  }, [modules, courseQuery])

  const filteredPositionIds = useMemo(
    () => filteredPositions.map(positionIdOf).filter(Boolean),
    [filteredPositions]
  )

  const filteredModuleIds = useMemo(
    () => filteredModules.map((m) => m.id),
    [filteredModules]
  )

  const selectedFilteredPositionCount = filteredPositionIds.filter((id) =>
    selectedPositionIds.has(id)
  ).length
  const selectedFilteredModuleCount = filteredModuleIds.filter((id) =>
    selectedModuleIds.has(id)
  ).length

  const allFilteredPositionsSelected =
    filteredPositionIds.length > 0 && selectedFilteredPositionCount === filteredPositionIds.length
  const someFilteredPositionsSelected =
    selectedFilteredPositionCount > 0 && selectedFilteredPositionCount < filteredPositionIds.length

  const allFilteredModulesSelected =
    filteredModuleIds.length > 0 && selectedFilteredModuleCount === filteredModuleIds.length
  const someFilteredModulesSelected =
    selectedFilteredModuleCount > 0 && selectedFilteredModuleCount < filteredModuleIds.length

  useEffect(() => {
    if (selectAllPositionsRef.current) {
      selectAllPositionsRef.current.indeterminate = someFilteredPositionsSelected
    }
  }, [someFilteredPositionsSelected])

  useEffect(() => {
    if (selectAllCoursesRef.current) {
      selectAllCoursesRef.current.indeterminate = someFilteredModulesSelected
    }
  }, [someFilteredModulesSelected])

  const selectedPositions = catalogued.filter((p) => selectedPositionIds.has(positionIdOf(p)))
  const positionTotal = selectedPositionIds.size
  const moduleTotal = selectedModuleIds.size
  const canConfirm = positionTotal > 0 && moduleTotal > 0 && !submitting
  const selectionValid = positionTotal > 0 && moduleTotal > 0

  const footerStatus = selectionValid
    ? `${plural(positionTotal, "position", "positions")} · ${plural(moduleTotal, "course", "courses")} selected`
    : "Select at least one position and one course."

  if (!open || !mounted) return null

  const togglePosition = (id: string) => {
    setSelectedPositionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleModule = (id: string) => {
    setSelectedModuleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFilteredPositions = (checked: boolean) => {
    setSelectedPositionIds((prev) => {
      const next = new Set(prev)
      for (const id of filteredPositionIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const selectAllFilteredModules = (checked: boolean) => {
    setSelectedModuleIds((prev) => {
      const next = new Set(prev)
      for (const id of filteredModuleIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const runBulk = async () => {
    setSubmitting(true)
    try {
      const moduleIds = Array.from(selectedModuleIds)
      await Promise.all(
        selectedPositions.map((pos) =>
          positionsApi.bulkEnroll(positionIdOf(pos), { moduleIds, action })
        )
      )
      await Swal.fire({
        icon: "success",
        title: action === "assign" ? "Courses assigned" : "Courses removed",
        text: footerStatus,
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      })
      onDone()
      onClose()
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Bulk enrolment failed."
      await Swal.fire({
        icon: "error",
        title: "Bulk enrolment failed",
        text: msg,
        toast: true,
        position: "top-end",
        timer: 4000,
        showConfirmButton: false,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!canConfirm) return

    if (action === "remove") {
      const result = await Swal.fire({
        title: "Remove courses?",
        text: `Remove ${plural(moduleTotal, "course", "courses")} from ${plural(positionTotal, "position", "positions")}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Remove courses",
      })
      if (!result.isConfirmed) return
    }

    await runBulk()
  }

  const confirmLabel = action === "assign" ? "Assign courses" : "Remove courses"
  const positionFilterActive = Boolean(positionQuery.trim())
  const courseFilterActive = Boolean(courseQuery.trim())

  const selectAllPositionsLabel = positionFilterActive
    ? `Select all ${filteredPositionIds.length} shown`
    : "Select all positions"
  const selectAllCoursesLabel = courseFilterActive
    ? `Select all ${filteredModuleIds.length} shown`
    : "Select all courses"

  const rowBaseClass =
    "flex w-full min-h-11 min-w-0 list-none items-start gap-2 overflow-hidden rounded-md border border-transparent px-2 py-2 text-sm hover:bg-defaulttextcolor/5 before:hidden before:content-none after:hidden after:content-none"
  const rowSelectedClass =
    "border-primary/30 bg-primary/5 dark:border-primary/40 dark:bg-primary/10"

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-assign-title"
    >
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/75"
        data-testid="bulk-assign-backdrop"
        aria-hidden
        {...backdropProps}
      />
      <div
        ref={containerRef}
        className="relative z-[1] flex max-h-[min(90vh,42rem)] w-[min(52rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-bodybg"
      >
        <div className="shrink-0 border-b border-defaultborder/60 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="bulk-assign-title"
                className="text-lg font-semibold text-defaulttextcolor dark:text-white"
              >
                Bulk Assign
              </h2>
              <p className="mt-0.5 text-sm font-medium text-defaulttextcolor/80 dark:text-white/80">
                Assign courses to multiple positions
              </p>
              <p className="mt-1 text-sm text-defaulttextcolor/55 dark:text-white/55">
                Select the positions and courses you want to link.
              </p>
            </div>
            <button
              type="button"
              className="ti-btn ti-btn-icon ti-btn-light !mb-0 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Close bulk assign"
              onClick={onClose}
            >
              <i className="ri-close-line text-xl" aria-hidden />
            </button>
          </div>

          <div className="mt-3">
            <p id="bulk-action-label" className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-defaulttextcolor/55">
              Action
            </p>
            <div
              role="group"
              aria-labelledby="bulk-action-label"
              className="inline-flex max-w-full overflow-hidden rounded-lg border border-defaultborder/70 bg-defaulttextcolor/[0.03] p-0.5 dark:bg-white/[0.03]"
            >
              <button
                type="button"
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  action === "assign"
                    ? "bg-primary text-white shadow-sm"
                    : "text-defaulttextcolor/70 hover:text-defaulttextcolor dark:text-white/70 dark:hover:text-white"
                }`}
                aria-pressed={action === "assign"}
                onClick={() => setAction("assign")}
              >
                {action === "assign" ? (
                  <i className="ri-check-line text-base" aria-hidden />
                ) : null}
                Assign
              </button>
              <button
                type="button"
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 ${
                  action === "remove"
                    ? "bg-danger text-white shadow-sm"
                    : "text-defaulttextcolor/70 hover:text-defaulttextcolor dark:text-white/70 dark:hover:text-white"
                }`}
                aria-pressed={action === "remove"}
                onClick={() => setAction("remove")}
              >
                {action === "remove" ? (
                  <i className="ri-check-line text-base" aria-hidden />
                ) : null}
                Remove
              </button>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden sm:grid-cols-2">
          <fieldset className="flex min-h-0 min-w-0 flex-col border-b border-defaultborder/50 p-3 sm:border-b-0 sm:border-e sm:p-4">
            <legend className="mb-2 flex w-full items-baseline justify-between gap-2 px-0.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-defaulttextcolor/70">
                Positions
              </span>
              <span className="text-xs font-medium tabular-nums text-defaulttextcolor/50">
                {positionTotal} selected
              </span>
            </legend>
            <input
              type="search"
              className="form-control mb-2 !py-1.5 !text-[0.75rem]"
              placeholder="Search positions…"
              value={positionQuery}
              onChange={(e) => setPositionQuery(e.target.value)}
              aria-label="Search positions"
            />
            <label className="mb-2 flex min-h-9 items-center gap-2 text-sm">
              <input
                ref={selectAllPositionsRef}
                type="checkbox"
                className="form-check-input shrink-0"
                checked={allFilteredPositionsSelected}
                disabled={filteredPositionIds.length === 0}
                onChange={(e) => selectAllFilteredPositions(e.target.checked)}
                aria-label={
                  positionFilterActive
                    ? "Select all filtered positions"
                    : "Select all positions"
                }
              />
              {selectAllPositionsLabel}
            </label>
            <div className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto rounded-md border border-defaultborder/60 p-2 sm:max-h-none max-h-48">
              {filteredPositions.length === 0 ? (
                <div className="px-1 py-3 text-sm text-defaulttextcolor/50">
                  {catalogued.length === 0 ? (
                    <p>No catalogue positions available.</p>
                  ) : (
                    <>
                      <p className="font-medium text-defaulttextcolor/65">No positions found</p>
                      <p className="mt-0.5">Try a different search term.</p>
                    </>
                  )}
                </div>
              ) : (
                filteredPositions.map((pos) => {
                  const id = positionIdOf(pos)
                  const isDupe = nameDupes.has(id)
                  const n = enrolableCount(pos)
                  const countTip = enrolableCountTitle(pos)
                  const selected = selectedPositionIds.has(id)
                  const tip = isDupe ? `${pos.name} (${id}) · ${countTip}` : `${pos.name} · ${countTip}`
                  return (
                    <label
                      key={id}
                      className={`${rowBaseClass} ${selected ? rowSelectedClass : ""}`}
                      title={tip}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input mt-0.5 shrink-0"
                        checked={selected}
                        onChange={() => togglePosition(id)}
                        aria-label={isDupe ? `${pos.name}, id ${id}` : pos.name}
                      />
                      <span className="min-w-0 flex-1 break-words leading-snug">{pos.name}</span>
                      {isDupe ? (
                        <span
                          className="max-w-[4.5rem] shrink-0 truncate text-[0.65rem] leading-snug text-defaulttextcolor/45"
                          title={id}
                        >
                          {id}
                        </span>
                      ) : null}
                      <span
                        className="shrink-0 text-[0.7rem] leading-snug tabular-nums text-defaulttextcolor/45"
                        title={countTip}
                      >
                        {n}
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </fieldset>

          <fieldset className="flex min-h-0 min-w-0 flex-col p-3 sm:p-4">
            <legend className="mb-2 flex w-full items-baseline justify-between gap-2 px-0.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-defaulttextcolor/70">
                Courses
              </span>
              <span className="text-xs font-medium tabular-nums text-defaulttextcolor/50">
                {moduleTotal} selected
              </span>
            </legend>
            <input
              type="search"
              className="form-control mb-2 !py-1.5 !text-[0.75rem]"
              placeholder="Search courses…"
              value={courseQuery}
              onChange={(e) => setCourseQuery(e.target.value)}
              aria-label="Search courses"
            />
            <label className="mb-2 flex min-h-9 items-center gap-2 text-sm">
              <input
                ref={selectAllCoursesRef}
                type="checkbox"
                className="form-check-input shrink-0"
                checked={allFilteredModulesSelected}
                disabled={filteredModuleIds.length === 0}
                onChange={(e) => selectAllFilteredModules(e.target.checked)}
                aria-label={
                  courseFilterActive ? "Select all filtered courses" : "Select all courses"
                }
              />
              {selectAllCoursesLabel}
            </label>
            <div className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto rounded-md border border-defaultborder/60 p-2 sm:max-h-none max-h-48">
              {modules.length === 0 ? (
                <p className="px-1 py-3 text-sm text-defaulttextcolor/50">
                  No courses on the selected roster.
                </p>
              ) : filteredModules.length === 0 ? (
                <div className="px-1 py-3 text-sm text-defaulttextcolor/50">
                  <p className="font-medium text-defaulttextcolor/65">No courses found</p>
                  <p className="mt-0.5">Try a different search term.</p>
                </div>
              ) : (
                filteredModules.map((mod) => {
                  const selected = selectedModuleIds.has(mod.id)
                  return (
                    <label
                      key={mod.id}
                      className={`${rowBaseClass} ${selected ? rowSelectedClass : ""}`}
                      title={mod.name}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input mt-0.5 shrink-0"
                        checked={selected}
                        onChange={() => toggleModule(mod.id)}
                        aria-label={mod.name}
                      />
                      <span className="min-w-0 flex-1 break-words leading-snug">{mod.name}</span>
                    </label>
                  )
                })
              )}
            </div>
          </fieldset>
        </div>

        <div className="shrink-0 border-t border-defaultborder/60 bg-white px-4 py-3 dark:bg-bodybg sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p
              className="min-w-0 text-sm font-medium text-defaulttextcolor dark:text-white"
              role="status"
            >
              {footerStatus}
            </p>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <button type="button" className="ti-btn ti-btn-light !mb-0" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className={`ti-btn !mb-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                  action === "remove" ? "ti-btn-danger" : "ti-btn-primary-full"
                }`}
                disabled={!canConfirm}
                aria-disabled={!canConfirm}
                title={!canConfirm ? footerStatus : undefined}
                onClick={() => void handleConfirm()}
              >
                {submitting ? "Working…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
