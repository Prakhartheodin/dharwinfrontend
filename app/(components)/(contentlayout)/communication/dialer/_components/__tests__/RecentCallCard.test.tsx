import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RecentCallCard from "../RecentCallCard";
import type { CallRecord } from "@/shared/lib/api/bolna";

const rec: CallRecord = {
  _id: "1", displayName: "John Doe", toPhoneNumber: "+919876543210",
  telephonyData: { direction: "outbound" }, status: "completed",
  duration: 252, createdAt: "2026-07-01T08:53:00Z",
};
const noop = () => {};

it("renders name and number and fires callbacks", () => {
  const onSelect = vi.fn(); const onDial = vi.fn();
  render(<RecentCallCard record={rec} selected={false} pinned={false}
    onSelect={onSelect} onDial={onDial} onTogglePin={noop} />);
  expect(screen.getByText("John Doe")).toBeInTheDocument();
  expect(screen.getByText("+919876543210")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /john doe/i }));
  expect(onSelect).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByLabelText("Dial"));
  expect(onDial).toHaveBeenCalledOnce();
});
