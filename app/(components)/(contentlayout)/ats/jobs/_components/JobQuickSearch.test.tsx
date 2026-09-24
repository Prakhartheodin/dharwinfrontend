import React from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import JobQuickSearch, { type JobQuickSearchProps } from "./JobQuickSearch"

vi.mock("@/shared/lib/api/jobs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/api/jobs")>()
  return {
    ...actual,
    searchJobFacet: vi.fn(),
  }
})

import { searchJobFacet } from "@/shared/lib/api/jobs"

const mockedSearchJobFacet = vi.mocked(searchJobFacet)

/** Controlled wrapper mirroring how page.tsx drives JobQuickSearch (value/onChange state). */
function ControlledQuickSearch(props: Partial<JobQuickSearchProps> & { onChangeSpy?: (v: string) => void }) {
  const [value, setValue] = React.useState(props.value ?? "")
  return (
    <JobQuickSearch
      value={value}
      onChange={(next) => {
        props.onChangeSpy?.(next)
        setValue(next)
      }}
      status="Active"
      jobOrigin=""
      {...props}
    />
  )
}

beforeEach(() => {
  mockedSearchJobFacet.mockReset()
})

afterEach(cleanup)

describe("JobQuickSearch", () => {
  it("shows inline ghost completion and accepts it on Tab", async () => {
    mockedSearchJobFacet.mockImplementation(async (facet: string) =>
      facet === "title" ? ["Senior Software Engineer"] : []
    )
    const onChangeSpy = vi.fn()
    const user = userEvent.setup()
    render(<ControlledQuickSearch onChangeSpy={onChangeSpy} />)

    const input = screen.getByRole("combobox", { name: "Search jobs" })
    await user.click(input)
    await user.type(input, "senior soft")

    // Ghost text is the remainder of the top title suggestion, in its own casing.
    await waitFor(() => expect(screen.getByTestId("job-quick-search-ghost")).toHaveTextContent("ware Engineer"))

    await user.tab()

    expect(onChangeSpy).toHaveBeenLastCalledWith("senior software Engineer")
  })

  it("highlights the first option with ArrowDown and selects it with Enter", async () => {
    mockedSearchJobFacet.mockImplementation(async (facet: string) =>
      facet === "title" ? ["Product Manager", "Product Designer"] : []
    )
    const onChangeSpy = vi.fn()
    const user = userEvent.setup()
    render(<ControlledQuickSearch onChangeSpy={onChangeSpy} />)

    const input = screen.getByRole("combobox", { name: "Search jobs" })
    await user.click(input)
    await user.type(input, "prod")

    await waitFor(() => expect(screen.getByRole("option", { name: "Product Manager" })).toBeInTheDocument())

    await user.keyboard("{ArrowDown}")
    await user.keyboard("{Enter}")

    expect(onChangeSpy).toHaveBeenLastCalledWith("Product Manager")
  })

  it("closes the suggestion list on the first Escape and clears the input on the second", async () => {
    mockedSearchJobFacet.mockImplementation(async () => [])
    const onChangeSpy = vi.fn()
    const user = userEvent.setup()
    render(<ControlledQuickSearch onChangeSpy={onChangeSpy} />)

    const input = screen.getByRole("combobox", { name: "Search jobs" }) as HTMLInputElement
    await user.click(input)
    await user.type(input, "xyz")
    expect(input).toHaveAttribute("aria-expanded", "true")

    await user.keyboard("{Escape}")
    expect(input).toHaveAttribute("aria-expanded", "false")
    expect(input.value).toBe("xyz")

    await user.keyboard("{Escape}")
    expect(onChangeSpy).toHaveBeenLastCalledWith("")
  })
})
