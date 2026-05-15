"use client";

import { useCallback, useRef } from "react";
import type { Mode, Role } from "../types/wizard.types";
import { useWorkforceStore, selectFormState } from "../state/workforce.store";
import type { ValidationResult } from "../types/validation.types";
import type { DirtyMap } from "../services/payload";
import {
  getSubmitStrategy,
  type StrategyResult,
} from "./strategies";
import type { WorkforceAnalyticsApi } from "../hooks/useWorkforceAnalytics";

export type UseWorkforceSubmitOptions = {
  mode: Mode;
  role: Role;
  id?: string;
  dirty?: DirtyMap;
  validate: () => ValidationResult;
  analytics: WorkforceAnalyticsApi;
  onSuccess?: (result: StrategyResult) => void;
  onValidationError?: (result: ValidationResult) => void;
};

export type UseWorkforceSubmitReturn = {
  submit: () => Promise<StrategyResult | null>;
  isSubmitting: boolean;
};

export function useWorkforceSubmit(
  opts: UseWorkforceSubmitOptions,
): UseWorkforceSubmitReturn {
  const { mode, role, id, dirty, validate, analytics, onSuccess, onValidationError } = opts;
  const submittingRef = useRef(false);
  const commitSnapshot = useWorkforceStore((s) => s.commitSnapshot);

  const submit = useCallback(async (): Promise<StrategyResult | null> => {
    if (submittingRef.current) return null;

    const result = validate();
    if (result.hasErrors) {
      for (const issue of result.issues) {
        if (issue.severity === "error") {
          analytics.trackValidationFail(issue.section, issue.field, issue.severity);
        }
      }
      onValidationError?.(result);
      return null;
    }

    submittingRef.current = true;
    const startedAt = Date.now();
    analytics.trackSubmitStart();

    try {
      const strategy = getSubmitStrategy({ mode, role, id });
      const state = selectFormState(useWorkforceStore.getState());
      const outcome = await strategy.run({ state, dirty });
      analytics.trackSubmitSuccess(Date.now() - startedAt);
      commitSnapshot();
      onSuccess?.(outcome);
      return outcome;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submit failed";
      analytics.trackSubmitFailure(message);
      throw err;
    } finally {
      submittingRef.current = false;
    }
  }, [
    mode,
    role,
    id,
    dirty,
    validate,
    analytics,
    onSuccess,
    onValidationError,
    commitSnapshot,
  ]);

  return { submit, isSubmitting: submittingRef.current };
}
