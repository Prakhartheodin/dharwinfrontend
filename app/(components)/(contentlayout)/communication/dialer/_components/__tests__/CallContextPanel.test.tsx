import { it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import CallContextPanel from "../CallContextPanel";
import type { CallRecord } from "@/shared/lib/api/bolna";

afterEach(cleanup);

it("shows empty state when no record", () => {
  render(<CallContextPanel record={null} onCall={() => {}} />);
  expect(screen.getByText(/start a conversation/i)).toBeInTheDocument();
});

it("renders details, gates recording, saves as contact", () => {
  const onCall = vi.fn();
  const rec: CallRecord = {
    _id: "1", displayName: "Jane", toPhoneNumber: "+911", status: "completed",
    telephonyData: { direction: "outbound" }, duration: 61, createdAt: "2026-07-01T08:00:00Z",
  };
  const onSaveAsContact = vi.fn();
  render(<CallContextPanel record={rec} onCall={onCall} onSaveAsContact={onSaveAsContact} />);
  expect(screen.getByText("Jane")).toBeInTheDocument();
  expect(screen.queryByText("Recording")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^call$/i }));
  expect(onCall).toHaveBeenCalledWith("+911");
  fireEvent.click(screen.getByRole("button", { name: /save as contact/i }));
  expect(onSaveAsContact).toHaveBeenCalledWith(rec);
});
