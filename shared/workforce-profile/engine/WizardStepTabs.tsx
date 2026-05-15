"use client";

import React from "react";
import type { StepConfig, StepId } from "../types/wizard.types";

type Props = {
  steps: StepConfig[];
  currentStep: StepId;
  onSelect: (id: StepId) => void;
};

export function WizardStepTabs({ steps, currentStep, onSelect }: Props) {
  return (
    <nav
      className="btn-group steps basicsteps overflow-x-auto"
      aria-label="Wizard steps"
    >
      {steps.map((step) => {
        const isActive = step.id === currentStep;
        const cls = [
          "btn",
          isActive ? "active" : "",
          "ti-btn ti-btn-primary-full text-white",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelect(step.id)}
            className={cls}
            aria-current={isActive ? "step" : undefined}
          >
            {step.icon ? <i className={`${step.icon} basicstep-icon`} /> : null}
            <span className="ml-2">{step.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
