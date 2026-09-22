"use client"

import React, { useMemo, useState } from "react"
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

function enrolableCount(pos: PositionRosterItem): number {
  return pos.studentCount ?? pos.employeeCount ?? 0
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

  const { containerRef, backdropProps } = useModalBehavior({ isOpen: open, onClose })

  const catalogued = useMemo(
    () => positions.filter((p) => !p.unlinked && !positionIdOf(p).startsWith("unlinked:")),
    [positions]
  )

  const modules = useMemo(() => {
    const map = new Map<string, string>()
    for (const pos of catalogued) {
      for (const mod of pos.assignedModules ?? []) {
        if (!map.has(mod.id)) map.set(mod.id, mod.name)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [catalogued])

  const selectedPositions = catalogued.filter((p) => selectedPositionIds.has(positionIdOf(p)))
  const employeeTotal = selectedPositions.reduce((sum, p) => sum + enrolableCount(p), 0)
  const moduleTotal = selectedModuleIds.size
  const enrolmentTotal = employeeTotal * moduleTotal
  const canConfirm = selectedPositionIds.size > 0 && selectedModuleIds.size > 0 && !submitting

  const countSentence =
    action === "assign"
      ? `Enrol ${employeeTotal} employee${employeeTotal === 1 ? "" : "s"} into ${moduleTotal} course${moduleTotal === 1 ? "" : "s"} — ${enrolmentTotal} enrolment${enrolmentTotal === 1 ? "" : "s"}`
      : `Remove ${employeeTotal} employee${employeeTotal === 1 ? "" : "s"} from ${moduleTotal} course${moduleTotal === 1 ? "" : "s"} — ${enrolmentTotal} enrolment${enrolmentTotal === 1 ? "" : "s"}`

  if (!open) return null

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

  const selectAllPositions = (checked: boolean) => {
    setSelectedPositionIds(checked ? new Set(catalogued.map(positionIdOf).filter(Boolean)) : new Set())
  }

  const handleConfirm = async () => {
    if (!canConfirm) return
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
        title: action === "assign" ? "Enrolments saved" : "Enrolments removed",
        text: countSentence,
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      })
      onDone()
      onClose()
      setSelectedPositionIds(new Set())
      setSelectedModuleIds(new Set())
      setAction("assign")
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

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label="Bulk assign">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" {...backdropProps} />
      <div
        ref={containerRef}
        className="absolute left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl dark:bg-bodybg mx-4"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-defaulttextcolor dark:text-white">Bulk assign</h2>
            <p className="text-sm text-defaulttextcolor/60">
              One request per position — the server resolves who to enrol.
            </p>
          </div>
          <button type="button" className="ti-btn ti-btn-icon ti-btn-light !mb-0" aria-label="Close" onClick={onClose}>
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="bulk-action"
              checked={action === "assign"}
              onChange={() => setAction("assign")}
            />
            Assign
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-danger ms-4 rounded-md border border-danger/30 bg-danger/10 px-2 py-1">
            <input
              type="radio"
              name="bulk-action"
              checked={action === "remove"}
              onChange={() => setAction("remove")}
            />
            Remove
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Positions</legend>
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={catalogued.length > 0 && selectedPositionIds.size === catalogued.length}
                onChange={(e) => selectAllPositions(e.target.checked)}
                aria-label="Select all positions"
              />
              Select all positions
            </label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-defaultborder/60 p-2">
              {catalogued.map((pos) => {
                const id = positionIdOf(pos)
                return (
                  <label key={id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedPositionIds.has(id)}
                      onChange={() => togglePosition(id)}
                      aria-label={pos.name}
                    />
                    <span className="min-w-0 truncate">{pos.name}</span>
                    <span className="ms-auto text-[0.7rem] text-defaulttextcolor/50">
                      {enrolableCount(pos)}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Courses</legend>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-defaultborder/60 p-2">
              {modules.length === 0 ? (
                <p className="text-sm text-defaulttextcolor/50">No courses on the selected roster.</p>
              ) : (
                modules.map((mod) => (
                  <label key={mod.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedModuleIds.has(mod.id)}
                      onChange={() => toggleModule(mod.id)}
                      aria-label={mod.name}
                    />
                    <span className="min-w-0 truncate">{mod.name}</span>
                  </label>
                ))
              )}
            </div>
          </fieldset>
        </div>

        <p className="mt-4 text-sm font-medium text-defaulttextcolor dark:text-white" role="status">
          {countSentence}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="ti-btn ti-btn-light" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`ti-btn !mb-0 ${action === "remove" ? "ti-btn-danger" : "ti-btn-primary-full"}`}
            disabled={!canConfirm}
            onClick={() => void handleConfirm()}
          >
            {action === "assign" ? "Enrol" : "Remove enrolments"}
          </button>
        </div>
      </div>
    </div>
  )
}
