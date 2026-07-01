import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecentCallsList from "../RecentCallsList";

vi.mock("@/shared/lib/api/bolna", () => ({
  getBolnaCallRecords: vi.fn().mockResolvedValue({
    success: true,
    records: [
      { _id: "1", displayName: "John Out", toPhoneNumber: "+911", telephonyData: { direction: "outbound" }, status: "completed", createdAt: "2026-07-01T08:00:00Z" },
      { _id: "2", displayName: "Sara In", toPhoneNumber: "+912", telephonyData: { direction: "inbound" }, status: "no-answer", createdAt: "2026-07-01T07:00:00Z" },
    ],
    total: 2, totalPages: 1, page: 1, limit: 50,
  }),
}));
vi.mock("@/shared/contexts/ChatSocketContext", () => ({
  useChatSocket: () => ({ onCallUpdate: () => () => {} }),
}));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

it("loads, reports missed count, filters by outbound", async () => {
  const onSelect = vi.fn(); const onMissed = vi.fn();
  render(<RecentCallsList activeView="recent"
    selectedCallId={null} onSelectCall={onSelect} onDialCall={() => {}} searchRef={null}
    onMissedCount={onMissed} />);
  expect(await screen.findByText("John Out")).toBeInTheDocument();
  expect(screen.getByText("Sara In")).toBeInTheDocument();
  await waitFor(() => expect(onMissed).toHaveBeenCalledWith(1));
  fireEvent.click(screen.getByRole("button", { name: /^outbound$/i }));
  await waitFor(() => expect(screen.queryByText("Sara In")).not.toBeInTheDocument());
  expect(screen.getByText("John Out")).toBeInTheDocument();
});
