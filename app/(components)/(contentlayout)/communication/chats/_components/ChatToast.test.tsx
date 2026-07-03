import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatToast } from "./ChatToast";

describe("useChatToast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows an error toast by default and auto-dismisses after the duration", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useChatToast(4000));
    expect(result.current.toast).toBeNull();
    act(() => {
      result.current.showToast("Message failed to send");
    });
    expect(result.current.toast).toEqual({ message: "Message failed to send", type: "error" });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.toast).toBeNull();
  });

  it("restarts the dismiss timer when a second toast replaces the first", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useChatToast(4000));
    act(() => {
      result.current.showToast("first");
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      result.current.showToast("second", "success");
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.toast).toEqual({ message: "second", type: "success" });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.toast).toBeNull();
  });
});
