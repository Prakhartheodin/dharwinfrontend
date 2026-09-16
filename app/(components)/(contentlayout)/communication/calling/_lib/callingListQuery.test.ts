import { describe, expect, it } from "vitest";
import {
  buildCallingListSearch,
  callingSearchParam,
  parseCallingListQuery,
} from "./callingListQuery";

describe("callingListQuery", () => {
  it("parseCallingListQuery defaults", () => {
    const sp = new URLSearchParams();
    expect(parseCallingListQuery(sp)).toEqual({
      q: "",
      page: 1,
      source: "all",
      status: "all",
    });
  });

  it("callingSearchParam omits short queries", () => {
    expect(callingSearchParam("a")).toBeUndefined();
    expect(callingSearchParam("ab")).toBe("ab");
  });

  it("buildCallingListSearch sets page and q", () => {
    const qs = buildCallingListSearch(new URLSearchParams(), { q: "john", page: 2 });
    const sp = new URLSearchParams(qs);
    expect(sp.get("q")).toBe("john");
    expect(sp.get("page")).toBe("2");
  });
});
