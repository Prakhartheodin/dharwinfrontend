import type { StepId } from "./wizard.types";

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationIssue = {
  field: string;
  message: string;
  severity: ValidationSeverity;
  section: StepId;
};

export type ValidationResult = {
  issues: ValidationIssue[];
  hasErrors: boolean;
};
