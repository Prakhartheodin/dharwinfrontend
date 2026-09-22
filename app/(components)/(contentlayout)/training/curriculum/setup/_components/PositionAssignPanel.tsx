"use client"

import React, { useCallback, useEffect, useState } from "react"
import Swal from "sweetalert2"
import { AxiosError } from "axios"
import type { Mentor } from "@/shared/lib/api/mentors"
import type { Student } from "@/shared/lib/api/students"
import type { PositionRosterItem } from "@/shared/lib/api/positions"
import * as trainingModulesApi from "@/shared/lib/api/training-modules"
import type { TrainingModule } from "@/shared/lib/api/training-modules"

type AssignmentAction = "" | "assign" | "remove"

export interface PositionAssignPanelProps {
  position: PositionRosterItem
  mentors: Mentor[]
  onAssigned: () => void
}

function studentLabel(student: Student): string {
  return student.user?.name || student.user?.email || "Unknown"
}

function isStudentAssignedToModule(mod: TrainingModule | undefined, studentId: string): boolean {
  if (!mod || !studentId) return false
  return (mod.students ?? []).some(
    (s) => String(s.id ?? (s as { _id?: string })._id) === studentId
  )
}

/** Beat global `select { dark:bg-bodybg !important }` — need !important + light color-scheme. */
const SELECT_CLASS =
  "form-control form-select !py-1 !text-[0.8125rem] !bg-white !text-defaulttextcolor dark:!bg-white dark:!text-defaulttextcolor"
const SELECT_STYLE: React.CSSProperties = { colorScheme: "light" }

export default function PositionAssignPanel({
  position,
  mentors,
  onAssigned,
}: PositionAssignPanelProps) {
  const positionId = position.id || (position as { _id?: string })._id || ""
  const assignedModules = position.assignedModules ?? []

  const [moduleId, setModuleId] = useState("")
  const [studentId, setStudentId] = useState("")
  const [mentorId, setMentorId] = useState("")
  const [action, setAction] = useState<AssignmentAction>("")
  const [employees, setEmployees] = useState<Student[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [selectedModule, setSelectedModule] = useState<TrainingModule | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  const hasPositions = (selectedModule?.positions?.length ?? 0) > 0

  const loadModuleContext = useCallback(async (id: string) => {
    if (!id) {
      setEmployees([])
      setSelectedModule(undefined)
      return
    }
    setEmployeesLoading(true)
    try {
      const [empRes, mod] = await Promise.all([
        trainingModulesApi.listModuleEmployees(id, { limit: 500, page: 1 }),
        trainingModulesApi.getTrainingModule(id),
      ])
      setEmployees(empRes.results ?? [])
      setSelectedModule(mod)
    } catch {
      setEmployees([])
      setSelectedModule(undefined)
    } finally {
      setEmployeesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadModuleContext(moduleId)
  }, [moduleId, loadModuleContext])

  const handleSubmit = async () => {
    if (!moduleId) {
      await Swal.fire({
        icon: "warning",
        title: "Select a module",
        text: "Choose a module before updating.",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      })
      return
    }
    if (!studentId) {
      await Swal.fire({
        icon: "warning",
        title: "Select an employee",
        text: "Choose an employee before updating.",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      })
      return
    }
    if (!action) {
      await Swal.fire({
        icon: "warning",
        title: "Select an action",
        text: "Choose Assign or Remove before updating.",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      })
      return
    }

    const alreadyAssigned = isStudentAssignedToModule(selectedModule, studentId)
    if (action === "assign" && alreadyAssigned) {
      await Swal.fire({
        icon: "info",
        title: "Already assigned",
        text: "This employee is already on the module. Choose Remove to unassign them.",
        toast: true,
        position: "top-end",
        timer: 3500,
        showConfirmButton: false,
      })
      return
    }
    if (action === "remove" && !alreadyAssigned) {
      await Swal.fire({
        icon: "info",
        title: "Not assigned",
        text: "This employee is not on the module. Choose Assign to add them.",
        toast: true,
        position: "top-end",
        timer: 3500,
        showConfirmButton: false,
      })
      return
    }

    const selectedStudent = employees.find((s) => s.id === studentId)
    const enrollPositionId =
      selectedStudent?.position?.id?.trim() ||
      selectedStudent?.position?._id?.trim() ||
      selectedModule?.positions?.[0]?.id?.trim() ||
      positionId.trim()
    if (!enrollPositionId) {
      await Swal.fire({
        icon: "warning",
        title: "Position required",
        text: "This employee has no position and the module has none mapped. Map a position before assigning.",
        toast: true,
        position: "top-end",
        timer: 4000,
        showConfirmButton: false,
      })
      return
    }

    setSaving(true)
    try {
      if (action === "assign") {
        await trainingModulesApi.addStudentToTrainingModule(moduleId, studentId, {
          positionId: enrollPositionId,
        })
        if (mentorId) {
          await trainingModulesApi.addMentorToTrainingModule(moduleId, mentorId)
        }
      } else {
        await trainingModulesApi.removeStudentFromTrainingModule(moduleId, studentId, {
          positionId: enrollPositionId,
        })
      }
      await loadModuleContext(moduleId)
      await Swal.fire({
        icon: "success",
        title: action === "assign" ? "Module assigned" : "Assignment removed",
        toast: true,
        position: "top-end",
        timer: 2500,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      setStudentId("")
      setMentorId("")
      setAction("")
      onAssigned()
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to save assignment."
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
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="flex flex-col gap-1 min-w-0">
        <label htmlFor={`assign-module-${positionId}`} className="text-xs font-medium text-defaulttextcolor/70">
          Module
        </label>
        <select
          id={`assign-module-${positionId}`}
          className={SELECT_CLASS}
          style={SELECT_STYLE}
          value={moduleId}
          disabled={saving}
          onChange={(e) => {
            setModuleId(e.target.value)
            setStudentId("")
            setAction("")
          }}
        >
          <option value="">{assignedModules.length ? "Select module" : "No modules"}</option>
          {assignedModules.map((mod) => (
            <option key={mod.id} value={mod.id}>
              {mod.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <label htmlFor={`assign-employee-${positionId}`} className="text-xs font-medium text-defaulttextcolor/70">
          Employee
        </label>
        <select
          id={`assign-employee-${positionId}`}
          className={SELECT_CLASS}
          style={SELECT_STYLE}
          value={studentId}
          disabled={saving || employeesLoading || !moduleId || !hasPositions}
          onChange={(e) => {
            const nextStudentId = e.target.value
            const assigned = isStudentAssignedToModule(selectedModule, nextStudentId)
            setStudentId(nextStudentId)
            setAction(nextStudentId ? (assigned ? "remove" : "assign") : "")
          }}
        >
          <option value="">
            {employeesLoading
              ? "Loading employees..."
              : !moduleId
                ? "Select module first"
                : !hasPositions
                  ? "No positions mapped to module"
                  : employees.length
                    ? "Select employee"
                    : "No employees"}
          </option>
          {employees.map((student) => {
            const assigned = isStudentAssignedToModule(selectedModule, student.id)
            return (
              <option key={student.id} value={student.id}>
                {studentLabel(student)}
                {assigned ? " (assigned)" : ""}
              </option>
            )
          })}
        </select>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <label htmlFor={`assign-mentor-${positionId}`} className="text-xs font-medium text-defaulttextcolor/70">
          Select Mentor
        </label>
        <select
          id={`assign-mentor-${positionId}`}
          className={SELECT_CLASS}
          style={SELECT_STYLE}
          value={mentorId}
          disabled={saving || action === "remove"}
          onChange={(e) => setMentorId(e.target.value)}
        >
          <option value="">Optional</option>
          {mentors.map((mentor) => (
            <option key={mentor.id} value={mentor.id}>
              {mentor.user?.name || mentor.user?.email}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <label htmlFor={`assign-action-${positionId}`} className="text-xs font-medium text-defaulttextcolor/70">
          Action
        </label>
        <select
          id={`assign-action-${positionId}`}
          className={SELECT_CLASS}
          style={SELECT_STYLE}
          value={action}
          disabled={saving}
          onChange={(e) => setAction(e.target.value as AssignmentAction)}
        >
          <option value="">Select action</option>
          <option value="assign">Assign</option>
          <option value="remove">Remove</option>
        </select>
      </div>

      <div className="flex items-end">
        <button
          type="button"
          className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem] !mb-0"
          disabled={saving}
          onClick={() => void handleSubmit()}
        >
          {saving ? "Saving..." : "Update"}
        </button>
      </div>
    </div>
  )
}
