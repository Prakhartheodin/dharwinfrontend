import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import * as api from "@/shared/lib/api/companyPhoneNumbers";
import CompanyWorkNumberAssignmentPanel from "./CompanyWorkNumberAssignmentPanel";

const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn() }));

vi.mock("@/shared/contexts/auth-context", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/shared/lib/permissions", () => ({ hasPermission: () => true }));
vi.mock("@/shared/components/ui/useConfirm", () => ({
  useConfirm: () => ({ confirm: confirmMock, confirmDialog: null }),
}));
vi.mock("@/shared/lib/api/companyPhoneNumbers", () => ({
  syncCompanyPhoneNumbers: vi.fn().mockResolvedValue({}),
  getCompanyPhoneUserAssignments: vi.fn(),
  assignCompanyPhoneNumberToUser: vi.fn(),
}));

const roster = {
  success: true,
  users: [
    { userId: "u1", fullName: "Asha Rao", email: "asha@x.com", roleLabel: "HR", companyPhoneNumberId: "n1", companyPhoneNumber: "+14159936500" },
    { userId: "u2", fullName: "Bilal Khan", email: "bilal@x.com", roleLabel: "HR", companyPhoneNumberId: null, companyPhoneNumber: "" },
  ],
  numbers: [
    { _id: "n1", phoneNumber: "+14159936500", isActive: true, assignedToUserId: "u1" },
    { _id: "n2", phoneNumber: "+12237588239", isActive: true, assignedToUserId: null },
  ],
};

async function openRosterAndPick(value: string) {
  render(<CompanyWorkNumberAssignmentPanel />);
  await waitFor(() => expect(screen.getByText("User roster")).toBeTruthy());
  fireEvent.click(screen.getByText("User roster"));
  await waitFor(() => expect(screen.getByText("Bilal Khan")).toBeTruthy());
  const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
  fireEvent.change(selects[1], { target: { value } }); // Bilal's row
}

describe("CompanyWorkNumberAssignmentPanel reassignment guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCompanyPhoneUserAssignments).mockResolvedValue(structuredClone(roster) as never);
    vi.mocked(api.assignCompanyPhoneNumberToUser).mockResolvedValue({
      success: true, userId: "u2", companyPhoneNumberId: "n2", companyPhoneNumber: "+12237588239",
    } as never);
    confirmMock.mockReset();
  });
  afterEach(cleanup);

  it("saves a free number without confirming", async () => {
    await openRosterAndPick("n2");
    await waitFor(() => expect(api.assignCompanyPhoneNumberToUser).toHaveBeenCalled());
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("confirms before taking a number off its current holder", async () => {
    confirmMock.mockResolvedValue(true);
    await openRosterAndPick("n1");
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(api.assignCompanyPhoneNumberToUser).toHaveBeenCalledWith({ userId: "u2", companyPhoneNumberId: "n1" });
  });

  it("clears the number off the displaced holder without a refetch", async () => {
    confirmMock.mockResolvedValue(true);
    vi.mocked(api.assignCompanyPhoneNumberToUser).mockResolvedValue({
      success: true, userId: "u2", companyPhoneNumberId: "n1", companyPhoneNumber: "+14159936500",
    } as never);
    await openRosterAndPick("n1");
    await waitFor(() => expect(api.assignCompanyPhoneNumberToUser).toHaveBeenCalled());
    const selects = () => screen.getAllByRole("combobox") as HTMLSelectElement[];
    await waitFor(() => expect(selects()[1].value).toBe("n1"));
    expect(selects()[0].value).toBe(""); // Asha's row reverted to "— None —"
    expect(api.getCompanyPhoneUserAssignments).toHaveBeenCalledTimes(1);
  });

  it("does not call the API when the reassignment is cancelled", async () => {
    confirmMock.mockResolvedValue(false);
    await openRosterAndPick("n1");
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(api.assignCompanyPhoneNumberToUser).not.toHaveBeenCalled();
  });
});
