import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CurriculumSetupTable from "./CurriculumSetupTable"

const getPositionRoster = vi.fn()
const listCategories = vi.fn()
const listTrainingModules = vi.fn()
const listMentors = vi.fn()

let permissionSet = new Set<string>([
  "view_training_positions",
  "view_training_categories",
  "edit_training_position",
  "edit_training_module",
])

vi.mock("@/shared/contexts/auth-context", () => ({
  useAuth: () => ({ user: { id: "u1" }, permissions: Array.from(permissionSet) }),
}))

vi.mock("@/shared/lib/permissions", () => ({
  hasPermission: (_auth: unknown, key: string) => permissionSet.has(key),
}))

vi.mock("@/shared/lib/api/positions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/api/positions")>()
  return {
    ...actual,
    getPositionRoster: (...args: unknown[]) => getPositionRoster(...args),
    setPositionModules: vi.fn(),
    updatePosition: vi.fn(),
    bulkEnroll: vi.fn(),
  }
})

vi.mock("@/shared/lib/api/categories", () => ({
  listCategories: (...args: unknown[]) => listCategories(...args),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

vi.mock("@/shared/lib/api/training-modules", () => ({
  listTrainingModules: (...args: unknown[]) => listTrainingModules(...args),
  listModuleEmployees: vi.fn().mockResolvedValue({ results: [] }),
  getTrainingModule: vi.fn(),
  addStudentToTrainingModule: vi.fn(),
  removeStudentFromTrainingModule: vi.fn(),
  addMentorToTrainingModule: vi.fn(),
}))

vi.mock("@/shared/lib/api/mentors", () => ({
  listMentors: (...args: unknown[]) => listMentors(...args),
}))

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) },
}))

vi.mock(
  "@/app/(components)/(contentlayout)/training/curriculum/modules/_components/FolderPositionsPopover",
  () => ({ default: () => null })
)

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

describe("CurriculumSetupTable", () => {
  beforeEach(() => {
    permissionSet = new Set([
      "view_training_positions",
      "view_training_categories",
      "edit_training_position",
      "edit_training_module",
    ])
    getPositionRoster.mockReset().mockResolvedValue([
      {
        id: "p1",
        name: "Design Engineer",
        department: "Product",
        employeeCount: 8,
        studentCount: 3,
        assignedModules: [{ id: "m1", name: "Figma Basics" }],
        assignedEmployees: [{ id: "e1", name: "Asha Rao" }],
      },
      {
        id: "p2",
        name: "Mobile Engineer",
        department: "Engineering",
        employeeCount: 2,
        studentCount: 2,
        assignedModules: [{ id: "m2", name: "Kotlin Intro" }],
        assignedEmployees: [],
      },
    ])
    listCategories.mockReset().mockResolvedValue({
      results: [
        { id: "f-product", name: "Product", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        { id: "f-eng", name: "Engineering", createdAt: "2026-01-02", updatedAt: "2026-01-02" },
      ],
    })
    listTrainingModules.mockReset().mockResolvedValue({
      results: [
        {
          id: "m1",
          moduleName: "Figma Basics",
          categories: [{ id: "f-product", name: "Product" }],
          positions: [],
          students: [],
          mentorsAssigned: [],
          playlist: [],
          shortDescription: "",
          status: "published",
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "m2",
          moduleName: "Kotlin Intro",
          categories: [{ id: "f-eng", name: "Engineering" }],
          positions: [],
          students: [],
          mentorsAssigned: [],
          playlist: [],
          shortDescription: "",
          status: "published",
          createdAt: "",
          updatedAt: "",
        },
      ],
    })
    listMentors.mockReset().mockResolvedValue({ results: [] })
  })

  afterEach(() => {
    cleanup()
  })

  it("filters live as the user types", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetupTable />)
    await screen.findByText("Design Engineer")
    await user.type(screen.getByLabelText(/search/i), "design")
    await waitFor(() => {
      expect(screen.getByText("Design Engineer")).toBeInTheDocument()
      expect(screen.queryByText("Mobile Engineer")).not.toBeInTheDocument()
    })
  })

  it("narrows rows when a folder chip is selected", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetupTable />)
    await screen.findByText("Mobile Engineer")
    const productChip = screen
      .getAllByRole("button", { name: /^product$/i })
      .find((btn) => btn.getAttribute("aria-pressed") != null)
    expect(productChip).toBeTruthy()
    await user.click(productChip!)
    await waitFor(() => {
      expect(screen.queryByText("Mobile Engineer")).not.toBeInTheDocument()
      expect(screen.getByText("Design Engineer")).toBeInTheDocument()
    })
  })

  it("keeps the entries line in step with the filtered count", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetupTable />)
    await screen.findByText("Design Engineer")
    await user.type(screen.getByLabelText(/search/i), "design")
    expect(await screen.findByText(/showing 1 to 1 of 1 entries/i)).toBeInTheDocument()
  })

  it("explains itself when the user has no training permissions", async () => {
    permissionSet = new Set()
    render(<CurriculumSetupTable />)
    expect(await screen.findByText(/you do not have access/i)).toBeInTheDocument()
  })
})
