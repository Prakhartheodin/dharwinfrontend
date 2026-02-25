"use client";

import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import TiptapEditor from "@/shared/data/forms/form-editors/tiptapeditor";
import { FilePond } from "react-filepond";
import CreatableSelect from "react-select/creatable";
import {
  PROJECT_FORM_FIELDS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  type ProjectFormFieldConfig,
  type SelectOption,
} from "@/shared/data/apps/projects/projectFormConfig";
import { multiselectdata } from "@/shared/data/apps/projects/createprojectdata";

const DatePicker = dynamic(() => import("react-datepicker"), { ssr: false });
const Select = dynamic(() => import("react-select"), { ssr: false });

export type ProjectFormValues = Record<
  string,
  | string
  | number
  | null
  | undefined
  | SelectOption
  | SelectOption[]
  | Date
  | unknown
>;

export interface DynamicProjectFormProps {
  values: ProjectFormValues;
  onChange: (name: string, value: unknown) => void;
  /** Options for Assigned To multiselect (default: multiselectdata from createprojectdata) */
  assignedToOptions?: SelectOption[];
  /** Field-level errors */
  errors?: Record<string, string>;
  /** File list for attachments (FilePond); parent controls state */
  attachmentFiles?: unknown[];
  onAttachmentFilesChange?: (files: unknown[]) => void;
  /** Disable all inputs (e.g. view mode) */
  disabled?: boolean;
}

const defaultAssignedToOptions = multiselectdata.map((o) => ({
  value: o.value,
  label: o.label,
}));

function getGridClass(colSpan: 4 | 6 | 12 = 6): string {
  return `xl:col-span-${colSpan} col-span-12`;
}

export function DynamicProjectForm({
  values,
  onChange,
  assignedToOptions = defaultAssignedToOptions,
  errors = {},
  attachmentFiles = [],
  onAttachmentFilesChange,
  disabled = false,
}: DynamicProjectFormProps) {
  const [tagInputValue, setTagInputValue] = useState("");

  const handleChange = useCallback(
    (name: string) => (value: unknown) => {
      onChange(name, value);
    },
    [onChange]
  );

  const renderField = (field: ProjectFormFieldConfig) => {
    const value = values[field.name];
    const error = errors[field.name];
    const colClass = getGridClass(field.colSpan);

    if (field.type === "text") {
      return (
        <div key={field.name} className={colClass}>
          <label htmlFor={field.name} className="form-label">
            {field.label}
            {field.required && " *"}
          </label>
          <input
            type="text"
            id={field.name}
            className={`form-control ${error ? "is-invalid" : ""}`}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => handleChange(field.name)(e.target.value)}
            disabled={disabled}
          />
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
      );
    }

    if (field.type === "select") {
      const options = field.options ?? [];
      const selectValue =
        typeof value === "object" && value !== null && "value" in value
          ? (value as SelectOption)
          : options.find((o) => o.value === value) ?? null;
      return (
        <div key={field.name} className={colClass}>
          <label className="form-label">
            {field.label}
            {field.required && " *"}
          </label>
          <Select
            name={field.name}
            options={options}
            className={`js-states ${error ? "is-invalid" : ""}`}
            classNamePrefix="Select2"
            placeholder={field.placeholder}
            value={selectValue}
            onChange={(opt) => handleChange(field.name)(opt)}
            isDisabled={disabled}
            menuPlacement="auto"
          />
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
      );
    }

    if (field.type === "multiselect") {
      const options = field.name === "assignedTo" ? assignedToOptions : (field.options ?? []);
      const multiValue = Array.isArray(value) ? (value as SelectOption[]) : [];
      return (
        <div key={field.name} className={colClass}>
          <label className="form-label">
            {field.label}
            {field.required && " *"}
          </label>
          <Select
            isMulti
            name={field.name}
            options={options}
            className={`js-states ${error ? "is-invalid" : ""}`}
            classNamePrefix="Select2"
            value={multiValue}
            onChange={(opt) => handleChange(field.name)(Array.isArray(opt) ? opt : [])}
            isDisabled={disabled}
            menuPlacement="auto"
          />
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
      );
    }

    if (field.type === "date") {
      const dateVal = value instanceof Date ? value : value ? new Date(value as string) : null;
      return (
        <div key={field.name} className={colClass}>
          <label className="form-label">
            {field.label}
            {field.required && " *"}
          </label>
          <div className="input-group">
            <div className="input-group-text text-muted">
              <i className="ri-calendar-line" />
            </div>
            <DatePicker
              className="ti-form-input ltr:rounded-l-none rtl:rounded-r-none focus:z-10"
              selected={dateVal}
              onChange={(d) => handleChange(field.name)(d ?? null)}
              disabled={disabled}
            />
          </div>
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
      );
    }

    if (field.type === "richtext") {
      const html = (value as string) ?? "";
      return (
        <div key={field.name} className={colClass}>
          <label className="form-label">
            {field.label}
            {field.required && " *"}
          </label>
          <div id="project-description-editor">
            <TiptapEditor
              content={html}
              placeholder={field.placeholder}
              onChange={(htmlContent) => handleChange(field.name)(htmlContent)}
              editable={!disabled}
            />
          </div>
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
      );
    }

    if (field.type === "tags") {
      const tagOptions: SelectOption[] = Array.isArray(value)
        ? (value as SelectOption[]).map((t) => ({
            value: typeof t === "string" ? t : String((t as SelectOption).value),
            label: typeof t === "string" ? t : String((t as SelectOption).label),
          }))
        : [];
      const components = { DropdownIndicator: null };
      const addTag = (newTag: string) => {
        const trimmed = newTag.trim();
        if (!trimmed) return;
        if (tagOptions.some((o) => String(o.value).toLowerCase() === trimmed.toLowerCase())) return;
        handleChange(field.name)([
          ...tagOptions,
          { value: trimmed, label: trimmed },
        ]);
        setTagInputValue("");
      };
      return (
        <div key={field.name} className={colClass}>
          <label className="form-label">{field.label}</label>
          <CreatableSelect
            components={components}
            classNamePrefix="react-select"
            isClearable
            isMulti
            menuIsOpen={false}
            placeholder={field.placeholder}
            value={tagOptions}
            inputValue={tagInputValue}
            onInputChange={(v) => setTagInputValue(v ?? "")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInputValue.trim()) {
                e.preventDefault();
                addTag(tagInputValue);
              }
            }}
            onChange={(newVal) =>
              handleChange(field.name)(Array.isArray(newVal) ? newVal : [])
            }
            onCreateOption={(newTag) => addTag(newTag)}
            isDisabled={disabled}
          />
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
      );
    }

    if (field.type === "file") {
      return (
        <div key={field.name} className={colClass}>
          <label className="form-label">{field.label}</label>
          <FilePond
            files={attachmentFiles as never[]}
            onupdatefiles={(files) => onAttachmentFilesChange?.(files)}
            allowMultiple
            maxFiles={field.maxItems ?? 3}
            server="/api"
            name="files"
            labelIdle="Drag & Drop your file here or click"
            disabled={disabled}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {PROJECT_FORM_FIELDS.map((field) => renderField(field))}
    </div>
  );
}

export default DynamicProjectForm;
