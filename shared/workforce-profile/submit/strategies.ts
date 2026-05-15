import {
  createCandidate,
  updateCandidate,
  type CandidateListItem,
} from "@/shared/lib/api/employees";
import { updateMeWithCandidate } from "@/shared/lib/api/auth";
import type { Mode, Role } from "../types/wizard.types";
import type { WorkforceFormState } from "../types/workforce.types";
import { normalize } from "../services/normalizer";
import {
  toCandidatePayload,
  toSelfServicePayload,
  type DirtyMap,
} from "../services/payload";

export type StrategyKind = "create-admin" | "update-admin" | "self-service";

export type StrategyContext = {
  state: WorkforceFormState;
  dirty?: DirtyMap;
};

export type StrategyResult = {
  kind: StrategyKind;
  candidate?: CandidateListItem;
  raw: unknown;
};

export type SubmitStrategy = {
  kind: StrategyKind;
  run: (ctx: StrategyContext) => Promise<StrategyResult>;
};

export type GetStrategyArgs = {
  mode: Mode;
  role: Role;
  id?: string;
};

const adminCreate: SubmitStrategy = {
  kind: "create-admin",
  run: async ({ state }) => {
    const payload = toCandidatePayload(normalize(state));
    const candidate = await createCandidate(payload);
    return { kind: "create-admin", candidate, raw: candidate };
  },
};

function adminUpdate(id: string): SubmitStrategy {
  return {
    kind: "update-admin",
    run: async ({ state }) => {
      const payload = toCandidatePayload(normalize(state));
      const candidate = await updateCandidate(id, payload);
      return { kind: "update-admin", candidate, raw: candidate };
    },
  };
}

const selfService: SubmitStrategy = {
  kind: "self-service",
  run: async ({ state, dirty }) => {
    const payload = toSelfServicePayload(normalize(state), dirty);
    const result = await updateMeWithCandidate(payload);
    return {
      kind: "self-service",
      candidate: result.candidate as unknown as CandidateListItem,
      raw: result,
    };
  },
};

export function getSubmitStrategy({
  mode,
  id,
}: GetStrategyArgs): SubmitStrategy {
  switch (mode) {
    case "create-admin":
      return adminCreate;
    case "edit-admin":
      if (!id) {
        throw new Error(
          "[workforce-profile] edit-admin strategy requires a candidate id",
        );
      }
      return adminUpdate(id);
    case "self-service-employee":
    case "self-service-candidate":
      return selfService;
    default: {
      const exhaustive: never = mode;
      throw new Error(`[workforce-profile] unknown mode: ${String(exhaustive)}`);
    }
  }
}
