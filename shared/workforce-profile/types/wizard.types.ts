export type Mode =
  | "create-admin"
  | "edit-admin"
  | "self-service-employee"
  | "self-service-candidate";

export type Role = "admin" | "recruiter" | "employee" | "candidate" | "user";

export type StepId =
  | "personal-info"
  | "qualification"
  | "work-experience"
  | "documents"
  | "salary";

export type StepConfig = {
  id: StepId;
  title: string;
  icon?: string;
  visibleIn: Mode[];
};
