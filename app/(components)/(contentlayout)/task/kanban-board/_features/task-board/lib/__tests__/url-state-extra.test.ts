import { describe, expect, it, vi } from "vitest";
import { deserializeFilters, serializeFilters } from "../url-state";
import { EMPTY_FILTERS } from "../../types";

vi.mock("../telemetry", () => ({ trackTaskBoard: vi.fn() }));

describe("url-state extra", () => {
  it("serializes and deserializes filters", () => {
    const filters = {
      ...EMPTY_FILTERS,
      q: "hello",
      priorities: ["high" as const],
      statuses: ["new" as const],
      assignedToMe: true,
      reassigned: true,
    };
    const sp = new URLSearchParams(serializeFilters(filters));
    const back = deserializeFilters(sp as never);
    expect(back.q).toBe("hello");
    expect(back.priorities).toContain("high");
    expect(back.statuses).toContain("new");
    expect(back.assignedToMe).toBe(true);
    expect(back.reassigned).toBe(true);
  });

  it("drops invalid status values", () => {
    const sp = new URLSearchParams("status=not-a-status,new");
    const f = deserializeFilters(sp as never);
    expect(f.statuses).toEqual(["new"]);
  });
});
