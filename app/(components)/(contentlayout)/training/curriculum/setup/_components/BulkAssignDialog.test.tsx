import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { PositionRosterItem } from "@/shared/lib/api/positions"
import Swal from "sweetalert2"
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
    vi.mocked(Swal.fire).mockReset().mockResolvedValue({ isConfirmed: true } as never)
  })

  afterEach(() => {
    cleanup()
  })

  it("exposes dialog role and a full-viewport backdrop", () => {
    render(
      <BulkAssignDialog open positions={[posWith8Employees]} onClose={vi.fn()} onDone={vi.fn()} />
    )
    const dialog = screen.getByRole("dialog", { name: /bulk assign/i })
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(screen.getByTestId("bulk-assign-backdrop")).toBeInTheDocument()
  })

  it("disables Assign courses when nothing is selected and explains why", () => {
    render(
      <BulkAssignDialog open positions={[posWith8Employees]} onClose={vi.fn()} onDone={vi.fn()} />
    )
    expect(screen.getByRole("button", { name: /^assign courses$/i })).toBeDisabled()
    expect(screen.getByRole("status")).toHaveTextContent(/select at least one position and one course/i)
    expect(screen.getByRole("status").textContent).not.toMatch(/—/)
  })

  it("shows selected counts in panels and footer before enabling confirm", async () => {
    const user = userEvent.setup()
    render(
      <BulkAssignDialog open positions={[posWith8Employees]} onClose={vi.fn()} onDone={vi.fn()} />
    )
    expect(screen.getAllByText("0 selected")).toHaveLength(2)
    await user.click(screen.getByLabelText(/design engineer/i))
    await user.click(screen.getByLabelText(/figma basics/i))
    expect(screen.getAllByText("1 selected")).toHaveLength(2)
    expect(screen.getByRole("status")).toHaveTextContent(/1 position · 1 course selected/i)
    expect(screen.getByRole("status").textContent).not.toMatch(/enrolment|assignment/i)
    expect(screen.getByRole("button", { name: /^assign courses$/i })).toBeEnabled()
  })

  it("issues one request per position, not per employee", async () => {
    const user = userEvent.setup()
    render(<BulkAssignDialog open positions={[posA, posB]} onClose={vi.fn()} onDone={vi.fn()} />)
    await user.click(screen.getByLabelText(/select all positions/i))
    await user.click(screen.getByLabelText(/figma basics/i))
    await user.click(screen.getByRole("button", { name: /^assign courses$/i }))
    await waitFor(() => expect(bulkEnroll).toHaveBeenCalledTimes(2))
    expect(Swal.fire).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "Remove courses?" })
    )
  })

  it("confirms with Swal before remove API calls", async () => {
    const user = userEvent.setup()
    render(
      <BulkAssignDialog open positions={[posWith8Employees]} onClose={vi.fn()} onDone={vi.fn()} />
    )
    await user.click(screen.getByRole("button", { name: /^remove$/i }))
    await user.click(screen.getByLabelText(/design engineer/i))
    await user.click(screen.getByLabelText(/figma basics/i))
    await user.click(screen.getByRole("button", { name: /^remove courses$/i }))
    await waitFor(() =>
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Remove courses?",
          confirmButtonText: "Remove courses",
        })
      )
    )
    await waitFor(() => expect(bulkEnroll).toHaveBeenCalledTimes(1))
    expect(bulkEnroll).toHaveBeenCalledWith("p1", {
      moduleIds: ["m1"],
      action: "remove",
    })
  })

  it("select-all applies to the filtered position set", async () => {
    const user = userEvent.setup()
    render(<BulkAssignDialog open positions={[posA, posB]} onClose={vi.fn()} onDone={vi.fn()} />)
    await user.type(screen.getByLabelText(/^search positions/i), "Position A")
    expect(screen.getByText(/select all 1 shown/i)).toBeInTheDocument()
    await user.click(screen.getByLabelText(/select all filtered positions/i))
    expect(screen.getByLabelText(/position a/i)).toBeChecked()
    expect(screen.queryByLabelText(/position b/i)).not.toBeInTheDocument()
  })

  it("shows empty search copy for positions and courses", async () => {
    const user = userEvent.setup()
    render(
      <BulkAssignDialog open positions={[posWith8Employees]} onClose={vi.fn()} onDone={vi.fn()} />
    )
    await user.type(screen.getByLabelText(/^search positions/i), "zzzz-no-match")
    expect(screen.getByText(/no positions found/i)).toBeInTheDocument()
    expect(screen.getByText(/try a different search term/i)).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/^search positions/i))
    await user.type(screen.getByLabelText(/^search courses/i), "zzzz-no-match")
    expect(screen.getByText(/no courses found/i)).toBeInTheDocument()
  })
})
