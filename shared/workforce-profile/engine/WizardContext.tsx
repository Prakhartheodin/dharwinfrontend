"use client";

import React, { createContext, useContext } from "react";
import type { Mode, Role, StepId, StepConfig } from "../types/wizard.types";
import type { ValidationIssue } from "../types/validation.types";
import type { WizardFeedbackOverlayState } from "../hooks/useWizardFeedbackOverlay";

export type WizardContextValue = {
  mode: Mode;
  role: Role;
  /** Linked candidate/employee record id for document version APIs. */
  candidateId: string | null;
  steps: StepConfig[];
  currentStep: StepId;
  currentIndex: number;
  setStepById: (id: StepId) => void;
  setStepByIndex: (index: number) => void;

  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
  saveError: string | null;
  clearSaveError: () => void;

  isDirty: boolean;
  dirtySections: Partial<Record<StepId, boolean>>;
  resetDirty: () => void;

  issues: ValidationIssue[];
  issuesByField: Record<string, ValidationIssue[]>;
  /** Errors grouped per step, so the step nav can flag where the problem is. */
  issuesBySection: Partial<Record<StepId, ValidationIssue[]>>;
  /** True once Save was pressed — fields stop hiding their errors after that. */
  submitAttempted: boolean;

  /** Centered overlay for blocking validation feedback (replaces top banner). */
  validationOverlay: WizardFeedbackOverlayState;
  dismissValidationOverlay: () => void;

  submit: () => Promise<void>;
  goNext: () => void;
  /** Reload profile from server (e.g. after versioned document upload/delete). */
  refreshProfile: () => Promise<void>;
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
