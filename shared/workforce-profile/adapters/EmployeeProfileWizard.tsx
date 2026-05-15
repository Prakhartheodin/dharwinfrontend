"use client";

import React, { useMemo } from "react";
import { getCandidate } from "@/shared/lib/api/employees";
import { getMeWithCandidate } from "@/shared/lib/api/auth";
import { WizardProvider } from "../engine/WizardContext";
import { WorkforceWizardShell } from "../engine/WorkforceWizardShell";
import { useWorkforceForm } from "../hooks/useWorkforceForm";
import type { Mode, Role } from "../types/wizard.types";
import type { LoadFn } from "../hooks/useWorkforceAsyncState";
import type { WorkforceSource } from "../services/mapper";
import type { StrategyResult } from "../submit/strategies";
import {
  PersonalInfoStep,
  QualificationStep,
  ExperienceStep,
  DocumentsStep,
  SalaryStep,
} from "../steps";

export type EmployeeProfileWizardProps = {
  mode: Mode;
  id?: string;
  role?: Role;
  submitLabel?: string;
  header?: React.ReactNode;
  onSubmitSuccess?: (result: StrategyResult) => void;
};

function pickLoader(mode: Mode): LoadFn<WorkforceSource> | undefined {
  switch (mode) {
    case "edit-admin":
      return async (id) =>
        id ? ((await getCandidate(id)) as WorkforceSource) : null;
    case "self-service-employee":
    case "self-service-candidate":
      return async () => {
        const me = await getMeWithCandidate();
        return (me?.candidate ?? null) as WorkforceSource;
      };
    case "create-admin":
    default:
      return undefined;
  }
}

export function EmployeeProfileWizard(props: EmployeeProfileWizardProps) {
  const { mode, id, role = "employee", submitLabel, header, onSubmitSuccess } = props;
  const load = useMemo(() => pickLoader(mode), [mode]);

  const ctx = useWorkforceForm({
    mode,
    role,
    id,
    load,
    onSubmitSuccess,
  });

  const stepRender = {
    "personal-info": <PersonalInfoStep />,
    qualification: <QualificationStep />,
    "work-experience": <ExperienceStep />,
    documents: <DocumentsStep />,
    salary: <SalaryStep />,
  } as const;

  const resolvedSubmitLabel =
    submitLabel ??
    (mode === "create-admin"
      ? "Create"
      : mode === "edit-admin"
        ? "Save Changes"
        : "Update Profile");

  return (
    <WizardProvider value={ctx}>
      {ctx.isLoading ? (
        <div className="p-6 text-sm text-gray-500">Loading profile…</div>
      ) : null}
      {ctx.loadError ? (
        <div className="p-6 text-sm text-danger" role="alert">
          {ctx.loadError}
        </div>
      ) : null}
      <WorkforceWizardShell
        stepRender={stepRender}
        submitLabel={resolvedSubmitLabel}
        header={header}
      />
    </WizardProvider>
  );
}
