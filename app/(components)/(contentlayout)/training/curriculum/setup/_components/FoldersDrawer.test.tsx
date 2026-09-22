import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Category } from "@/shared/lib/api/categories"
import FoldersDrawer from "./FoldersDrawer"

const createCategory = vi.fn()
const deleteCategory = vi.fn()
const updateCategory = vi.fn()

vi.mock("@/shared/lib/api/categories", () => ({
  createCategory: (...args: unknown[]) => createCategory(...args),
  deleteCategory: (...args: unknown[]) => deleteCategory(...args),
  updateCategory: (...args: unknown[]) => updateCategory(...args),
}))

vi.mock("@/shared/contexts/auth-context", () => ({
  useAuth: () => ({ user: { id: "u1" }, permissions: [] }),
}))

vi.mock("@/shared/lib/permissions", () => ({
  hasPermission: () => true,
}))

vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}))

const catA = {
  id: "a",
  name: "Category A",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  moduleCount: 0,
} as Category

const catB = {
  id: "b",
  name: "Category B",
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  moduleCount: 1,
} as Category

describe("FoldersDrawer", () => {
  beforeEach(() => {
    createCategory.mockReset().mockResolvedValue(catA)
    deleteCategory.mockReset().mockResolvedValue(undefined)
    updateCategory.mockReset().mockResolvedValue(catA)
  })

  afterEach(() => {
    cleanup()
  })

  it("creates a category and refreshes", async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()
    render(<FoldersDrawer open categories={[]} onChanged={onChanged} onClose={vi.fn()} />)
    await user.click(screen.getByRole("button", { name: /^create$/i }))
    await user.type(screen.getByLabelText(/category name/i), "Onboarding")
    const createButtons = screen.getAllByRole("button", { name: /^create$/i })
    await user.click(createButtons[createButtons.length - 1]!)
    await waitFor(() => expect(createCategory).toHaveBeenCalledWith({ name: "Onboarding" }))
    expect(onChanged).toHaveBeenCalled()
  })

  it("reports the split when a bulk delete partly fails", async () => {
    const user = userEvent.setup()
    deleteCategory.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("linked"))
    render(<FoldersDrawer open categories={[catA, catB]} onChanged={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByLabelText(/select all/i))
    await user.click(screen.getByRole("button", { name: /delete selected/i }))
    expect(await screen.findByText(/1 deleted, 1 could not be deleted/i)).toBeInTheDocument()
  })

  it("goes indeterminate on a partial selection", async () => {
    const user = userEvent.setup()
    render(<FoldersDrawer open categories={[catA, catB]} onChanged={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByLabelText(/select category a/i))
    expect((screen.getByLabelText(/select all/i) as HTMLInputElement).indeterminate).toBe(true)
  })

  it("Escape dismisses the name dialog without closing the drawer", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<FoldersDrawer open categories={[]} onChanged={vi.fn()} onClose={onClose} />)
    await user.click(screen.getByRole("button", { name: /^create$/i }))
    await user.type(screen.getByLabelText(/category name/i), "Onboarding")
    await user.keyboard("{Escape}")
    expect(screen.queryByLabelText(/category name/i)).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<FoldersDrawer open categories={[]} onChanged={vi.fn()} onClose={onClose} />)
    await user.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalled()
  })
})
