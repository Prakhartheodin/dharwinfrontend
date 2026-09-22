import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { PositionRosterItem } from "@/shared/lib/api/positions"
import PositionRow from "./PositionRow"

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock(
  "@/app/(components)/(contentlayout)/training/curriculum/modules/_components/FolderPositionsPopover",
  () => ({ default: () => null })
)

vi.mock("./PositionAssignPanel", () => ({
  default: () => (
    <div>
      <label htmlFor="mock-module">Module</label>
      <select id="mock-module" aria-label="Module">
        <option value="">Select</option>
      </select>
    </div>
  ),
}))

vi.mock("@/shared/lib/api/positions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/api/positions")>()
  return {
    ...actual,
    updatePosition: vi.fn().mockResolvedValue({}),
  }
})

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) },
}))

import * as positionsApi from "@/shared/lib/api/positions"

const basePosition = {
  id: "p1",
  name: "Design Engineer",
  department: "Product",
  employeeCount: 8,
  studentCount: 8,
  autoEnrollNewHires: false,
  assignedModules: [{ id: "m1", name: "Figma Basics" }],
  assignedEmployees: [{ id: "e1", name: "Asha Rao" }],
} as PositionRosterItem

const noop = {
  serial: 1,
  onToggle: vi.fn(),
  onPositionsChanged: vi.fn(),
  canManage: true,
  canAssign: true,
  mentors: [],
  folders: [],
  onManageModules: vi.fn(),
}

function renderRow(ui: React.ReactElement) {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>
  )
}

describe("PositionRow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders no selects while collapsed", () => {
    renderRow(<PositionRow position={basePosition} expanded={false} {...noop} />)
    expect(screen.queryByLabelText("Module")).not.toBeInTheDocument()
  })

  it("flips aria-expanded on toggle", async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderRow(
      <PositionRow position={basePosition} expanded={false} {...noop} onToggle={onToggle} />
    )
    const button = screen.getByRole("button", { name: /design engineer/i })
    expect(button).toHaveAttribute("aria-expanded", "false")
    await user.click(button)
    expect(onToggle).toHaveBeenCalled()
  })

  it("locks an unlinked position instead of offering Manage", () => {
    renderRow(
      <PositionRow
        position={{ ...basePosition, unlinked: true }}
        expanded={false}
        {...noop}
      />
    )
    expect(screen.queryByRole("button", { name: /manage/i })).not.toBeInTheDocument()
    expect(screen.getByText(/not in catalog/i)).toBeInTheDocument()
  })

  it("hides the auto-enrol toggle without the edit permission", () => {
    renderRow(
      <PositionRow position={basePosition} expanded={false} {...noop} canManage={false} />
    )
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })

  it("renders both employee and trainable counts when they differ", () => {
    renderRow(
      <PositionRow
        position={{ ...basePosition, employeeCount: 8, studentCount: 3 }}
        expanded={false}
        {...noop}
      />
    )
    expect(screen.getByText("8")).toBeInTheDocument()
    expect(screen.getByText(/3 of 8 trainable/i)).toBeInTheDocument()
  })

  it("renders only one badge when employee and student counts match", () => {
    renderRow(
      <PositionRow
        position={{ ...basePosition, employeeCount: 8, studentCount: 8 }}
        expanded={false}
        {...noop}
      />
    )
    expect(screen.getByText("8")).toBeInTheDocument()
    expect(screen.queryByText(/trainable/i)).not.toBeInTheDocument()
  })

  it("toggles auto-enrol optimistically and skips onPositionsChanged", async () => {
    const user = userEvent.setup()
    const onPositionsChanged = vi.fn()
    const onAutoEnrollChange = vi.fn()
    vi.mocked(positionsApi.updatePosition).mockResolvedValue({} as never)

    renderRow(
      <PositionRow
        position={basePosition}
        expanded={false}
        {...noop}
        onPositionsChanged={onPositionsChanged}
        onAutoEnrollChange={onAutoEnrollChange}
      />
    )

    const toggle = screen.getByRole("switch", { name: /auto-enrol new hires/i })
    expect(toggle).toHaveTextContent(/auto-enrol off/i)
    await user.click(toggle)

    expect(toggle).toHaveTextContent(/auto-enrol on/i)
    expect(positionsApi.updatePosition).toHaveBeenCalledTimes(1)
    expect(positionsApi.updatePosition).toHaveBeenCalledWith("p1", { autoEnrollNewHires: true })
    expect(onAutoEnrollChange).toHaveBeenCalledWith("p1", true)
    expect(onPositionsChanged).not.toHaveBeenCalled()
  })

  it("reverts auto-enrol when updatePosition fails", async () => {
    const user = userEvent.setup()
    vi.mocked(positionsApi.updatePosition).mockRejectedValueOnce(new Error("nope"))

    renderRow(<PositionRow position={basePosition} expanded={false} {...noop} />)

    const toggle = screen.getByRole("switch", { name: /auto-enrol new hires/i })
    await user.click(toggle)

    await waitFor(() => {
      expect(toggle).toHaveTextContent(/auto-enrol off/i)
    })
  })
})
