/**
 * Single source of truth for project create/edit form fields.
 * Used by DynamicProjectForm to render inputs.
 */

export type ProjectFormFieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "date"
  | "richtext"
  | "tags"
  | "file";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface ProjectFormFieldConfig {
  name: string;
  label: string;
  type: ProjectFormFieldType;
  required?: boolean;
  placeholder?: string;
  /** Shown under the label (muted) — clarifies free-text vs user links, etc. */
  helpText?: string;
  colSpan?: 4 | 6 | 12; // grid cols: 4 = xl:col-span-4, etc.
  /** For select/multiselect: option list key or inline options */
  options?: SelectOption[];
  /** Max items for tags (creatable) or file */
  maxItems?: number;
  /** Rows for textarea */
  rows?: number;
  /** When true, field is part of optional “intake” block toggled in the form */
  intake?: boolean;
}

export const PROJECT_STATUS_OPTIONS: SelectOption[] = [
  { value: "Inprogress", label: "Inprogress" },
  { value: "On hold", label: "On hold" },
  { value: "completed", label: "completed" },
];

export const PROJECT_PRIORITY_OPTIONS: SelectOption[] = [
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

export const PROJECT_FORM_FIELDS: ProjectFormFieldConfig[] = [
  {
    name: "name",
    label: "Project Name",
    type: "text",
    required: true,
    placeholder: "Enter Project Name",
    colSpan: 4,
  },
  {
    name: "projectManager",
    label: "Project Manager",
    type: "text",
    placeholder: "e.g. Jane Doe",
    helpText: "Free-text label on the project card — not linked to a user account.",
    colSpan: 4,
  },
  {
    name: "clientStakeholder",
    label: "Client / Stakeholder",
    type: "text",
    placeholder: "Organization or sponsor name",
    helpText: "Free-text for who owns outcomes — not a user picker.",
    colSpan: 4,
  },
  {
    name: "description",
    label: "Scope & narrative",
    type: "richtext",
    placeholder: "Goals, scope, links, constraints worth highlighting in prose…",
    helpText:
      "Rich text is stored on the project. Optional guided questions (above) append structured answers for search and PM assistant.",
    colSpan: 12,
  },
  {
    name: "intakeSuccess",
    label: "What does “done” look like?",
    type: "textarea",
    placeholder: "e.g. MVP live in UAT, sign-off from sponsor, training delivered…",
    helpText: "Optional — appended to the stored description for search and AI context.",
    colSpan: 12,
    rows: 3,
    intake: true,
  },
  {
    name: "intakeConstraints",
    label: "Constraints, risks, or dependencies",
    type: "textarea",
    placeholder: "Budget, compliance, vendor lead times, critical path…",
    colSpan: 12,
    rows: 3,
    intake: true,
  },
  {
    name: "intakeMilestones",
    label: "Key milestones or phases",
    type: "textarea",
    placeholder: "e.g. Discovery → Build → UAT → Go-live",
    colSpan: 12,
    rows: 3,
    intake: true,
  },
  {
    name: "startDate",
    label: "Start Date",
    type: "date",
    colSpan: 6,
  },
  {
    name: "endDate",
    label: "End Date",
    type: "date",
    colSpan: 6,
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: PROJECT_STATUS_OPTIONS,
    placeholder: "Inprogress",
    colSpan: 6,
  },
  {
    name: "priority",
    label: "Priority",
    type: "select",
    options: PROJECT_PRIORITY_OPTIONS,
    placeholder: "High",
    colSpan: 6,
  },
  {
    name: "assignedTeams",
    label: "Project team(s)",
    type: "multiselect",
    colSpan: 6,
    helpText: "Squads from Team directory — shown on the project and used for AI roster flows.",
  },
  {
    name: "assignedUsers",
    label: "Assigned people",
    type: "multiselect",
    colSpan: 6,
    helpText: "Users who appear as project assignees (separate from teams).",
  },
  {
    name: "tags",
    label: "Tags",
    type: "tags",
    placeholder: "Type something and press enter...",
    colSpan: 12,
  },
];
