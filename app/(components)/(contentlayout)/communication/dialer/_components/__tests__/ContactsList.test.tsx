import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ContactsList from "../ContactsList";

afterEach(cleanup); // repo has no global cleanup; multi-render files must unmount between tests

vi.mock("@/shared/lib/api/contacts", () => ({
  listContacts: vi.fn().mockResolvedValue({
    results: [
      { id: "1", tenantId: "t", ownerId: "o", name: "Sara", phones: [{ number: "+91 1", isPrimary: true }] },
      { id: "2", tenantId: "t", ownerId: "o", name: "Anil", favorite: true, phones: [{ number: "+91 2", isPrimary: true }] },
    ],
    page: 1, limit: 50, totalPages: 1, totalResults: 2,
  }),
}));

beforeEach(() => vi.clearAllMocks());

const base = {
  view: "contacts" as const, selectedContactId: null, refreshKey: 0,
  onSelectContact: vi.fn(), onDialContact: vi.fn(), onEditContact: vi.fn(),
  onNewContact: vi.fn(), onLoaded: vi.fn(),
};

it("loads contacts sorted (favorites first) and reports them up", async () => {
  const onLoaded = vi.fn();
  render(<ContactsList {...base} onLoaded={onLoaded} />);
  expect(await screen.findByText("Anil")).toBeInTheDocument();
  expect(screen.getByText("Sara")).toBeInTheDocument();
  // favorites-first sort: Anil card precedes Sara card in the DOM
  const cards = screen.getAllByText(/Anil|Sara/);
  expect(cards[0]).toHaveTextContent("Anil");
  await waitFor(() => expect(onLoaded).toHaveBeenCalled());
});

it("fires onNewContact", async () => {
  const onNewContact = vi.fn();
  render(<ContactsList {...base} onNewContact={onNewContact} />);
  fireEvent.click(await screen.findByRole("button", { name: /new contact/i }));
  expect(onNewContact).toHaveBeenCalled();
});

it("shows the empty state for favorites view", async () => {
  const { listContacts } = await import("@/shared/lib/api/contacts");
  (listContacts as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ results: [], page: 1, limit: 50, totalPages: 0, totalResults: 0 });
  render(<ContactsList {...base} view="favorites" />);
  expect(await screen.findByText(/no favorites yet/i)).toBeInTheDocument();
});
