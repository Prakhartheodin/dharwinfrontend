import { describe, expect, it } from "vitest";
import { STATUS_COLUMNS, STATUS_SET } from "../constants";
import { EMPTY_FILTERS } from "../../types";

describe("constants", () => {
  it("has five status columns", () => {
    expect(STATUS_COLUMNS).toHaveLength(5);
    expect(STATUS_SET.size).toBe(5);
  });
  it("empty filters baseline", () => {
    expect(EMPTY_FILTERS.q).toBe("");
    expect(EMPTY_FILTERS.priorities).toEqual([]);
  });
});
