import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CallContextPanel from "../CallContextPanel";
import type { CallRecord } from "@/shared/lib/api/bolna";

it("shows empty state when no record", () => {
  render(<CallContextPanel record={null} onCall={() => {}} />);
  expect(screen.getByText(/start a conversation/i)).toBeInTheDocument();
});

it("renders details, gates recording, disables save", () => {
  const onCall = vi.fn();
  const rec: CallRecord = {
    _id: "1", displayName: "Jane", toPhoneNumber: "+911", status: "completed",
    telephonyData: { direction: "outbound" }, duration: 61, createdAt: "2026-07-01T08:00:00Z",
  };
  render(<CallContextPanel record={rec} onCall={onCall} />);
  expect(screen.getByText("Jane")).toBeInTheDocument();
  // no executionId → recording section not rendered
  expect(screen.queryByText("Recording")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^call$/i }));
  expect(onCall).toHaveBeenCalledWith("+911");
  expect(screen.getByRole("button", { name: /save as contact/i })).toBeDisabled();
});
