/**
 * Single source of truth for project create/edit form fields.
 * Used by DynamicProjectForm to render inputs.
 */

export type ProjectFormFieldType =
  | "text"
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
  colSpan?: 4 | 6 | 12; // grid cols: 4 = xl:col-span-4, etc.
  /** For select/multiselect: option list key or inline options */
  options?: SelectOption[];
  /** Max items for tags (creatable) or file */
  maxItems?: number;
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
    placeholder: "Project Manager Name",
    colSpan: 4,
  },
  {
    name: "clientStakeholder",
    label: "Client / Stakeholder",
    type: "text",
    placeholder: "Enter Client Name",
    colSpan: 4,
  },
  {
    name: "description",
    label: "Project Description",
    type: "richtext",
    placeholder: "Enter project description...",
    colSpan: 12,
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
    name: "assignedTo",
    label: "Assigned To",
    type: "multiselect",
    colSpan: 6,
    // options passed from parent (e.g. users list)
  },
  {
    name: "tags",
    label: "Tags",
    type: "tags",
    placeholder: "Type something and press enter...",
    colSpan: 6,
  },
  {
    name: "attachments",
    label: "Attachments",
    type: "file",
    colSpan: 12,
    maxItems: 3,
  },
];
