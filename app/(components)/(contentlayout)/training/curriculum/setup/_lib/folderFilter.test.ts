import { describe, expect, it } from "vitest"
import type { Category } from "@/shared/lib/api/categories"
import {
  FOLDER_FILTER_COLLAPSED_UNSELECTED,
  categoryMatchesFolderQuery,
  orderCategoriesForFilter,
  pickVisibleFolderChips,
  pruneSelectedFolderIds,
} from "./folderFilter"

const cats = (names: [string, string][]): Category[] =>
  names.map(([id, name]) => ({
    id,
    name,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  }))

describe("pruneSelectedFolderIds", () => {
  it("returns the same reference when every id still exists", () => {
    const selected = ["a", "b"]
    const next = pruneSelectedFolderIds(selected, [{ id: "a" }, { id: "b" }, { id: "c" }])
    expect(next).toBe(selected)
  })

  it("drops stale ids after a folder is deleted", () => {
    expect(pruneSelectedFolderIds(["a", "gone", "b"], [{ id: "a" }, { id: "b" }])).toEqual([
      "a",
      "b",
    ])
  })

  it("clears selection when every selected folder is gone", () => {
    expect(pruneSelectedFolderIds(["gone"], [{ id: "a" }])).toEqual([])
  })
})

describe("categoryMatchesFolderQuery", () => {
  it("ignores case and surrounding whitespace", () => {
    expect(categoryMatchesFolderQuery({ name: "Cyber Security" }, "  cyber  ")).toBe(true)
  })

  it("returns true for an empty query", () => {
    expect(categoryMatchesFolderQuery({ name: "Anything" }, "   ")).toBe(true)
  })
})

describe("orderCategoriesForFilter", () => {
  it("puts selected folders first in selection order, then the rest by name", () => {
    const list = cats([
      ["c", "Zebra"],
      ["a", "Alpha"],
      ["b", "Beta"],
    ])
    expect(orderCategoriesForFilter(list, ["b", "c"]).map((c) => c.id)).toEqual([
      "b",
      "c",
      "a",
    ])
  })

  it("keeps same-label folders distinguishable by id", () => {
    const list = cats([
      ["id-2", "Cyber"],
      ["id-1", "Cyber"],
    ])
    expect(orderCategoriesForFilter(list, []).map((c) => c.id)).toEqual(["id-1", "id-2"])
  })
})

describe("pickVisibleFolderChips", () => {
  const many = cats(
    Array.from({ length: FOLDER_FILTER_COLLAPSED_UNSELECTED + 5 }, (_, i) => [
      `f${i}`,
      `Folder ${i}`,
    ])
  )

  it("keeps selected chips visible when collapsed and reports hidden unselected count", () => {
    const selectedIds = ["f20", "f21"]
    // Ensure those ids exist
    const withSelected = [
      ...many,
      ...cats([
        ["f20", "Selected A"],
        ["f21", "Selected B"],
      ]),
    ]
    const ordered = orderCategoriesForFilter(withSelected, selectedIds)
    const { visible, hiddenCount } = pickVisibleFolderChips(ordered, selectedIds, false)
    expect(visible.map((c) => c.id).slice(0, 2)).toEqual(["f20", "f21"])
    expect(visible).toHaveLength(2 + FOLDER_FILTER_COLLAPSED_UNSELECTED)
    expect(hiddenCount).toBeGreaterThan(0)
    expect(visible.every((c) => ordered.some((o) => o.id === c.id))).toBe(true)
  })

  it("shows every chip when expanded", () => {
    const ordered = orderCategoriesForFilter(many, [])
    const { visible, hiddenCount } = pickVisibleFolderChips(ordered, [], true)
    expect(visible).toHaveLength(many.length)
    expect(hiddenCount).toBe(0)
  })
})
