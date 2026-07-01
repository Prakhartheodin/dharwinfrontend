import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import DialerWorkspace from "../DialerWorkspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/shared/lib/api/bolna", () => ({
  getBolnaCallRecords: vi.fn().mockResolvedValue({ success: true, records: [], total: 0, totalPages: 1, page: 1, limit: 50 }),
}));
vi.mock("@/shared/contexts/ChatSocketContext", () => ({ useChatSocket: () => ({ onCallUpdate: () => () => {} }) }));
vi.mock("@/shared/lib/api/contacts", () => ({
  listContacts: vi.fn().mockResolvedValue({ results: [{ id: "1", tenantId: "t", ownerId: "o", name: "Anita", phones: [{ number: "+91 1", isPrimary: true }] }], page: 1, limit: 50, totalPages: 1, totalResults: 1 }),
  createContact: vi.fn(), updateContact: vi.fn(), deleteContact: vi.fn(),
}));
// Dialpad pulls in telephony SDKs; stub it for the workspace test.
vi.mock("@/app/(components)/(contentlayout)/communication/calling/_components/Dialpad", () => ({
  default: () => <div data-testid="dialpad" />,
}));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it("switches to Contacts view and opens a contact in the right pane", async () => {
  render(<DialerWorkspace />);
  fireEvent.click(await screen.findByRole("button", { name: /^contacts$/i }));
  fireEvent.click(await screen.findByRole("button", { name: /open anita/i }));
  // Right pane now shows the contact detail (Edit button is unique to ContactContextPanel read view)
  expect(await screen.findByRole("button", { name: /^edit$/i })).toBeInTheDocument();
});

it("New contact opens a blank create form", async () => {
  render(<DialerWorkspace />);
  fireEvent.click(await screen.findByRole("button", { name: /^contacts$/i }));
  fireEvent.click(await screen.findByRole("button", { name: /new contact/i }));
  expect(await screen.findByText(/new contact/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^create$/i })).toBeInTheDocument();
});
