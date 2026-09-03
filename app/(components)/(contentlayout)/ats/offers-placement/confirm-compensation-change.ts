import type { OfferCompensationGate } from "@/shared/lib/api/offers";

/** Subset of useConfirm's options this helper needs — kept structural to avoid a UI import here. */
export interface CompensationConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary" | "success";
  hideCancel?: boolean;
}

export interface ConfirmCompensationChangeParams {
  /** From GET /offers/:id. Undefined on an offer loaded before the field existed. */
  gate: OfferCompensationGate | undefined;
  /** Whether the job type actually moved in this save. */
  changing: boolean;
  confirm: (options: CompensationConfirmOptions) => Promise<boolean>;
}

/**
 * Whether a compensation change may go ahead, asking the user when the candidate is already past
 * the offer stage.
 *
 * Shared by the offer letter page and the offers-placement modal — both edit job type, and a second
 * copy of these rules is how the two would drift apart.
 *
 * This is a courtesy, not the control: the server enforces the same rules and rejects the save
 * regardless. The point is that the user finds out before filling in a change rather than from a
 * failed save afterwards.
 */
export async function confirmCompensationChange({
  gate,
  changing,
  confirm,
}: ConfirmCompensationChangeParams): Promise<{ proceed: boolean; ack: boolean }> {
  if (!changing) return { proceed: true, ack: false };

  // No gate means the offer predates the field. The server still enforces, so do not block here.
  if (!gate) return { proceed: true, ack: false };

  if (!gate.allowed) {
    const joined = gate.reason === "joined";
    await confirm({
      title: joined ? "Already an employee" : "Placement is not active",
      message: joined
        ? "This candidate has already joined. Compensation is part of their employee record now — change it from Employee → Edit, where it will be logged against your name."
        : `This placement is ${String(gate.stage ?? "").toLowerCase()}${
            gate.actorName ? `, by ${gate.actorName}` : ""
          }. Restore it to Pending before changing compensation.`,
      confirmLabel: "Close",
      hideCancel: true,
    });
    return { proceed: false, ack: false };
  }

  if (gate.confirm) {
    const ok = await confirm({
      title: "Change compensation after the offer stage?",
      message: `This candidate is already in ${
        gate.stage === "Onboarding" ? "onboarding" : "pre-boarding"
      }. Changing the job type also updates their employee record, and is recorded in the audit trail with your name.`,
      confirmLabel: "Change compensation",
      cancelLabel: "Keep current",
      tone: "danger",
    });
    return ok ? { proceed: true, ack: true } : { proceed: false, ack: false };
  }

  return { proceed: true, ack: false };
}
