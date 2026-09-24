import React from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import JobQuickSearch, { type JobQuickSearchProps, type JobQuickSearchScope } from "./JobQuickSearch"

vi.mock("@/shared/lib/api/jobs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/api/jobs")>()
  return {
    ...actual,
    searchJobFacet: vi.fn(),
  }
})

import { searchJobFacet } from "@/shared/lib/api/jobs"

const mockedSearchJobFacet = vi.mocked(searchJobFacet)

/** Controlled wrapper mirroring how page.tsx drives JobQuickSearch (value/onChange/preview/commit state). */
function ControlledQuickSearch(
  props: Partial<JobQuickSearchProps> & {
    onChangeSpy?: (v: string) => void
    onPreviewSpy?: (scope: JobQuickSearchScope | null) => void
    onCommitSpy?: (scope: JobQuickSearchScope | null) => void
  }
) {
  const [value, setValue] = React.useState(props.value ?? "")
  const [committedScope, setCommittedScope] = React.useState<JobQuickSearchScope | null>(
    props.committedScope ?? null
  )
  return (
    <JobQuickSearch
      value={value}
      onChange={(next) => {
        props.onChangeSpy?.(next)
        setValue(next)
      }}
      status="Active"
      jobOrigin=""
      onPreview={(scope) => props.onPreviewSpy?.(scope)}
      onCommit={(scope) => {
        props.onCommitSpy?.(scope)
        setCommittedScope(scope)
      }}
      committedScope={committedScope}
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

  it("calls onPreview with the highlighted option's facet and value on ArrowDown", async () => {
    mockedSearchJobFacet.mockImplementation(async (facet: string) =>
      facet === "company" ? ["The odin"] : []
    )
    const onPreviewSpy = vi.fn()
    const user = userEvent.setup()
    render(<ControlledQuickSearch onPreviewSpy={onPreviewSpy} />)

    const input = screen.getByRole("combobox", { name: "Search jobs" })
    await user.click(input)
    await user.type(input, "odin")

    await waitFor(() => expect(screen.getByRole("option", { name: "The odin" })).toBeInTheDocument())

    await user.keyboard("{ArrowDown}")

    await waitFor(() =>
      expect(onPreviewSpy).toHaveBeenLastCalledWith({ facet: "company", value: "The odin" })
    )
  })

  it("calls onPreview(null) on Escape, reverting the preview", async () => {
    mockedSearchJobFacet.mockImplementation(async (facet: string) =>
      facet === "title" ? ["Odin test job2"] : []
    )
    const onPreviewSpy = vi.fn()
    const user = userEvent.setup()
    render(<ControlledQuickSearch onPreviewSpy={onPreviewSpy} />)

    const input = screen.getByRole("combobox", { name: "Search jobs" })
    await user.click(input)
    await user.type(input, "odin")
    await waitFor(() => expect(screen.getByRole("option", { name: "Odin test job2" })).toBeInTheDocument())

    await user.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(onPreviewSpy).toHaveBeenLastCalledWith({ facet: "title", value: "Odin test job2" })
    )

    await user.keyboard("{Escape}")
    await waitFor(() => expect(onPreviewSpy).toHaveBeenLastCalledWith(null))
  })

  it("commits the highlighted option on Tab: fills the search bar and reports the scope", async () => {
    mockedSearchJobFacet.mockImplementation(async (facet: string) =>
      facet === "company" ? ["The odin"] : []
    )
    const onChangeSpy = vi.fn()
    const onCommitSpy = vi.fn()
    const user = userEvent.setup()
    render(<ControlledQuickSearch onChangeSpy={onChangeSpy} onCommitSpy={onCommitSpy} />)

    const input = screen.getByRole("combobox", { name: "Search jobs" })
    await user.click(input)
    await user.type(input, "odin")
    await waitFor(() => expect(screen.getByRole("option", { name: "The odin" })).toBeInTheDocument())

    await user.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "The odin" })).toHaveAttribute("aria-selected", "true")
    )

    await user.tab()

    expect(onChangeSpy).toHaveBeenLastCalledWith("The odin")
    expect(onCommitSpy).toHaveBeenLastCalledWith({ facet: "company", value: "The odin" })
  })

  it("clears the committed scope once the user edits the text afterward", async () => {
    mockedSearchJobFacet.mockImplementation(async (facet: string) =>
      facet === "company" ? ["The odin"] : []
    )
    const onCommitSpy = vi.fn()
    const user = userEvent.setup()
    render(<ControlledQuickSearch onCommitSpy={onCommitSpy} />)

    const input = screen.getByRole("combobox", { name: "Search jobs" })
    await user.click(input)
    await user.type(input, "odin")
    await waitFor(() => expect(screen.getByRole("option", { name: "The odin" })).toBeInTheDocument())
    await user.keyboard("{ArrowDown}")
    await user.tab()
    expect(onCommitSpy).toHaveBeenLastCalledWith({ facet: "company", value: "The odin" })

    await user.type(input, "x")

    expect(onCommitSpy).toHaveBeenLastCalledWith(null)
  })
})
