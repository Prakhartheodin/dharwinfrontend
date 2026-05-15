"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Mode, Role, StepId } from "../types/wizard.types";
import type { ValidationSeverity } from "../types/validation.types";
import {
  emitWorkforceEvent,
  type WorkforceAnalyticsEvent,
} from "../services/analytics";

export type UseWorkforceAnalyticsOptions = {
  mode: Mode;
  role: Role;
};

export function useWorkforceAnalytics(opts: UseWorkforceAnalyticsOptions) {
  const { mode, role } = opts;

  const emit = useCallback(
    (event: WorkforceAnalyticsEvent) => emitWorkforceEvent(event),
    [],
  );

  const trackStepView = useCallback(
    (step: StepId) => emit({ type: "wizard.step.view", step, mode, role }),
    [emit, mode, role],
  );

  const trackStepComplete = useCallback(
    (step: StepId, durationMs: number) =>
      emit({ type: "wizard.step.complete", step, mode, role, durationMs }),
    [emit, mode, role],
  );

  const trackValidationFail = useCallback(
    (step: StepId, field: string, severity: ValidationSeverity) =>
      emit({
        type: "wizard.validation.fail",
        step,
        field,
        severity,
        mode,
      }),
    [emit, mode],
  );

  const trackUploadStart = useCallback(
    (tempId: string, mimeType: string, size: number) =>
      emit({ type: "wizard.upload.start", tempId, mimeType, size }),
    [emit],
  );

  const trackUploadSuccess = useCallback(
    (tempId: string) => emit({ type: "wizard.upload.success", tempId }),
    [emit],
  );

  const trackUploadFail = useCallback(
    (tempId: string, error: string, retryCount: number) =>
      emit({ type: "wizard.upload.fail", tempId, error, retryCount }),
    [emit],
  );

  const trackSubmitStart = useCallback(
    () => emit({ type: "wizard.submit.start", mode, role }),
    [emit, mode, role],
  );

  const trackSubmitSuccess = useCallback(
    (durationMs: number) =>
      emit({ type: "wizard.submit.success", mode, role, durationMs }),
    [emit, mode, role],
  );

  const trackSubmitFailure = useCallback(
    (error: string) =>
      emit({ type: "wizard.submit.failure", mode, role, error }),
    [emit, mode, role],
  );

  const trackAbandon = useCallback(
    (step: StepId, isDirty: boolean) =>
      emit({ type: "wizard.abandon", step, isDirty, mode }),
    [emit, mode],
  );

  return {
    emit,
    trackStepView,
    trackStepComplete,
    trackValidationFail,
    trackUploadStart,
    trackUploadSuccess,
    trackUploadFail,
    trackSubmitStart,
    trackSubmitSuccess,
    trackSubmitFailure,
    trackAbandon,
  };
}

export type WorkforceAnalyticsApi = ReturnType<typeof useWorkforceAnalytics>;

export function useStepViewLifecycle(
  step: StepId,
  api: WorkforceAnalyticsApi,
) {
  const startedAt = useRef<number>(0);

  useEffect(() => {
    startedAt.current = Date.now();
    api.trackStepView(step);
    return () => {
      api.trackStepComplete(step, Date.now() - startedAt.current);
    };
  }, [step, api]);
}
