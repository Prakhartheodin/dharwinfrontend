"use client";

import { useCallback, useMemo } from "react";
import type { Mode, StepId } from "../types/wizard.types";
import type {
  ValidationIssue,
  ValidationResult,
  ValidationSeverity,
} from "../types/validation.types";
import type { WorkforceFormState } from "../types/workforce.types";
import { useShallow } from "zustand/react/shallow";
import { useWorkforceStore, selectFormState } from "../state/workforce.store";

export type ValidationRule = {
  field: string;
  section: StepId;
  severity?: ValidationSeverity;
  test: (state: WorkforceFormState, mode: Mode) => string | null;
  appliesTo?: Mode[];
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const yearRegex = /^\d{4}$/;

export const DEFAULT_RULES: ValidationRule[] = [
  {
    field: "personalInfo.fullName",
    section: "personal-info",
    test: (s) => (s.personalInfo.fullName.trim() ? null : "Full name is required"),
  },
  {
    field: "personalInfo.email",
    section: "personal-info",
    appliesTo: ["create-admin", "edit-admin"],
    test: (s) => {
      const v = s.personalInfo.email.trim();
      if (!v) return "Email is required";
      if (!emailRegex.test(v)) return "Email is invalid";
      return null;
    },
  },
  {
    field: "personalInfo.phoneNumber",
    section: "personal-info",
    test: (s) =>
      s.personalInfo.phoneNumber.trim() ? null : "Phone number is required",
  },
  {
    field: "personalInfo.password",
    section: "personal-info",
    appliesTo: ["create-admin"],
    test: (s) => {
      const v = s.personalInfo.password;
      if (!v) return "Password is required";
      if (v.length < 8) return "Password must be at least 8 characters";
      return null;
    },
  },
  {
    field: "personalInfo.visaType",
    section: "personal-info",
    severity: "warning",
    test: (s) =>
      s.personalInfo.visaType.trim() ? null : "Visa type not provided",
  },
  {
    field: "qualification.educations",
    section: "qualification",
    severity: "warning",
    test: (s) =>
      s.qualification.educations.length > 0
        ? null
        : "Add at least one qualification",
  },
  {
    field: "qualification.educations[].startYear",
    section: "qualification",
    test: (s) => {
      const bad = s.qualification.educations.find(
        (e) => e.startYear && !yearRegex.test(e.startYear),
      );
      return bad ? "Start year must be a 4-digit year" : null;
    },
  },
  {
    field: "qualification.educations[].endYear",
    section: "qualification",
    test: (s) => {
      const bad = s.qualification.educations.find(
        (e) => e.endYear && !yearRegex.test(e.endYear),
      );
      return bad ? "End year must be a 4-digit year" : null;
    },
  },
  {
    field: "experience.experiences[].endDate",
    section: "work-experience",
    test: (s) => {
      const bad = s.experience.experiences.find(
        (x) =>
          !x.currentlyWorking &&
          x.startDate &&
          x.endDate &&
          x.endDate < x.startDate,
      );
      return bad ? "End date must be after start date" : null;
    },
  },
  {
    field: "documents",
    section: "documents",
    severity: "info",
    test: (s) =>
      s.documents.documents.length > 0 ? null : "No documents uploaded yet",
  },
];

function runRules(
  state: WorkforceFormState,
  mode: Mode,
  rules: ValidationRule[],
  filter?: { section?: StepId },
): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  for (const rule of rules) {
    if (rule.appliesTo && !rule.appliesTo.includes(mode)) continue;
    if (filter?.section && rule.section !== filter.section) continue;
    const msg = rule.test(state, mode);
    if (msg) {
      out.push({
        field: rule.field,
        message: msg,
        severity: rule.severity ?? "error",
        section: rule.section,
      });
    }
  }
  return out;
}

export type UseWorkforceValidationOptions = {
  mode: Mode;
  rules?: ValidationRule[];
};

export function useWorkforceValidation(opts: UseWorkforceValidationOptions) {
  const { mode } = opts;
  const rules = opts.rules ?? DEFAULT_RULES;

  const state = useWorkforceStore(useShallow(selectFormState));

  const issues = useMemo(() => runRules(state, mode, rules), [state, mode, rules]);

  const issuesByField = useMemo(() => {
    const map: Record<string, ValidationIssue[]> = {};
    for (const issue of issues) {
      if (!map[issue.field]) map[issue.field] = [];
      map[issue.field].push(issue);
    }
    return map;
  }, [issues]);

  const issuesBySection = useMemo(() => {
    const map: Partial<Record<StepId, ValidationIssue[]>> = {};
    for (const issue of issues) {
      const arr = map[issue.section] ?? [];
      arr.push(issue);
      map[issue.section] = arr;
    }
    return map;
  }, [issues]);

  const validateAll = useCallback((): ValidationResult => {
    const all = runRules(state, mode, rules);
    return { issues: all, hasErrors: all.some((i) => i.severity === "error") };
  }, [state, mode, rules]);

  const validateStep = useCallback(
    (section: StepId): ValidationResult => {
      const list = runRules(state, mode, rules, { section });
      return { issues: list, hasErrors: list.some((i) => i.severity === "error") };
    },
    [state, mode, rules],
  );

  return {
    issues,
    issuesByField,
    issuesBySection,
    validateAll,
    validateStep,
  };
}
