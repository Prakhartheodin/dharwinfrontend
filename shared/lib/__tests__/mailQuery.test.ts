import { describe, it, expect } from "vitest";
import { buildMailQuery } from "../mailQuery";

describe("buildMailQuery", () => {
  it("scopes plain text to sender + subject", () => {
    expect(buildMailQuery("mo")).toBe('from:"mo" OR subject:"mo"');
  });
  it("passes operator queries through untouched (is:unread must not be wrapped)", () => {
    expect(buildMailQuery("is:unread")).toBe("is:unread");
    expect(buildMailQuery("isRead:false")).toBe("isRead:false");
  });
  it("returns empty for blank input", () => {
    expect(buildMailQuery("   ")).toBe("");
  });
  it("strips quotes so phrases can't break the query", () => {
    expect(buildMailQuery('john "doe')).toBe('from:"john doe" OR subject:"john doe"');
  });
});
