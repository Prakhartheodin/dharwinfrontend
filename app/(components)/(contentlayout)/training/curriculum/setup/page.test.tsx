import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import TrainingCurriculumSetupPage from "./page"

const searchParamsState = { tab: "" as string }

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/training/curriculum/setup",
  useSearchParams: () => new URLSearchParams(searchParamsState.tab ? `tab=${searchParamsState.tab}` : ""),
}))

vi.mock("@/shared/layout-components/seo/seo", () => ({
  default: () => null,
}))

vi.mock("./_components/CurriculumSetupTable", () => ({
  default: ({ initialDrawerOpen }: { initialDrawerOpen?: boolean }) => (
    <div>
      <span>Curriculum setup table</span>
      {initialDrawerOpen ? (
        <div role="dialog" aria-label="Folders">
          Folders open
        </div>
      ) : null}
    </div>
  ),
}))

describe("TrainingCurriculumSetupPage", () => {
  beforeEach(() => {
    searchParamsState.tab = ""
  })

  afterEach(() => {
    cleanup()
  })

  it("opens the folders drawer for the legacy categories link", async () => {
    searchParamsState.tab = "categories"
    render(<TrainingCurriculumSetupPage />)
    expect(await screen.findByRole("dialog", { name: /folders/i })).toBeInTheDocument()
  })

  it("opens plain for the legacy positions link", () => {
    searchParamsState.tab = "positions"
    render(<TrainingCurriculumSetupPage />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders no tab bar", async () => {
    searchParamsState.tab = ""
    render(<TrainingCurriculumSetupPage />)
    await waitFor(() => expect(screen.getByText(/curriculum setup table/i)).toBeInTheDocument())
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
  })
})
