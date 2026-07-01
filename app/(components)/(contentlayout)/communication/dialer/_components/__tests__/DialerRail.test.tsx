import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import DialerRail from "../DialerRail";

vi.mock("@/shared/lib/api/bolna", () => ({
  getBolnaCallRecords: vi.fn().mockResolvedValue({ success: true, records: [], total: 0, totalPages: 1, page: 1, limit: 50 }),
}));
vi.mock("@/shared/contexts/ChatSocketContext", () => ({ useChatSocket: () => ({ onCallUpdate: () => () => {} }) }));
vi.mock("@/shared/lib/api/contacts", () => ({
  listContacts: vi.fn().mockResolvedValue({ results: [{ id: "1", tenantId: "t", ownerId: "o", name: "Anita", phones: [{ number: "+91 1", isPrimary: true }] }], page: 1, limit: 50, totalPages: 1, totalResults: 1 }),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

const base = {
  view: "recent" as const, missedCount: 2, onViewChange: vi.fn(),
  selectedCallId: null, selectedContactId: null, refreshKey: 0, searchRef: null,
  onSelectCall: vi.fn(), onDialCall: vi.fn(), onMissedCount: vi.fn(),
  onSelectContact: vi.fn(), onDialContact: vi.fn(), onEditContact: vi.fn(),
  onNewContact: vi.fn(), onLoaded: vi.fn(),
};

it("renders nav with missed badge and switches to contacts", () => {
  const onViewChange = vi.fn();
  render(<DialerRail {...base} onViewChange={onViewChange} />);
  expect(screen.getByRole("button", { name: /missed \(2\)/i })).toBeInTheDocument();
  expect(screen.getByText(/voicemail/i).closest("span")).toHaveTextContent(/soon/i);
  fireEvent.click(screen.getByRole("button", { name: /^contacts$/i }));
  expect(onViewChange).toHaveBeenCalledWith("contacts");
});

it("shows ContactsList body when view is contacts", async () => {
  render(<DialerRail {...base} view="contacts" />);
  expect(await screen.findByText("Anita")).toBeInTheDocument();
});
