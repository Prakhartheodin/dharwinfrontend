import type { Mode, Role, StepId } from "../types/wizard.types";
import type { ValidationSeverity } from "../types/validation.types";

export type WorkforceAnalyticsEvent =
  | { type: "wizard.step.view"; step: StepId; mode: Mode; role: Role }
  | {
      type: "wizard.step.complete";
      step: StepId;
      mode: Mode;
      role: Role;
      durationMs: number;
    }
  | {
      type: "wizard.validation.fail";
      step: StepId;
      field: string;
      severity: ValidationSeverity;
      mode: Mode;
    }
  | { type: "wizard.upload.start"; tempId: string; mimeType: string; size: number }
  | {
      type: "wizard.upload.fail";
      tempId: string;
      error: string;
      retryCount: number;
    }
  | { type: "wizard.upload.success"; tempId: string }
  | { type: "wizard.submit.start"; mode: Mode; role: Role }
  | { type: "wizard.submit.success"; mode: Mode; role: Role; durationMs: number }
  | { type: "wizard.submit.failure"; mode: Mode; role: Role; error: string }
  | { type: "wizard.abandon"; step: StepId; isDirty: boolean; mode: Mode };

export type AnalyticsSink = (event: WorkforceAnalyticsEvent) => void;

const noopSink: AnalyticsSink = () => {};

let currentSink: AnalyticsSink = (event) => {
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[workforce-profile]", event);
  }
};

export function setAnalyticsSink(sink: AnalyticsSink | null) {
  currentSink = sink ?? noopSink;
}

export function emitWorkforceEvent(event: WorkforceAnalyticsEvent) {
  try {
    currentSink(event);
  } catch {
    // Analytics must never throw into the wizard.
  }
}
