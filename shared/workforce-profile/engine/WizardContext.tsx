"use client";

import React, { createContext, useContext } from "react";
import type { Mode, Role, StepId, StepConfig } from "../types/wizard.types";
import type { ValidationIssue } from "../types/validation.types";

export type WizardContextValue = {
  mode: Mode;
  role: Role;
  steps: StepConfig[];
  currentStep: StepId;
  currentIndex: number;
  setStepById: (id: StepId) => void;
  setStepByIndex: (index: number) => void;

  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
  saveError: string | null;

  isDirty: boolean;
  dirtySections: Partial<Record<StepId, boolean>>;
  resetDirty: () => void;

  issues: ValidationIssue[];
  issuesByField: Record<string, ValidationIssue[]>;

  submit: () => Promise<void>;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export const WizardProvider = WizardContext.Provider;

export function useWizardContext(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error(
      "useWizardContext must be used inside <WizardProvider> (workforce-profile engine)",
    );
  }
  return ctx;
}
