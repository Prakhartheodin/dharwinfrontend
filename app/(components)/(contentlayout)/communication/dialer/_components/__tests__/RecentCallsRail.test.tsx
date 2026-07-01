import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecentCallsRail from "../RecentCallsRail";

// vi.mock factories are hoisted above top-level const declarations, so the
// fixture records are inlined here rather than referenced from an outer const
// (referencing one throws "Cannot access before initialization").
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
  useChatSocket: () => ({ onCallUpdate: () => () => {} }), // returns an unsubscribe fn
}));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

it("loads, shows missed count, filters by outbound", async () => {
  const onSelect = vi.fn();
  render(<RecentCallsRail activeView="recent" onViewChange={() => {}}
    selectedCallId={null} onSelectCall={onSelect} onDialCall={() => {}} searchRef={null} />);
  expect(await screen.findByText("John Out")).toBeInTheDocument();
  expect(screen.getByText("Sara In")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /missed \(1\)/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^outbound$/i }));
  await waitFor(() => expect(screen.queryByText("Sara In")).not.toBeInTheDocument());
  expect(screen.getByText("John Out")).toBeInTheDocument();
});
