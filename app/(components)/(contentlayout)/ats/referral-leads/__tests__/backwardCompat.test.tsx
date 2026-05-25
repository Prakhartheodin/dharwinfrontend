import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatCards } from "../components/StatCards";
import { ReferralLeadsTable } from "../components/ReferralLeadsTable";
import { coalesceField } from "../api/salesAgentAttribution";
import type { ReferralLeadRow, ReferralLeadsStatsResponse } from "@/shared/lib/api/referralLeads";

const baseStats: ReferralLeadsStatsResponse = {
  totalReferrals: 10,
  converted: 3,
  conversionRate: 30,
  pending: 5,
  hired: 2,
  topReferrer: null,
  leaderboard: [],
};

const legacyLead: ReferralLeadRow = {
  id: "lead-1",
  fullName: "Legacy Candidate",
  email: "legacy@example.com",
  referralPipelineStatus: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("backward compat — sales agent attribution", () => {
  afterEach(() => cleanup());

  it("StatCards hides row 2 when feature flag is off", () => {
    render(<StatCards stats={baseStats} canSeeReferralLeaderboard={false} featureEnabled={false} />);
    expect(screen.queryByText("Unassigned")).toBeNull();
    expect(screen.queryByText("Top sales agent")).toBeNull();
    expect(screen.getByText("Total referrals")).toBeTruthy();
  });

  it("ReferralLeadsTable hides new columns when feature flag is off", () => {
    render(
      <ReferralLeadsTable
        list={[legacyLead]}
        featureEnabled={false}
        onSelect={() => undefined}
        canManageAttribution
        canRevokeAttribution
        onAssign={() => undefined}
        onChange={() => undefined}
        onRevoke={() => undefined}
        onViewHistory={() => undefined}
      />
    );
    expect(screen.queryByText("Stage")).toBeNull();
    expect(screen.queryByText("Assigned sales agent")).toBeNull();
    expect(screen.queryByRole("menuitem", { name: /assign sales agent/i })).toBeNull();
  });

  it("legacy list rows without salesAgent fields render without crashing", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ReferralLeadsTable
        list={[legacyLead]}
        featureEnabled
        onSelect={() => undefined}
        canManageAttribution
        canRevokeAttribution
        onAssign={() => undefined}
        onChange={() => undefined}
        onRevoke={() => undefined}
        onViewHistory={() => undefined}
      />
    );
    expect(within(container).getByText("Legacy Candidate")).toBeTruthy();
    expect(within(container).getByText("Unassigned")).toBeTruthy();
    await user.click(within(container).getByRole("button", { name: /row actions/i }));
    expect(screen.getByRole("menuitem", { name: /assign sales agent/i })).toBeTruthy();
  });

  it("coalesceField tolerates missing salesAgent on old backend rows", () => {
    const legacyRow = { id: "1", fullName: "Test", email: "t@x.com" };
    expect(coalesceField(legacyRow, "salesAgent", null)).toBeNull();
    expect(coalesceField(legacyRow, "lifecycleStage", "pending")).toBe("pending");
  });

  it("coalesceField returns present values when backend includes them", () => {
    const row = { salesAgent: { id: "a1", name: "Agent" }, lifecycleStage: "interview" };
    expect(coalesceField(row, "salesAgent", null)).toEqual({ id: "a1", name: "Agent" });
    expect(coalesceField(row, "lifecycleStage", "pending")).toBe("interview");
  });
});
