"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Mode,
  Role,
  StepConfig,
  StepId,
} from "../types/wizard.types";
import type { WizardContextValue } from "../engine/WizardContext";
import type { ValidationResult } from "../types/validation.types";
import { useWizardNavigation } from "./useWizardNavigation";
import { useDirtyState } from "./useDirtyState";
import { useWorkforceValidation, type ValidationRule } from "./useWorkforceValidation";
import { useWizardFeedbackOverlay } from "./useWizardFeedbackOverlay";
import { useWorkforceAnalytics } from "./useWorkforceAnalytics";
import { useWorkforceAsyncState, type LoadFn } from "./useWorkforceAsyncState";
import { useWorkforceSubmit } from "../submit/useWorkforceSubmit";
import type { StrategyResult } from "../submit/strategies";
import { useWorkforceStore } from "../state/workforce.store";
import { mapToFormState, type WorkforceSource } from "../services/mapper";

export type UseWorkforceFormOptions = {
  mode: Mode;
  role: Role;
  id?: string;
  load?: LoadFn<WorkforceSource>;
  customSteps?: StepConfig[];
  initialStep?: StepId;
  rules?: ValidationRule[];
  enableUnloadGuard?: boolean;
  onSubmitSuccess?: (result: StrategyResult) => void;
};

export function useWorkforceForm(
  opts: UseWorkforceFormOptions,
): WizardContextValue & { refresh: () => Promise<void> } {
  const {
    mode,
    role,
    id,
    load,
    customSteps,
    initialStep,
    rules,
    enableUnloadGuard,
    onSubmitSuccess,
  } = opts;

  const nav = useWizardNavigation(mode, customSteps, initialStep);
  const analytics = useWorkforceAnalytics({ mode, role });
  const validation = useWorkforceValidation({ mode, rules });
  const dirty = useDirtyState({ enableUnloadGuard });

  const hydrate = useWorkforceStore((s) => s.hydrate);
  const resetStore = useWorkforceStore((s) => s.reset);

  const [candidateId, setCandidateId] = useState<string | null>(id ? String(id) : null);

  const resolveCandidateId = useCallback((data: WorkforceSource): string | null => {
    if (!data) return id ? String(id) : null;
    const raw = (data as { id?: string; _id?: string }).id ?? (data as { _id?: string })._id;
    return raw ? String(raw) : id ? String(id) : null;
  }, [id]);

  const noopLoad: LoadFn<WorkforceSource> = useCallback(async () => null, []);
  const noopSave = useCallback(async () => null as never, []);

  const handleLoaded = useCallback(
    (data: WorkforceSource) => {
      setCandidateId(resolveCandidateId(data));
      hydrate(mapToFormState(data));
    },
    [hydrate, resolveCandidateId],
  );

  const asyncState = useWorkforceAsyncState<WorkforceSource, never, never>({
    load: load ?? noopLoad,
    save: noopSave as never,
    onLoaded: handleLoaded,
  });

  const asyncLoad = asyncState.load;

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { overlay: validationOverlay, showError, dismiss } = useWizardFeedbackOverlay();

  // A blocked save used to be silent: the offending field could sit on another
  // step with nothing pointing at it. Jump there, say how many, focus the field.
  const handleValidationError = useCallback(
    (result: ValidationResult) => {
      const errors = result.issues.filter((i) => i.severity === "error");
      const first = errors[0];
      if (!first) return;
      const description =
        errors.length === 1
          ? first.message
          : `${errors.length} fields need attention. First: ${first.message}`;
      showError("Can't save yet", description);
      nav.setStepById(first.section);
      if (typeof document === "undefined") return;
      const domId = first.field.split(".").pop()?.replace(/\[\]$/, "");
      if (!domId) return;
      // Let the target step render before moving focus into it.
      window.requestAnimationFrame(() => {
        const el = document.getElementById(domId);
        if (el instanceof HTMLElement) {
          el.focus();
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      });
    },
    [nav, showError],
  );

  const handleSubmitSuccess = useCallback(
    (result: StrategyResult) => {
      // Re-hydrate from the server response so flags like profilePictureRemoved
      // reset and the store matches what PATCH returned (avatar, name, etc.).
      if (result.candidate) {
        const next = result.candidate as WorkforceSource;
        setCandidateId(resolveCandidateId(next));
        hydrate(mapToFormState(next));
        useWorkforceStore.getState().commitSnapshot();
      }
      onSubmitSuccess?.(result);
    },
    [hydrate, onSubmitSuccess, resolveCandidateId],
  );

  const submitter = useWorkforceSubmit({
    mode,
    role,
    id,
    dirty: dirty.dirtySections,
    validate: validation.validateAll,
    analytics,
    onSuccess: handleSubmitSuccess,
    onValidationError: handleValidationError,
  });

  useEffect(() => {
    if (!load) return;
    void asyncLoad(id);
  }, [load, id, asyncLoad]);

  const submit = useCallback(async (): Promise<void> => {
    setSubmitAttempted(true);
    dismiss();
    await submitter.submit();
  }, [submitter, dismiss]);

  const goNext = useCallback(() => {
    setSubmitAttempted(true);
    const result = validation.validateStep(nav.currentStep);
    if (result.hasErrors) {
      handleValidationError(result);
      return;
    }
    nav.setStepByIndex(nav.currentIndex + 1);
  }, [validation, nav, handleValidationError]);

  const clearSaveError = useCallback(() => {
    submitter.clearSubmitError();
  }, [submitter]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!load) return;
    await asyncLoad(id);
  }, [load, id, asyncLoad]);

  const ctx: WizardContextValue = useMemo(
    () => ({
      mode,
      role,
      candidateId,
      steps: nav.steps,
      currentStep: nav.currentStep,
      currentIndex: nav.currentIndex,
      setStepById: nav.setStepById,
      setStepByIndex: nav.setStepByIndex,

      isLoading: asyncState.isLoading,
      isSaving: submitter.isSubmitting,
      loadError: asyncState.loadError?.message ?? null,
      // asyncState.save is a no-op here; the real save runs through `submitter`,
      // so its error is the one the user needs to see.
      saveError: submitter.submitError,
      clearSaveError,

      isDirty: dirty.isDirty,
      dirtySections: dirty.dirtySections,
      resetDirty: resetStore,

      issues: validation.issues,
      issuesByField: validation.issuesByField,
      issuesBySection: validation.issuesBySection,
      submitAttempted,

      validationOverlay,
      dismissValidationOverlay: dismiss,
      submit,
      goNext,
      refreshProfile: refresh,
    }),
    [
      mode,
      role,
      candidateId,
      nav.steps,
      nav.currentStep,
      nav.currentIndex,
      nav.setStepById,
      nav.setStepByIndex,
      asyncState.isLoading,
      asyncState.loadError,
      submitter.isSubmitting,
      submitter.submitError,
      clearSaveError,
      dirty.isDirty,
      dirty.dirtySections,
      resetStore,
      validation.issues,
      validation.issuesByField,
      validation.issuesBySection,
      submitAttempted,
      validationOverlay,
      dismiss,
      submit,
      goNext,
      refresh,
    ],
  );

  return { ...ctx, refresh };
}
