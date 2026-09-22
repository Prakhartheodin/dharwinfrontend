import { describe, expect, it } from "vitest"
import {
  DEFAULT_SETUP_PAGE_SIZE,
  areSetupListQueryStringsEquivalent,
  buildSetupListQueryString,
  cycleSetupSort,
  parseSetupFolderIds,
  parseSetupListState,
  parseSetupPage,
  parseSetupPageSize,
  parseSetupSortBy,
  setupStateAfterFilterChange,
  toSetupApiSortBy,
} from "./setup-list-query"

describe("parseSetupPage", () => {
  it("defaults invalid values to 1", () => {
    expect(parseSetupPage(null)).toBe(1)
    expect(parseSetupPage("0")).toBe(1)
    expect(parseSetupPage("abc")).toBe(1)
  })

  it("parses positive integers", () => {
    expect(parseSetupPage("3")).toBe(3)
  })
})

describe("parseSetupPageSize", () => {
  it("defaults to 50 for unsupported values", () => {
    expect(parseSetupPageSize(null)).toBe(DEFAULT_SETUP_PAGE_SIZE)
    expect(parseSetupPageSize("15")).toBe(DEFAULT_SETUP_PAGE_SIZE)
  })

  it("accepts allowed sizes", () => {
    expect(parseSetupPageSize("25")).toBe(25)
    expect(parseSetupPageSize("100")).toBe(100)
  })
})

describe("parseSetupFolderIds", () => {
  it("parses comma-separated ObjectIds and drops junk/dupes", () => {
    expect(
      parseSetupFolderIds(
        "aaaaaaaaaaaaaaaaaaaaaaaa,not-an-id,aaaaaaaaaaaaaaaaaaaaaaaa,bbbbbbbbbbbbbbbbbbbbbbbb"
      )
    ).toEqual(["aaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbb"])
  })
})

describe("parseSetupSortBy", () => {
  it("reads primary field and ignores secondary _id", () => {
    expect(parseSetupSortBy("name:asc,_id:asc")).toBe("name:asc")
    expect(parseSetupSortBy("employees:desc")).toBe("employees:desc")
  })

  it("ignores unknown sort fields", () => {
    expect(parseSetupSortBy("bogus:asc")).toBeNull()
    expect(parseSetupSortBy("")).toBeNull()
  })
})

describe("parseSetupListState", () => {
  it("reads list params from the URL", () => {
    const params = new URLSearchParams(
      "page=2&limit=25&search=qa&folderIds=aaaaaaaaaaaaaaaaaaaaaaaa&sortBy=name:desc,_id:asc&tab=categories"
    )
    expect(parseSetupListState(params)).toEqual({
      page: 2,
      limit: 25,
      search: "qa",
      folderIds: ["aaaaaaaaaaaaaaaaaaaaaaaa"],
      sortBy: "name:desc",
    })
  })
})

describe("buildSetupListQueryString", () => {
  it("omits defaults and neutral sort", () => {
    expect(
      buildSetupListQueryString({
        page: 1,
        limit: DEFAULT_SETUP_PAGE_SIZE,
        search: "",
        folderIds: [],
        sortBy: null,
      })
    ).toBe("")
  })

  it("serializes active list state with sortBy including _id", () => {
    const qs = buildSetupListQueryString({
      page: 2,
      limit: 25,
      search: " engineer ",
      folderIds: ["aaaaaaaaaaaaaaaaaaaaaaaa"],
      sortBy: "employees:asc",
    })
    expect(Object.fromEntries(new URLSearchParams(qs.slice(1)).entries())).toEqual({
      page: "2",
      limit: "25",
      search: "engineer",
      folderIds: "aaaaaaaaaaaaaaaaaaaaaaaa",
      sortBy: "employees:asc,_id:asc",
    })
  })
})

describe("setupStateAfterFilterChange", () => {
  it("resets page to 1 when filters change", () => {
    expect(
      setupStateAfterFilterChange(
        {
          page: 4,
          limit: 50,
          search: "",
          folderIds: [],
          sortBy: null,
        },
        { search: "x" }
      ).page
    ).toBe(1)
  })
})

describe("cycleSetupSort", () => {
  it("cycles null → asc → desc → null", () => {
    expect(cycleSetupSort(null, "name")).toBe("name:asc")
    expect(cycleSetupSort("name:asc", "name")).toBe("name:desc")
    expect(cycleSetupSort("name:desc", "name")).toBeNull()
    expect(cycleSetupSort("employees:asc", "name")).toBe("name:asc")
  })
})

describe("toSetupApiSortBy / equivalence", () => {
  it("omits sort when neutral", () => {
    expect(toSetupApiSortBy(null)).toBeUndefined()
  })

  it("treats param order as equivalent", () => {
    expect(
      areSetupListQueryStringsEquivalent("page=2&search=qa", "search=qa&page=2")
    ).toBe(true)
  })
})
