"use client";

import React from "react";
import { useWizardContext } from "./WizardContext";
import { WizardStepTabs } from "./WizardStepTabs";
import { WizardFooter } from "./WizardFooter";
import type { StepId } from "../types/wizard.types";

type StepRender = Partial<Record<StepId, React.ReactNode>>;

type Props = {
  stepRender: StepRender;
  submitLabel?: string;
  header?: React.ReactNode;
  stickyFooter?: boolean;
};

export function WorkforceWizardShell({
  stepRender,
  submitLabel = "Submit",
  header,
  stickyFooter = true,
}: Props) {
  const {
    mode,
    steps,
    currentStep,
    currentIndex,
    setStepById,
    setStepByIndex,
    isSaving,
    saveError,
    isDirty,
    submit,
  } = useWizardContext();

  // In self-service modes the user is editing an existing profile, often a
  // single field. Expose Save on every step (disabled until dirty) instead of
  // forcing a Next-Next-Next walk to the last step.
  const alwaysShowSubmit =
    mode === "self-service-employee" || mode === "self-service-candidate";

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  const handleNext = () => setStepByIndex(currentIndex + 1);
  const handleBack = () => setStepByIndex(currentIndex - 1);

  const body = stepRender[currentStep] ?? (
    <div className="p-6 text-sm text-gray-500">
      Step "{currentStep}" not configured.
    </div>
  );

  return (
    <div className="relative">
      {header}
      <WizardStepTabs
        steps={steps}
        currentStep={currentStep}
        onSelect={setStepById}
      />
      <div className="min-h-[200px]">{body}</div>
      {saveError ? (
        <div className="px-6 pt-2 text-sm text-danger" role="alert">
          {saveError}
        </div>
      ) : null}
      <WizardFooter
        isFirst={isFirst}
        isLast={isLast}
        isSaving={isSaving}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={submit}
        submitLabel={submitLabel}
        sticky={stickyFooter}
        alwaysShowSubmit={alwaysShowSubmit}
        isDirty={isDirty}
      />
    </div>
  );
}
