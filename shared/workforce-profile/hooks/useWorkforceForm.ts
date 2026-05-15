"use client";

import { useCallback, useEffect, useMemo } from "react";
import type {
  Mode,
  Role,
  StepConfig,
  StepId,
} from "../types/wizard.types";
import type { WizardContextValue } from "../engine/WizardContext";
import { useWizardNavigation } from "./useWizardNavigation";
import { useDirtyState } from "./useDirtyState";
import { useWorkforceValidation, type ValidationRule } from "./useWorkforceValidation";
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

  const noopLoad: LoadFn<WorkforceSource> = useCallback(async () => null, []);
  const noopSave = useCallback(async () => null as never, []);

  const handleLoaded = useCallback(
    (data: WorkforceSource) => {
      hydrate(mapToFormState(data));
    },
    [hydrate],
  );

  const asyncState = useWorkforceAsyncState<WorkforceSource, never, never>({
    load: load ?? noopLoad,
    save: noopSave as never,
    onLoaded: handleLoaded,
  });

  const asyncLoad = asyncState.load;

  const submitter = useWorkforceSubmit({
    mode,
    role,
    id,
    dirty: dirty.dirtySections,
    validate: validation.validateAll,
    analytics,
    onSuccess: onSubmitSuccess,
  });

  useEffect(() => {
    if (!load) return;
    void asyncLoad(id);
  }, [load, id, asyncLoad]);

  const submit = useCallback(async (): Promise<void> => {
    await submitter.submit();
  }, [submitter]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!load) return;
    await asyncLoad(id);
  }, [load, id, asyncLoad]);

  const ctx: WizardContextValue = useMemo(
    () => ({
      mode,
      role,
      steps: nav.steps,
      currentStep: nav.currentStep,
      currentIndex: nav.currentIndex,
      setStepById: nav.setStepById,
      setStepByIndex: nav.setStepByIndex,

      isLoading: asyncState.isLoading,
      isSaving: submitter.isSubmitting,
      loadError: asyncState.loadError?.message ?? null,
      saveError: asyncState.saveError?.message ?? null,

      isDirty: dirty.isDirty,
      dirtySections: dirty.dirtySections,
      resetDirty: resetStore,

      issues: validation.issues,
      issuesByField: validation.issuesByField,

      submit,
    }),
    [
      mode,
      role,
      nav.steps,
      nav.currentStep,
      nav.currentIndex,
      nav.setStepById,
      nav.setStepByIndex,
      asyncState.isLoading,
      asyncState.loadError,
      asyncState.saveError,
      submitter.isSubmitting,
      dirty.isDirty,
      dirty.dirtySections,
      resetStore,
      validation.issues,
      validation.issuesByField,
      submit,
    ],
  );

  return { ...ctx, refresh };
}
