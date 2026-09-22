import { describe, expect, it } from "vitest"
import type { PositionRosterItem } from "@/shared/lib/api/positions"
import { filterPositions } from "./filterPositions"

const rows = [
  {
    id: "p1",
    name: "Design Engineer",
    department: "Product",
    employeeCount: 1,
    assignedModules: [{ id: "m1", name: "Figma Basics" }],
    assignedEmployees: [{ id: "e1", name: "Asha Rao" }],
  },
  {
    id: "p2",
    name: "Mobile Engineer",
    department: "Engineering",
    employeeCount: 0,
    assignedModules: [{ id: "m2", name: "Kotlin Intro" }],
    assignedEmployees: [],
  },
] as PositionRosterItem[]

const foldersByModuleId = new Map([
  ["m1", ["f-product"]],
  ["m2", ["f-eng"]],
])

describe("filterPositions", () => {
  it("returns every row for an empty query and no folder filter", () => {
    expect(filterPositions(rows, "", [], foldersByModuleId)).toHaveLength(2)
  })

  it("matches on position name", () => {
    expect(filterPositions(rows, "design", [], foldersByModuleId).map((r) => r.id)).toEqual(["p1"])
  })

  it("matches on department", () => {
    expect(filterPositions(rows, "engineering", [], foldersByModuleId).map((r) => r.id)).toEqual(["p2"])
  })

  it("matches on an assigned module name", () => {
    expect(filterPositions(rows, "kotlin", [], foldersByModuleId).map((r) => r.id)).toEqual(["p2"])
  })

  it("matches on an assigned employee name", () => {
    expect(filterPositions(rows, "asha", [], foldersByModuleId).map((r) => r.id)).toEqual(["p1"])
  })

  it("intersects the folder filter with the text query rather than unioning", () => {
    expect(filterPositions(rows, "design", ["f-eng"], foldersByModuleId)).toHaveLength(0)
  })

  it("ORs multiple selected folders", () => {
    expect(
      filterPositions(rows, "", ["f-product", "f-eng"], foldersByModuleId).map((r) => r.id).sort()
    ).toEqual(["p1", "p2"])
  })

  it("keeps positions with no folder membership when no folders are selected", () => {
    const orphan = [
      {
        ...rows[0],
        id: "orphan",
        assignedModules: [{ id: "m-orphan", name: "Loose" }],
      },
    ] as PositionRosterItem[]
    expect(filterPositions(orphan, "", [], foldersByModuleId)).toHaveLength(1)
    expect(filterPositions(orphan, "", ["f-product"], foldersByModuleId)).toHaveLength(0)
  })

  it("matches a position whose modules span two folders on either folder id", () => {
    const spanning = [
      {
        ...rows[0],
        assignedModules: [
          { id: "m1", name: "A" },
          { id: "m2", name: "B" },
        ],
      },
    ] as PositionRosterItem[]
    expect(filterPositions(spanning, "", ["f-eng"], foldersByModuleId)).toHaveLength(1)
    expect(filterPositions(spanning, "", ["f-product"], foldersByModuleId)).toHaveLength(1)
  })
})
