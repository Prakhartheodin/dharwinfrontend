"use client";

import { useCallback, useMemo, useState } from "react";
import type { Mode, StepConfig, StepId } from "../types/wizard.types";

const DEFAULT_STEPS: StepConfig[] = [
  {
    id: "personal-info",
    title: "Personal Info",
    icon: "ri-user-3-line",
    visibleIn: [
      "create-admin",
      "edit-admin",
      "self-service-employee",
      "self-service-candidate",
    ],
  },
  {
    id: "qualification",
    title: "Qualification",
    icon: "ri-graduation-cap-line",
    visibleIn: [
      "create-admin",
      "edit-admin",
      "self-service-employee",
      "self-service-candidate",
    ],
  },
  {
    id: "work-experience",
    title: "Work Experience",
    icon: "ri-briefcase-line",
    visibleIn: [
      "create-admin",
      "edit-admin",
      "self-service-employee",
      "self-service-candidate",
    ],
  },
  {
    id: "documents",
    title: "Documents",
    icon: "ri-file-list-3-line",
    visibleIn: [
      "create-admin",
      "edit-admin",
      "self-service-employee",
      "self-service-candidate",
    ],
  },
  {
    id: "salary",
    title: "Salary Slips",
    icon: "ri-money-dollar-circle-line",
    visibleIn: ["create-admin", "edit-admin", "self-service-employee"],
  },
];

export function useWizardNavigation(
  mode: Mode,
  customSteps?: StepConfig[],
  initialStep: StepId = "personal-info",
) {
  const allSteps = customSteps ?? DEFAULT_STEPS;
  const steps = useMemo(
    () => allSteps.filter((s) => s.visibleIn.includes(mode)),
    [allSteps, mode],
  );

  const [currentStep, setCurrentStep] = useState<StepId>(initialStep);
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === currentStep),
  );

  const setStepById = useCallback(
    (id: StepId) => {
      if (steps.some((s) => s.id === id)) setCurrentStep(id);
    },
    [steps],
  );

  const setStepByIndex = useCallback(
    (index: number) => {
      const safe = Math.max(0, Math.min(steps.length - 1, index));
      const target = steps[safe];
      if (target) setCurrentStep(target.id);
    },
    [steps],
  );

  return { steps, currentStep, currentIndex, setStepById, setStepByIndex };
}
