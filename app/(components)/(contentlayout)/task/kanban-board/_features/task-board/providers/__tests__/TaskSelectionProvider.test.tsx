import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TaskSelectionProvider, useTaskSelection } from "../TaskSelectionProvider";

describe("TaskSelectionProvider", () => {
  it("selects and clears", () => {
    const { result } = renderHook(() => useTaskSelection(), {
      wrapper: TaskSelectionProvider,
    });
    act(() => result.current.toggle("a"));
    expect(result.current.isSelected("a")).toBe(true);
    act(() => result.current.clearSelection());
    expect(result.current.selectedIds.size).toBe(0);
  });
});
