import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContactCard from "../ContactCard";
import type { Contact } from "@/shared/lib/api/contacts";

const contact: Contact = {
  id: "1", tenantId: "t", ownerId: "o", name: "Anita Sharma", company: "Acme",
  favorite: true, doNotCall: true,
  phones: [{ number: "+91 98765 43210", isPrimary: true }],
};

it("renders name, number, star, DNC; fires select/dial/edit", () => {
  const onSelect = vi.fn(), onDial = vi.fn(), onEdit = vi.fn();
  render(<ContactCard contact={contact} selected={false} onSelect={onSelect} onDial={onDial} onEdit={onEdit} />);
  expect(screen.getByText("Anita Sharma")).toBeInTheDocument();
  expect(screen.getByText("+91 98765 43210")).toBeInTheDocument();
  expect(screen.getByText("DNC")).toBeInTheDocument();
  expect(screen.getByLabelText(/favorite/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /open anita sharma/i }));
  expect(onSelect).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /call anita sharma/i }));
  expect(onDial).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /edit anita sharma/i }));
  expect(onEdit).toHaveBeenCalled();
});
