/**
 * ADR-0042 — PM assistant shared contracts.
 */

export type ProjectType = "software" | "marketing" | "operations" | "research" | "design" | "other";

export type TeamSizeHint = "1-3" | "4-8" | "9+";

export type BreakdownConstraint =
  | "budget_cap"
  | "specific_people"
  | "fixed_tech_stack"
  | "regulatory_compliance"
  | "external_dependency"
  | "hard_deadline";

export interface BreakdownContext {
  projectType: ProjectType;
  /** ISO 8601 date, e.g. "2026-07-01" */
  deadline?: string;
  teamSizeHint?: TeamSizeHint;
  keyDeliverables?: string[];
  constraints?: BreakdownConstraint[];
  extraNotes?: string;
}

export type FeedbackOutcome = "approved" | "rejected" | "replaced";

export type RejectionReason =
  | "skill_gap"
  | "capacity"
  | "seniority_mismatch"
  | "preference"
  | "conflict_of_interest"
  | "other";

export interface AssignmentFeedbackItem {
  taskId: string;
  /** AI-suggested profile id (ATS candidate). */
  suggestedEmployeeId: string;
  outcome: FeedbackOutcome;
  replacedWithEmployeeId?: string;
  rejectionReason?: RejectionReason;
  note?: string;
}
