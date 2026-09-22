import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { PositionRosterItem } from "@/shared/lib/api/positions"
import PositionAssignPanel from "./PositionAssignPanel"

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) },
}))

const listModuleEmployees = vi.fn()
const getTrainingModule = vi.fn()
const addStudentToTrainingModule = vi.fn()
const removeStudentFromTrainingModule = vi.fn()
const addMentorToTrainingModule = vi.fn()

vi.mock("@/shared/lib/api/training-modules", () => ({
  listModuleEmployees: (...args: unknown[]) => listModuleEmployees(...args),
  getTrainingModule: (...args: unknown[]) => getTrainingModule(...args),
  addStudentToTrainingModule: (...args: unknown[]) => addStudentToTrainingModule(...args),
  removeStudentFromTrainingModule: (...args: unknown[]) => removeStudentFromTrainingModule(...args),
  addMentorToTrainingModule: (...args: unknown[]) => addMentorToTrainingModule(...args),
}))

const positionWithTwoModules = {
  id: "p1",
  name: "Design Engineer",
  employeeCount: 2,
  assignedModules: [
    { id: "m1", name: "Figma Basics" },
    { id: "m2", name: "Kotlin Intro" },
  ],
  assignedEmployees: [],
} as PositionRosterItem

const positionWithAssignedEmployee = {
  ...positionWithTwoModules,
  assignedEmployees: [{ id: "e1", name: "Asha Rao" }],
} as PositionRosterItem

describe("PositionAssignPanel", () => {
  beforeEach(() => {
    listModuleEmployees.mockReset()
    getTrainingModule.mockReset()
    addStudentToTrainingModule.mockReset()
    removeStudentFromTrainingModule.mockReset()
    addMentorToTrainingModule.mockReset()

    listModuleEmployees.mockResolvedValue({
      results: [
        {
          id: "s1",
          user: { id: "u1", name: "Asha Rao", email: "asha@example.com" },
          position: { id: "p1", name: "Design Engineer" },
        },
      ],
    })
    getTrainingModule.mockResolvedValue({
      id: "m1",
      moduleName: "Figma Basics",
      positions: [{ id: "p1", name: "Design Engineer" }],
      students: [{ id: "s1", user: { id: "u1", name: "Asha Rao", email: "asha@example.com" } }],
      mentorsAssigned: [],
      categories: [],
      playlist: [],
      shortDescription: "",
      status: "published",
      createdAt: "",
      updatedAt: "",
    })
  })

  it("disables the employee select until a module is chosen", () => {
    render(
      <PositionAssignPanel position={positionWithTwoModules} mentors={[]} onAssigned={vi.fn()} />
    )
    expect(screen.getByLabelText("Employee")).toBeDisabled()
  })

  it("preselects the remove action for an already-assigned employee", async () => {
    const user = userEvent.setup()
    render(
      <PositionAssignPanel
        position={positionWithAssignedEmployee}
        mentors={[]}
        onAssigned={vi.fn()}
      />
    )
    await user.selectOptions(screen.getByLabelText("Module"), "m1")
    await waitFor(() => expect(screen.getByLabelText("Employee")).not.toBeDisabled())
    await user.selectOptions(screen.getByLabelText("Employee"), "s1")
    expect(screen.getByLabelText("Action")).toHaveValue("remove")
  })

  it("refuses to submit without an action", async () => {
    const user = userEvent.setup()
    const onAssigned = vi.fn()
    render(
      <PositionAssignPanel position={positionWithTwoModules} mentors={[]} onAssigned={onAssigned} />
    )
    const updateBtn = screen.getAllByRole("button").find((b) => b.textContent === "Update")
    expect(updateBtn).toBeTruthy()
    await user.click(updateBtn!)
    expect(onAssigned).not.toHaveBeenCalled()
    expect(addStudentToTrainingModule).not.toHaveBeenCalled()
  })
})
