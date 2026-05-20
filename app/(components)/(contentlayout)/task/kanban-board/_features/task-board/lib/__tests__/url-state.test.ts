import { describe, expect, it } from "vitest";
import { deserialize, normalize, serializeFilters } from "../url-state";
import { EMPTY_FILTERS } from "../../types";

describe("url-state", () => {
  it("round-trips filters through URL params", () => {
    const filters = normalize({
      ...EMPTY_FILTERS,
      q: "billing",
      priorities: ["high"],
      assignedToMe: true,
    });
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(serializeFilters(filters))) {
      params.set(k, v);
    }
    const parsed = deserialize(params as unknown as import("next/navigation").ReadonlyURLSearchParams);
    expect(parsed.q).toBe("billing");
    expect(parsed.priorities).toEqual(["high"]);
    expect(parsed.assignedToMe).toBe(true);
  });
});

