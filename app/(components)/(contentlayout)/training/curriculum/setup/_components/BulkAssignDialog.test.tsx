import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { PositionRosterItem } from "@/shared/lib/api/positions"
import BulkAssignDialog from "./BulkAssignDialog"

const bulkEnroll = vi.fn()

vi.mock("@/shared/lib/api/positions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/api/positions")>()
  return {
    ...actual,
    bulkEnroll: (...args: unknown[]) => bulkEnroll(...args),
  }
})

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) },
}))

const posWith8Employees = {
  id: "p1",
  name: "Design Engineer",
  employeeCount: 8,
  studentCount: 8,
  assignedModules: [{ id: "m1", name: "Figma Basics" }],
} as PositionRosterItem

const posA = {
  id: "pa",
  name: "Position A",
  employeeCount: 2,
  studentCount: 2,
  assignedModules: [{ id: "m1", name: "Figma Basics" }],
} as PositionRosterItem

const posB = {
  id: "pb",
  name: "Position B",
  employeeCount: 3,
  studentCount: 3,
  assignedModules: [{ id: "m1", name: "Figma Basics" }],
} as PositionRosterItem

describe("BulkAssignDialog", () => {
  beforeEach(() => {
    bulkEnroll.mockReset().mockResolvedValue({ enrolled: 1, skipped: 0, modules: ["m1"] })
  })

  afterEach(() => {
    cleanup()
  })

  it("states the exact write before enabling confirm", async () => {
    const user = userEvent.setup()
    render(
      <BulkAssignDialog open positions={[posWith8Employees]} onClose={vi.fn()} onDone={vi.fn()} />
    )
    await user.click(screen.getByLabelText(/design engineer/i))
    await user.click(screen.getByLabelText(/figma basics/i))
    expect(screen.getByText(/8 employees into 1 course/i)).toBeInTheDocument()
  })

  it("issues one request per position, not per employee", async () => {
    const user = userEvent.setup()
    render(<BulkAssignDialog open positions={[posA, posB]} onClose={vi.fn()} onDone={vi.fn()} />)
    await user.click(screen.getByLabelText(/select all positions/i))
    await user.click(screen.getByLabelText(/figma basics/i))
    await user.click(screen.getByRole("button", { name: /enrol/i }))
    await waitFor(() => expect(bulkEnroll).toHaveBeenCalledTimes(2))
  })
})
