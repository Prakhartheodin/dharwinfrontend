export { EmployeeProfileWizard } from "./adapters/EmployeeProfileWizard";
export type { EmployeeProfileWizardProps } from "./adapters/EmployeeProfileWizard";

export { WorkforceWizardShell } from "./engine/WorkforceWizardShell";
export { WizardProvider, useWizardContext } from "./engine/WizardContext";
export type { WizardContextValue } from "./engine/WizardContext";

export { useWorkforceForm } from "./hooks/useWorkforceForm";
export type { UseWorkforceFormOptions } from "./hooks/useWorkforceForm";
export { useWorkforceValidation, DEFAULT_RULES } from "./hooks/useWorkforceValidation";
export type { ValidationRule } from "./hooks/useWorkforceValidation";
export { useWorkforceAnalytics, useStepViewLifecycle } from "./hooks/useWorkforceAnalytics";
export type { WorkforceAnalyticsApi } from "./hooks/useWorkforceAnalytics";
export { useWorkforceAsyncState } from "./hooks/useWorkforceAsyncState";
export type {
  AsyncErrorState,
  AsyncConflict,
  LoadFn,
  SaveFn,
} from "./hooks/useWorkforceAsyncState";
export { useWizardNavigation } from "./hooks/useWizardNavigation";
export { useDirtyState } from "./hooks/useDirtyState";

export { useWorkforceStore, selectFormState } from "./state/workforce.store";
export type { WorkforceStoreState } from "./state/workforce.store";

export { mapToFormState } from "./services/mapper";
export type { WorkforceSource } from "./services/mapper";
export { normalize } from "./services/normalizer";
export { toCandidatePayload, toSelfServicePayload } from "./services/payload";
export type { DirtyMap } from "./services/payload";
export {
  emptyWorkforceFormState,
  emptyPersonalInfo,
  emptyQualification,
  emptyExperience,
  emptyDocuments,
  emptySalary,
} from "./services/schema";
export { WORKFORCE_SCHEMA_VERSION, migrateToCurrent } from "./services/version";
export { emitWorkforceEvent, setAnalyticsSink } from "./services/analytics";
export type {
  WorkforceAnalyticsEvent,
  AnalyticsSink,
} from "./services/analytics";

export { getSubmitStrategy } from "./submit/strategies";
export type {
  SubmitStrategy,
  StrategyKind,
  StrategyResult,
  StrategyContext,
  GetStrategyArgs,
} from "./submit/strategies";
export { useWorkforceSubmit } from "./submit/useWorkforceSubmit";

export { useDocumentUpload } from "./resources/useDocumentUpload";
export type { UploadFn, UseDocumentUploadReturn } from "./resources/useDocumentUpload";

export * from "./types/wizard.types";
export * from "./types/validation.types";
export * from "./types/workforce.types";
export * from "./types/resource.types";

export {
  PersonalInfoStep,
  QualificationStep,
  ExperienceStep,
  DocumentsStep,
  SalaryStep,
} from "./steps";
