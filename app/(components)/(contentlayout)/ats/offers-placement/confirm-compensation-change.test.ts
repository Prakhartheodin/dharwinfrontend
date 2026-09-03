import { describe, it, expect, vi } from "vitest";
import { confirmCompensationChange } from "./confirm-compensation-change";
import type { OfferCompensationGate } from "@/shared/lib/api/offers";

const gate = (over: Partial<OfferCompensationGate>): OfferCompensationGate => ({
  allowed: true,
  confirm: false,
  reason: "no-placement",
  stage: null,
  at: null,
  actorName: null,
  ...over,
});

describe("confirmCompensationChange", () => {
  it("does not interrupt when the job type is unchanged", async () => {
    const confirm = vi.fn();
    const r = await confirmCompensationChange({
      gate: gate({ confirm: true, reason: "live", stage: "Onboarding" }),
      changing: false,
      confirm,
    });
    expect(r).toEqual({ proceed: true, ack: false });
    expect(confirm).not.toHaveBeenCalled();
  });

  it("proceeds without asking when there is no placement yet", async () => {
    const confirm = vi.fn();
    const r = await confirmCompensationChange({ gate: gate({}), changing: true, confirm });
    expect(r).toEqual({ proceed: true, ack: false });
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks before changing compensation on a live placement, and acknowledges on yes", async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const r = await confirmCompensationChange({
      gate: gate({ confirm: true, reason: "live", stage: "Pending" }),
      changing: true,
      confirm,
    });
    expect(r).toEqual({ proceed: true, ack: true });
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0][0]).toMatchObject({ tone: "danger" });
  });

  it("abandons the save when the user declines", async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    const r = await confirmCompensationChange({
      gate: gate({ confirm: true, reason: "live", stage: "Onboarding" }),
      changing: true,
      confirm,
    });
    expect(r).toEqual({ proceed: false, ack: false });
  });

  it("refuses a joined candidate and points at the employee record", async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const r = await confirmCompensationChange({
      gate: gate({ allowed: false, reason: "joined", stage: "Joined" }),
      changing: true,
      confirm,
    });
    expect(r.proceed).toBe(false);
    const opts = confirm.mock.calls[0][0];
    expect(opts.hideCancel).toBe(true);
    expect(String(opts.message)).toMatch(/employee/i);
  });

  it("refuses an off-ramp placement and names who took it there", async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const r = await confirmCompensationChange({
      gate: gate({
        allowed: false,
        reason: "offramp",
        stage: "Cancelled",
        actorName: "Himanshu Dave",
      }),
      changing: true,
      confirm,
    });
    expect(r.proceed).toBe(false);
    const message = String(confirm.mock.calls[0][0].message);
    expect(message).toMatch(/Himanshu Dave/);
    expect(message).toMatch(/Pending/);
  });

  it("still refuses an off-ramp placement when nobody is recorded", async () => {
    // Rows predating cancelledBy have no actor. Missing attribution must not become permission.
    const confirm = vi.fn().mockResolvedValue(true);
    const r = await confirmCompensationChange({
      gate: gate({ allowed: false, reason: "offramp", stage: "Deferred", actorName: null }),
      changing: true,
      confirm,
    });
    expect(r.proceed).toBe(false);
  });

  it("proceeds when the gate is absent, leaving the server to decide", async () => {
    // An older cached offer may predate the field. The server enforces regardless.
    const confirm = vi.fn();
    const r = await confirmCompensationChange({ gate: undefined, changing: true, confirm });
    expect(r).toEqual({ proceed: true, ack: false });
  });
});
