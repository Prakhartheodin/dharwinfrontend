"use client"

import Link from "next/link"
import React, { useState } from "react"
import Swal from "sweetalert2"
import { AxiosError } from "axios"
import type { Mentor } from "@/shared/lib/api/mentors"
import type { PositionRosterItem } from "@/shared/lib/api/positions"
import * as positionsApi from "@/shared/lib/api/positions"
import type { TrainingModule } from "@/shared/lib/api/training-modules"
import FolderPositionsPopover from "@/app/(components)/(contentlayout)/training/curriculum/modules/_components/FolderPositionsPopover"
import PositionAssignPanel from "./PositionAssignPanel"

export interface PositionFolderChip {
  id: string
  name: string
  modules: TrainingModule[]
}

export interface PositionRowProps {
  position: PositionRosterItem
  serial: number
  expanded: boolean
  onToggle: () => void
  onPositionsChanged: () => void
  canManage: boolean
  canAssign: boolean
  mentors: Mentor[]
  folders: PositionFolderChip[]
  onManageModules?: (position: PositionRosterItem) => void
}

function positionIdOf(pos: PositionRosterItem): string {
  return pos.id || (pos as { _id?: string })._id || ""
}

function isUnlinkedPosition(pos: PositionRosterItem): boolean {
  return Boolean(pos.unlinked) || positionIdOf(pos).startsWith("unlinked:")
}

export default function PositionRow({
  position,
  serial,
  expanded,
  onToggle,
  onPositionsChanged,
  canManage,
  canAssign,
  mentors,
  folders,
  onManageModules,
}: PositionRowProps) {
  const id = positionIdOf(position)
  const panelId = `position-assign-panel-${id || serial}`
  const unlinked = isUnlinkedPosition(position)
  const employeeCount = position.employeeCount ?? 0
  const studentCount = position.studentCount ?? 0
  const showTrainableGap = studentCount < employeeCount
  const [folderAnchor, setFolderAnchor] = useState<{
    chip: PositionFolderChip
    el: HTMLElement
  } | null>(null)
  const [autoEnroll, setAutoEnroll] = useState(Boolean(position.autoEnrollNewHires))
  const [togglingAuto, setTogglingAuto] = useState(false)

  const handleAutoEnrollToggle = async () => {
    if (!canManage || unlinked || togglingAuto) return
    const next = !autoEnroll
    setTogglingAuto(true)
    try {
      await positionsApi.updatePosition(id, { autoEnrollNewHires: next })
      setAutoEnroll(next)
      onPositionsChanged()
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to update auto-enrol."
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: msg,
        toast: true,
        position: "top-end",
        timer: 4000,
        showConfirmButton: false,
      })
    } finally {
      setTogglingAuto(false)
    }
  }

  return (
    <>
      <tr className="border-b border-gray-300 dark:border-gray-600 align-top">
        <td className="text-center !w-[3rem] tabular-nums text-defaulttextcolor/70">{serial}</td>
        <td className="!min-w-[14rem]">
          <div className="flex flex-col gap-1.5 min-w-0">
            <button
              type="button"
              className="inline-flex items-start gap-1.5 text-start rounded-md border-0 bg-transparent p-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={onToggle}
            >
              <i
                className={`ri-arrow-down-s-line mt-0.5 shrink-0 text-base text-defaulttextcolor/50 transition-transform ${
                  expanded ? "rotate-0" : "-rotate-90"
                }`}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="font-medium text-defaulttextcolor dark:text-white break-words leading-snug">
                  {position.name}
                </span>
                {position.department ? (
                  <span className="mt-0.5 block text-[0.7rem] text-defaulttextcolor/55">
                    {position.department}
                  </span>
                ) : null}
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-1.5 ps-5">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.7rem] font-medium text-primary">
                {employeeCount}
              </span>
              {showTrainableGap ? (
                <span
                  className="inline-flex items-center rounded-full border border-defaultborder/60 bg-white/10 px-2 py-0.5 text-[0.65rem] font-medium text-defaulttextcolor/55"
                  title="Only employees with a training profile can be enrolled"
                >
                  {employeeCount} · {studentCount} trainable
                </span>
              ) : null}
              {unlinked ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200">
                  <i className="ri-lock-line text-[0.7rem]" aria-hidden />
                  Not in catalog
                </span>
              ) : null}
            </div>
          </div>
        </td>

        <td className="!min-w-[8rem]">
          {folders.length === 0 ? (
            <span className="text-defaulttextcolor/50">—</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[0.7rem] font-medium text-sky-800 dark:text-sky-200"
                  aria-haspopup="dialog"
                  aria-expanded={folderAnchor?.chip.id === folder.id}
                  onClick={(e) => setFolderAnchor({ chip: folder, el: e.currentTarget })}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </td>

        <td className="!min-w-[10rem]">
          {(position.assignedModules ?? []).length === 0 ? (
            <span className="text-defaulttextcolor/50">—</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(position.assignedModules ?? []).map((mod) => (
                <span
                  key={mod.id}
                  className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[0.7rem] font-medium text-violet-700 dark:text-violet-300"
                >
                  {mod.name}
                </span>
              ))}
            </div>
          )}
        </td>

        <td className="!min-w-[10rem]">
          {(position.assignedEmployees ?? []).length === 0 ? (
            <span className="text-defaulttextcolor/50">—</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(position.assignedEmployees ?? []).map((employee) => (
                <Link
                  key={employee.id}
                  href={`/ats/employees/edit/?id=${encodeURIComponent(employee.id)}`}
                  className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.7rem] font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/15"
                >
                  {employee.name}
                </Link>
              ))}
            </div>
          )}
        </td>

        <td className="!min-w-[7rem]">
          {canManage && !unlinked ? (
            <button
              type="button"
              role="switch"
              aria-checked={autoEnroll}
              aria-label="Auto-enrol new hires"
              disabled={togglingAuto}
              onClick={() => void handleAutoEnrollToggle()}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${
                autoEnroll
                  ? "border-success/40 bg-success/15 text-success"
                  : "border-defaultborder/70 bg-white/10 text-defaulttextcolor/60"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${autoEnroll ? "bg-success" : "bg-defaulttextcolor/40"}`}
                aria-hidden
              />
              {autoEnroll ? "Auto-enrol on" : "Auto-enrol off"}
            </button>
          ) : null}
        </td>

        <td className="text-center !min-w-[5rem]">
          {!unlinked && canManage && onManageModules ? (
            <button
              type="button"
              className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] !mb-0"
              onClick={() => onManageModules(position)}
            >
              Manage
            </button>
          ) : unlinked ? (
            <i className="ri-lock-line text-defaulttextcolor/40" aria-hidden title="Not in catalog" />
          ) : null}
        </td>
      </tr>

      {expanded && canAssign && !unlinked ? (
        <tr className="border-b border-gray-300 dark:border-gray-600 bg-defaultbackground/40">
          <td colSpan={7} className="p-3" id={panelId}>
            <PositionAssignPanel
              position={position}
              mentors={mentors}
              onAssigned={onPositionsChanged}
            />
          </td>
        </tr>
      ) : null}

      {folderAnchor ? (
        <FolderPositionsPopover
          folderName={folderAnchor.chip.name}
          modules={folderAnchor.chip.modules}
          anchor={folderAnchor.el}
          onClose={() => setFolderAnchor(null)}
          onSaved={() => {
            setFolderAnchor(null)
            onPositionsChanged()
          }}
        />
      ) : null}
    </>
  )
}
