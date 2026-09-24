"use client";

import { useCallback, useMemo } from "react";
import { getPhoneCountry, getPhoneValidationError } from "@/shared/lib/phoneCountries";
import { validateSocialLinkRows } from "@/shared/lib/socialLinks";
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
const todayISO = (): string => new Date().toISOString().slice(0, 10);

const educationRowUsed = (e: {
  degree: string;
  institute: string;
  location: string;
  startYear: string;
  endYear: string;
  description: string;
}) =>
  !!(
    e.degree.trim() ||
    e.institute.trim() ||
    e.location.trim() ||
    e.startYear.trim() ||
    e.endYear.trim() ||
    e.description.trim()
  );

const experienceRowUsed = (x: {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  description: string;
}) =>
  !!(
    x.company.trim() ||
    x.role.trim() ||
    x.startDate.trim() ||
    x.endDate.trim() ||
    x.description.trim() ||
    x.currentlyWorking
  );

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
    // The API only accepts national digits (^\d{6,15}$). Validating here turns
    // a server 400 into an inline message, and matches the legacy forms.
    test: (s) => {
      const v = s.personalInfo.phoneNumber.trim();
      if (!v) return "Phone number is required";
      // Own phone stays national digits for Joi; supervisor contact is E.164 separately.
      if (!/^\d+$/.test(v)) {
        return getPhoneCountry(s.personalInfo.countryCode).errorMessage;
      }
      return getPhoneValidationError(v, s.personalInfo.countryCode);
    },
  },
  {
    field: "personalInfo.supervisorContact",
    section: "personal-info",
    test: (s) =>
      getPhoneValidationError(
        s.personalInfo.supervisorContact,
        s.personalInfo.supervisorCountryCode || s.personalInfo.countryCode,
        { required: false },
      ),
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
    field: "personalInfo.socialLinks",
    section: "personal-info",
    test: (s) =>
      validateSocialLinkRows(
        s.personalInfo.socialLinks.map((link) => ({
          platform: link.platform,
          url: link.url,
        })),
      ),
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
      const missing = s.qualification.educations.find(
        (e) => educationRowUsed(e) && !e.startYear.trim(),
      );
      if (missing) return "Start year is required";
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
      const missing = s.qualification.educations.find(
        (e) => educationRowUsed(e) && !e.endYear.trim(),
      );
      if (missing) return "End year is required";
      const bad = s.qualification.educations.find(
        (e) => e.endYear && !yearRegex.test(e.endYear),
      );
      if (bad) return "End year must be a 4-digit year";
      const rangeBad = s.qualification.educations.find(
        (e) =>
          e.startYear &&
          e.endYear &&
          yearRegex.test(e.startYear) &&
          yearRegex.test(e.endYear) &&
          Number(e.startYear) > Number(e.endYear),
      );
      return rangeBad ? "End year must be on or after start year" : null;
    },
  },
  {
    field: "experience.experiences[].startDate",
    section: "work-experience",
    test: (s) => {
      const missing = s.experience.experiences.find(
        (x) => experienceRowUsed(x) && !x.startDate.trim(),
      );
      return missing ? "Start date is required" : null;
    },
  },
  {
    field: "experience.experiences[].endDate",
    section: "work-experience",
    test: (s) => {
      const missing = s.experience.experiences.find(
        (x) => experienceRowUsed(x) && !x.currentlyWorking && !x.endDate.trim(),
      );
      if (missing) return "End date is required";
      const rangeBad = s.experience.experiences.find(
        (x) =>
          !x.currentlyWorking &&
          x.startDate &&
          x.endDate &&
          x.endDate < x.startDate,
      );
      if (rangeBad) return "End date must be after start date";
      const futureBad = s.experience.experiences.find(
        (x) => x.endDate && x.endDate > todayISO(),
      );
      return futureBad ? "End date cannot be in the future" : null;
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
