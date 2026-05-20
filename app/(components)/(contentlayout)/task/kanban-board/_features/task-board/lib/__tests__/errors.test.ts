import { describe, expect, it } from "vitest";
import { extractCorrelationId, humanizeApiError, classifyError } from "../errors";

describe("errors", () => {
  it("extracts correlation id from error shape", () => {
    expect(extractCorrelationId({ correlationId: "abc-123" })).toBe("abc-123");
  });
  it("classifies network errors", () => {
    expect(classifyError(new TypeError("Failed to fetch"))).toBe("network");
  });
  it("humanizes unknown errors", () => {
    expect(humanizeApiError(new Error("boom"), "Fallback")).toBe("boom");
    expect(humanizeApiError({}, "Fallback")).toBe("Fallback");
  });
});
