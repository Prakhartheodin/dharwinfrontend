import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUnsavedChanges } from "../useUnsavedChanges";

describe("useUnsavedChanges", () => {
  it("tracks dirty state", () => {
    const { result, rerender } = renderHook(
      ({ value, baselineKey }) => useUnsavedChanges({ value, baselineKey }),
      { initialProps: { value: { title: "a" }, baselineKey: "1" } }
    );
    expect(result.current.isDirty).toBe(false);
    rerender({ value: { title: "b" }, baselineKey: "1" });
    expect(result.current.isDirty).toBe(true);
    act(() => result.current.resetBaseline());
    expect(result.current.isDirty).toBe(false);
  });
});
