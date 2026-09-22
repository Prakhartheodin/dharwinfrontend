import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
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

let mockSearchParams = new URLSearchParams()
const replaceMock = vi.fn((href: string) => {
  const q = href.includes("?") ? href.slice(href.indexOf("?") + 1) : ""
  mockSearchParams = new URLSearchParams(q)
})
const pushMock = vi.fn((href: string) => {
  const q = href.includes("?") ? href.slice(href.indexOf("?") + 1) : ""
  mockSearchParams = new URLSearchParams(q)
})

vi.mock("next/navigation", () => ({
  usePathname: () => "/training/curriculum/setup",
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}))

vi.mock("@/shared/contexts/auth-context", () => ({
  useAuth: () => ({ user: { id: "u1" }, permissions: Array.from(permissionSet) }),
}))

vi.mock("@/shared/lib/permissions", () => ({
  hasPermission: (_auth: unknown, key: string) => permissionSet.has(key),
}))

const updatePosition = vi.fn()

vi.mock("@/shared/lib/api/positions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/api/positions")>()
  return {
    ...actual,
    getPositionRoster: (...args: unknown[]) => getPositionRoster(...args),
    setPositionModules: vi.fn(),
    updatePosition: (...args: unknown[]) => updatePosition(...args),
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

vi.mock("./FoldersDrawer", () => ({
  default: ({
    open,
    onClose,
    onChanged,
  }: {
    open: boolean
    onClose: () => void
    onChanged: () => void
  }) =>
    open ? (
      <div>
        <button type="button" onClick={onClose}>
          Close drawer
        </button>
        <button type="button" onClick={() => onChanged()}>
          Simulate folder list change
        </button>
      </div>
    ) : null,
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const ROSTER_ROWS = [
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
]

function paginated(results: typeof ROSTER_ROWS) {
  return {
    results,
    page: 1,
    limit: 50,
    totalPages: 1,
    totalResults: results.length,
  }
}

describe("CurriculumSetupTable", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams()
    replaceMock.mockClear().mockImplementation((href: string) => {
      const q = href.includes("?") ? href.slice(href.indexOf("?") + 1) : ""
      mockSearchParams = new URLSearchParams(q)
    })
    pushMock.mockClear().mockImplementation((href: string) => {
      const q = href.includes("?") ? href.slice(href.indexOf("?") + 1) : ""
      mockSearchParams = new URLSearchParams(q)
    })
    permissionSet = new Set([
      "view_training_positions",
      "view_training_categories",
      "edit_training_position",
      "edit_training_module",
    ])
    getPositionRoster.mockReset().mockImplementation(async (params?: { search?: string; folderIds?: string }) => {
      let rows = [...ROSTER_ROWS]
      if (params?.search?.trim()) {
        const q = params.search.trim().toLowerCase()
        rows = rows.filter((r) => r.name.toLowerCase().includes(q))
      }
      if (params?.folderIds) {
        const ids = new Set(params.folderIds.split(","))
        const moduleFolder: Record<string, string> = {
          m1: "aaaaaaaaaaaaaaaaaaaaaaaa",
          m2: "bbbbbbbbbbbbbbbbbbbbbbbb",
        }
        rows = rows.filter((r) =>
          (r.assignedModules ?? []).some((m) => ids.has(moduleFolder[m.id] ?? ""))
        )
      }
      return paginated(rows)
    })
    listCategories.mockReset().mockResolvedValue({
      results: [
        { id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Product", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        { id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Engineering", createdAt: "2026-01-02", updatedAt: "2026-01-02" },
      ],
    })
    listTrainingModules.mockReset().mockResolvedValue({
      results: [
        {
          id: "m1",
          moduleName: "Figma Basics",
          categories: [{ id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Product" }],
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
          categories: [{ id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Engineering" }],
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
    updatePosition.mockReset().mockResolvedValue({})
  })

  afterEach(() => {
    cleanup()
  })

  function positionNamesInOrder(): string[] {
    return screen
      .getAllByRole("button")
      .filter((el) => el.hasAttribute("aria-expanded"))
      .map((el) => el.querySelector(".font-medium")?.textContent?.trim() ?? "")
      .filter(Boolean)
  }

  it("loads the first page from the roster API", async () => {
    render(<CurriculumSetupTable />)
    expect(await screen.findByText("Design Engineer")).toBeInTheDocument()
    expect(screen.getByText("Mobile Engineer")).toBeInTheDocument()
    expect(getPositionRoster).toHaveBeenCalled()
    const firstCall = getPositionRoster.mock.calls[0]?.[0] as { page?: number; limit?: number }
    expect(firstCall?.page).toBe(1)
    expect(firstCall?.limit).toBe(50)
  })

  it("writes search to the URL via replace after debounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<CurriculumSetupTable />)
    await screen.findByText("Design Engineer")
    await user.type(screen.getByLabelText(/search positions or folders/i), "design")
    await vi.advanceTimersByTimeAsync(400)
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled()
      const href = String(replaceMock.mock.calls.at(-1)?.[0] ?? "")
      expect(href).toContain("search=design")
      expect(href).not.toMatch(/[?&]page=/)
    })
    vi.useRealTimers()
  })

  it("exposes one search field that also narrows folder chips", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetupTable />)
    await screen.findByText("Design Engineer")

    expect(screen.getAllByLabelText(/search positions or folders/i)).toHaveLength(1)
    expect(screen.queryByLabelText(/^search folders$/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/search folders/i)).not.toBeInTheDocument()

    const filterGroup = screen.getByRole("group", { name: /folders/i })
    expect(within(filterGroup).getByRole("button", { name: /^product$/i })).toBeInTheDocument()
    expect(within(filterGroup).getByRole("button", { name: /^engineering$/i })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/search positions or folders/i), "prod")

    expect(within(filterGroup).getByRole("button", { name: /^product$/i })).toBeInTheDocument()
    expect(within(filterGroup).queryByRole("button", { name: /^engineering$/i })).not.toBeInTheDocument()
  })

  it("pushes folderIds into the URL and resets page when a chip is selected", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetupTable />)
    await screen.findByText("Mobile Engineer")
    const filterGroup = screen.getByRole("group", { name: /folders/i })
    await user.click(within(filterGroup).getByRole("button", { name: /^product$/i }))
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled()
      const href = String(pushMock.mock.calls.at(-1)?.[0] ?? "")
      expect(href).toContain("folderIds=aaaaaaaaaaaaaaaaaaaaaaaa")
    })
  })

  it("shows all rows when no folder is selected", async () => {
    render(<CurriculumSetupTable />)
    expect(await screen.findByText("Design Engineer")).toBeInTheDocument()
    expect(screen.getByText("Mobile Engineer")).toBeInTheDocument()
  })

  it("cycles sort into the URL with sortBy=field:dir,_id:asc", async () => {
    const user = userEvent.setup()
    render(<CurriculumSetupTable />)
    await screen.findByText("Design Engineer")
    await user.click(screen.getByRole("button", { name: /name, not sorted/i }))
    await waitFor(() => {
      const href = String(pushMock.mock.calls.at(-1)?.[0] ?? "")
      expect(href).toContain("sortBy=name%3Aasc%2C_id%3Aasc")
    })
  })

  it("shows a filtered empty state when the API returns zero matches", async () => {
    mockSearchParams = new URLSearchParams("search=zzz")
    getPositionRoster.mockResolvedValue(paginated([]))
    render(<CurriculumSetupTable />)
    expect(await screen.findByText(/no positions match your filters/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument()
  })

  it("shows skeleton on initial load", async () => {
    let resolveRoster: (v: unknown) => void = () => {}
    getPositionRoster.mockReturnValue(
      new Promise((resolve) => {
        resolveRoster = resolve
      })
    )
    render(<CurriculumSetupTable />)
    expect(screen.getByRole("status", { busy: true })).toBeInTheDocument()
    resolveRoster(paginated(ROSTER_ROWS))
    expect(await screen.findByText("Design Engineer")).toBeInTheDocument()
  })

  it("keeps auto-enrol toggle from flipping a full-page loading state", async () => {
    const user = userEvent.setup()
    updatePosition.mockResolvedValue({ id: "p1", autoEnrollNewHires: true })
    render(<CurriculumSetupTable />)
    await screen.findByText("Design Engineer")
    const callsBefore = getPositionRoster.mock.calls.length
    const toggle = screen.getAllByRole("switch")[0]
    await user.click(toggle!)
    await waitFor(() => expect(updatePosition).toHaveBeenCalled())
    expect(getPositionRoster.mock.calls.length).toBe(callsBefore)
    expect(screen.queryByRole("status", { busy: true })).not.toBeInTheDocument()
  })

  it("renders Name / Count sort controls with aria-sort", async () => {
    render(<CurriculumSetupTable />)
    await screen.findByText("Design Engineer")
    expect(screen.getByRole("button", { name: /name, not sorted/i })).toHaveAttribute(
      "aria-sort",
      "none"
    )
    expect(screen.getByRole("button", { name: /count, not sorted/i })).toHaveAttribute(
      "aria-sort",
      "none"
    )
  })

  it("shows Showing X to Y of Z from the API total", async () => {
    render(<CurriculumSetupTable />)
    await screen.findByText("Design Engineer")
    expect(screen.getByText(/Showing 1 to 2 of 2 entries/i)).toBeInTheDocument()
  })

  // Keep a smoke check that position names render in API order.
  it("lists positions in the order returned by the API", async () => {
    render(<CurriculumSetupTable />)
    await screen.findByText("Design Engineer")
    expect(positionNamesInOrder()).toEqual(["Design Engineer", "Mobile Engineer"])
  })
})
