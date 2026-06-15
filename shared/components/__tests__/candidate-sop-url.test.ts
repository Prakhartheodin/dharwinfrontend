import { describe, expect, it } from "vitest";
import { candidateIdFromUrl } from "../candidate-sop-url";

describe("candidateIdFromUrl", () => {
  it("returns candidateId from the query string on candidate-context pages", () => {
    expect(candidateIdFromUrl("/ats/employees", "candidateId=abc123")).toBe("abc123");
    expect(
      candidateIdFromUrl("/settings/attendance/backdated-attendance-requests", "candidateId=xyz"),
    ).toBe("xyz");
  });

  it("falls back to ?id= only on the employees edit page", () => {
    expect(candidateIdFromUrl("/ats/employees/edit", "id=edit-1")).toBe("edit-1");
    expect(candidateIdFromUrl("/ats/some-other-page", "id=edit-1")).toBeNull();
  });

  it("does NOT render the strip on prefill-only routes (interviews)", () => {
    // Regression: dashboard candidate-list interview icon links to
    // /ats/interviews?candidateId=... where candidateId only prefills the
    // Create Interview modal. The SOP "Complete profile" strip must not leak here.
    expect(candidateIdFromUrl("/ats/interviews", "candidateId=abc123")).toBeNull();
  });

  it("returns null when no candidate id is present", () => {
    expect(candidateIdFromUrl("/ats/jobs", "")).toBeNull();
    expect(candidateIdFromUrl(null, "candidateId=abc")).toBe("abc");
  });
});
