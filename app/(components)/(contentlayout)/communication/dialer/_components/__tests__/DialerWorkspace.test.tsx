import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DialerWorkspace from "../DialerWorkspace";

// vi.mock factories are hoisted above top-level const declarations, so the
// fixture records are inlined here rather than referenced from an outer const.
vi.mock("@/shared/lib/api/bolna", () => ({
  getBolnaCallRecords: vi.fn().mockResolvedValue({
    success: true,
    records: [
      { _id: "1", displayName: "John Out", toPhoneNumber: "+919000000001", telephonyData: { direction: "outbound" }, status: "completed", createdAt: "2026-07-01T08:00:00Z" },
    ],
    total: 1, totalPages: 1, page: 1, limit: 50,
  }),
}));
// vi.mock factories are hoisted above top-level const declarations; vi.hoisted
// lets the mock reference a spy that's guaranteed to exist by then.
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/communication/dialer",
}));
vi.mock("@/app/(components)/(contentlayout)/communication/calling/_components/Dialpad", () => ({
  default: ({ dialTarget }: { dialTarget?: string }) => <div data-testid="dialpad">{dialTarget ?? ""}</div>,
}));
vi.mock("@/shared/contexts/ChatSocketContext", () => ({
  useChatSocket: () => ({ onCallUpdate: () => () => {} }),
}));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

it("selecting a call fills the dialpad and shows details", async () => {
  render(<DialerWorkspace />);
  fireEvent.click(await screen.findByRole("button", { name: /john out/i }));
  expect(screen.getByTestId("dialpad")).toHaveTextContent("+919000000001");
  // name appears in both the rail card and the context panel
  expect(screen.getAllByText("John Out").length).toBeGreaterThan(1);
});
