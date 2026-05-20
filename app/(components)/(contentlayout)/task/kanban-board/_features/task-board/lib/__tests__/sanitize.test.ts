import { describe, expect, it } from "vitest";
import { sanitizeText, sanitizeViewName } from "../sanitize";

describe("sanitize", () => {
  it("strips HTML tags from text", () => {
    expect(sanitizeText("<b>hello</b>")).toBe("hello");
  });
  it("sanitizes view names", () => {
    expect(sanitizeViewName("<i>My view</i>")).toBe("My view");
  });
});
