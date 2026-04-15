"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import TiptapEditor from "@/shared/data/forms/form-editors/tiptapeditor";
import { FilePond } from "react-filepond";
import CreatableSelect from "react-select/creatable";
import type { GroupBase, StylesConfig } from "react-select";
import {
  PROJECT_FORM_FIELDS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  type ProjectFormFieldConfig,
  type SelectOption,
} from "@/shared/data/apps/projects/projectFormConfig";
import { multiselectdata } from "@/shared/data/apps/projects/createprojectdata";
import Swal from "sweetalert2";
import { enhanceProjectBrief } from "@/shared/lib/api/pmAssistant";
import {
  BriefEnhancedReviewModal,
  type BriefRegenerateInput,
} from "@/shared/components/pm/BriefEnhancedReviewModal";

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
  /** Team group options for “Project team(s)” multiselect (default: multiselectdata from createprojectdata) */
  assignedToOptions?: SelectOption[];
  /** User options for “Assigned people” multiselect */
  assignedUserOptions?: SelectOption[];
  /** Field-level errors */
  errors?: Record<string, string>;
  /** File list for attachments (FilePond); parent controls state */
  attachmentFiles?: unknown[];
  onAttachmentFilesChange?: (files: unknown[]) => void;
  /** Disable all inputs (e.g. view mode) */
  disabled?: boolean;
  /**
   * When set, “Project team(s)” shows a create flow. Resolve with `{ value, label }` (new team id + name);
   * parent should refresh options and persist via API.
   */
  onCreateTeamGroup?: (name: string) => Promise<{ value: string; label: string }>;
  /** When true, show “Enhance with AI” on the project description (requires PM assistant + server OpenAI). */
  briefAiEnhanceEnabled?: boolean;
}

const defaultAssignedToOptions = multiselectdata.map((o) => ({
  value: o.value,
  label: o.label,
}));

/** Portal target — menu renders on body so it is not clipped by section transforms/cards. */
const selectPortalTargetProps: {
  menuPortalTarget?: HTMLElement;
  menuPosition?: "fixed";
} =
  typeof document !== "undefined"
    ? { menuPortalTarget: document.body, menuPosition: "fixed" }
    : {};

/**
 * Shared Select / CreatableSelect look: teal focus ring, slate neutrals, teal pill multi-values.
 * Matches Brief / Roster section language (not default react-select purple).
 */
function projectFormSelectStyles(
  isMulti: boolean
): StylesConfig<SelectOption, boolean, GroupBase<SelectOption>> {
  const canPortal = typeof document !== "undefined";

  return {
    ...(canPortal
      ? {
          menuPortal: (base) => ({ ...base, zIndex: 10050 }),
        }
      : {}),
    control: (base, state) => ({
      ...base,
      minHeight: isMulti ? 44 : 42,
      borderRadius: 10,
      borderColor: state.isFocused ? "rgba(20, 184, 166, 0.55)" : "rgba(148, 163, 184, 0.5)",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(20, 184, 166, 0.18)" : "none",
      backgroundColor: "rgb(var(--default-background))",
      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      ":hover": {
        borderColor: "rgba(20, 184, 166, 0.42)",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: isMulti ? "8px 10px" : "6px 10px",
      gap: isMulti ? 8 : 6,
      flexWrap: isMulti ? "wrap" : "nowrap",
    }),
    ...(isMulti
      ? {
          multiValue: (base) => ({
            ...base,
            borderRadius: 9999,
            background:
              "linear-gradient(160deg, rgba(13, 148, 136, 0.16) 0%, rgba(15, 118, 110, 0.09) 100%)",
            border: "1px solid rgba(20, 184, 166, 0.38)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            alignItems: "center",
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: "rgb(15 118 110)",
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.02em",
            padding: "5px 4px 5px 12px",
            lineHeight: 1.3,
          }),
          multiValueRemove: (base) => ({
            ...base,
            borderRadius: "0 9999px 9999px 0",
            paddingLeft: 2,
            paddingRight: 10,
            color: "rgb(13 148 136)",
            cursor: "pointer",
            transition: "background-color 0.12s ease, color 0.12s ease",
            ":hover": {
              backgroundColor: "rgba(220, 38, 38, 0.1)",
              color: "rgb(185 28 28)",
            },
          }),
        }
      : {
          singleValue: (base) => ({
            ...base,
            color: "rgb(30 41 59)",
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.01em",
          }),
        }),
    placeholder: (base) => ({
      ...base,
      fontSize: "0.8125rem",
      color: "rgb(148 163 184)",
    }),
    input: (base) => ({
      ...base,
      fontSize: "0.8125rem",
      margin: 0,
      paddingTop: isMulti ? 3 : 2,
      paddingBottom: isMulti ? 3 : 2,
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 10,
      overflow: "hidden",
      border: "1px solid rgba(148, 163, 184, 0.35)",
      boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
      backgroundColor: "rgb(var(--default-background))",
    }),
    menuList: (base) => ({
      ...base,
      padding: 6,
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: 8,
      margin: "2px 0",
      fontSize: "0.8125rem",
      cursor: "pointer",
      color: state.isSelected ? "rgb(15 118 110)" : "rgb(51 65 85)",
      fontWeight: state.isSelected ? 600 : 500,
      backgroundColor: state.isSelected
        ? "rgba(13, 148, 136, 0.16)"
        : state.isFocused
          ? "rgba(148, 163, 184, 0.14)"
          : "transparent",
      ":active": {
        backgroundColor: "rgba(13, 148, 136, 0.22)",
      },
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: "6px 8px",
      color: "rgb(100 116 139)",
      transition: "color 0.12s ease",
      ":hover": {
        color: "rgb(13 148 136)",
      },
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: "rgba(148, 163, 184, 0.4)",
    }),
    clearIndicator: (base) => ({
      ...base,
      padding: 8,
      color: "rgb(100 116 139)",
      ":hover": {
        color: "rgb(15 118 110)",
        backgroundColor: "rgba(20, 184, 166, 0.08)",
        borderRadius: 8,
      },
    }),
  };
}

function getGridClass(colSpan: 4 | 6 | 12 = 6): string {
  return `xl:col-span-${colSpan} col-span-12`;
}

const INTAKE_FIELD_NAMES = PROJECT_FORM_FIELDS.filter((f) => f.intake).map(
  (f) => f.name
);

function stripBriefPlain(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Plain text for preview dialogs (prefer DOM textContent when available). */
function htmlToPreviewPlain(html: string): string {
  if (!html || typeof html !== "string") return "";
  if (typeof document !== "undefined") {
    const d = document.createElement("div");
    d.innerHTML = html;
    return (d.textContent ?? d.innerText ?? "").replace(/\u00a0/g, " ").replace(/\s+\n/g, "\n").trim();
  }
  return stripBriefPlain(html);
}

function sectionHeadingId(title: string) {
  return `pm-form-section-${title.replace(/\s+/g, "-").toLowerCase()}`;
}

function ProjectFormSection({
  title,
  hint,
  hintPlacement = "inline",
  animationDelayMs = 0,
  children,
}: {
  title: string;
  hint?: string;
  /** `callout`: full-width note under the title (better for long copy). `inline`: hint beside title on wide screens. */
  hintPlacement?: "inline" | "callout";
  animationDelayMs?: number;
  children: React.ReactNode;
}) {
  const hid = sectionHeadingId(title);
  const callout = hint && hintPlacement === "callout";
  const inlineHint = hint && hintPlacement === "inline";

  return (
    <section
      className="overflow-visible rounded-xl border border-gray-200/90 bg-[rgb(var(--default-background))]/90 shadow-defaultshadow dark:border-white/10 dark:bg-bodybg2/35 motion-safe:animate-pm-section-in motion-reduce:animate-none px-4 py-4 sm:px-5 sm:py-5"
      style={{ animationDelay: `${animationDelayMs}ms` }}
      aria-labelledby={hid}
    >
      <header
        className={`border-s-[3px] border-teal-500 ps-3 ${callout ? "mb-3" : "mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"}`}
      >
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 id={hid} className="m-0 text-[1rem] font-semibold leading-snug tracking-tight text-defaulttextcolor">
            {title}
          </h2>
        </div>
        {inlineHint ? (
          <p className="m-0 max-w-2xl text-[0.75rem] leading-snug text-[#8c9097] dark:text-white/45 sm:text-end">
            {hint}
          </p>
        ) : null}
      </header>
      {callout ? (
        <div className="mb-4 flex gap-2.5 rounded-lg border border-teal-500/20 bg-gradient-to-br from-teal-500/[0.07] via-white/80 to-slate-50/90 px-3.5 py-2.5 dark:border-teal-400/20 dark:from-teal-500/10 dark:via-bodybg2/50 dark:to-slate-950/40">
          <span
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-teal-600/10 text-teal-700 dark:text-teal-300"
            aria-hidden
          >
            <i className="ri-lightbulb-line text-base" />
          </span>
          <p className="m-0 flex-1 text-[0.78rem] leading-relaxed text-[#4d5875] dark:text-white/70">{hint}</p>
        </div>
      ) : null}
      <div className="grid grid-cols-12 gap-4 overflow-visible">{children}</div>
    </section>
  );
}

export function DynamicProjectForm({
  values,
  onChange,
  assignedToOptions = defaultAssignedToOptions,
  assignedUserOptions = [],
  errors = {},
  attachmentFiles = [],
  onAttachmentFilesChange,
  disabled = false,
  onCreateTeamGroup,
  briefAiEnhanceEnabled = false,
}: DynamicProjectFormProps) {
  const [tagInputValue, setTagInputValue] = useState("");
  const [briefEnhanceLoading, setBriefEnhanceLoading] = useState(false);
  const [teamCreateOpen, setTeamCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [teamCreateError, setTeamCreateError] = useState<string | null>(null);
  const [teamCreateSubmitting, setTeamCreateSubmitting] = useState(false);
  const [showIntake, setShowIntake] = useState(() =>
    INTAKE_FIELD_NAMES.length
      ? INTAKE_FIELD_NAMES.some((n) => {
          const v = values[n];
          return typeof v === "string" && v.trim().length > 0;
        })
      : false
  );

  type BriefReviewState = {
    open: boolean;
    busy: boolean;
    error: string | null;
    baseHtml: string;
    projectName?: string;
    projectManager?: string;
    clientStakeholder?: string;
    plainBefore: string;
    plainAfter: string;
    enhancedHtml: string;
    contextLines: string[];
    emptyEditorExplain: boolean;
  };

  const [briefReview, setBriefReview] = useState<BriefReviewState | null>(null);
  const briefReviewRef = useRef<BriefReviewState | null>(null);

  useEffect(() => {
    briefReviewRef.current = briefReview;
  }, [briefReview]);

  const handleChange = useCallback(
    (name: string) => (value: unknown) => {
      onChange(name, value);
    },
    [onChange]
  );

  const handleBriefRegenerate = useCallback(async (input: BriefRegenerateInput) => {
    const snap = briefReviewRef.current;
    if (!snap?.open) return;
    setBriefReview({ ...snap, busy: true, error: null });
    try {
      const out = await enhanceProjectBrief({
        html: snap.baseHtml,
        ...(snap.projectName ? { projectName: snap.projectName } : {}),
        ...(snap.projectManager ? { projectManager: snap.projectManager } : {}),
        ...(snap.clientStakeholder ? { clientStakeholder: snap.clientStakeholder } : {}),
        previousEnhancedHtml: snap.enhancedHtml,
        ...(input.refinementInstructions ? { refinementInstructions: input.refinementInstructions } : {}),
        ...(input.feedbackRating || input.feedbackComment
          ? {
              feedback: {
                ...(input.feedbackRating ? { rating: input.feedbackRating } : {}),
                ...(input.feedbackComment ? { comment: input.feedbackComment } : {}),
              },
            }
          : {}),
      });
      setBriefReview((prev) =>
        prev
          ? {
              ...prev,
              busy: false,
              error: null,
              enhancedHtml: out.enhancedHtml,
              plainAfter: htmlToPreviewPlain(out.enhancedHtml),
            }
          : null
      );
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : e instanceof Error
            ? e.message
            : "Could not regenerate the brief.";
      setBriefReview((prev) =>
        prev ? { ...prev, busy: false, error: typeof msg === "string" ? msg : "Could not regenerate the brief." } : null
      );
    }
  }, []);

  const handleBriefEnhance = useCallback(async () => {
    if (!briefAiEnhanceEnabled || disabled) return;
    const html = String(values.description ?? "");
    setBriefEnhanceLoading(true);
    try {
      const projectName = String(values.name ?? "").trim();
      const projectManager = String(values.projectManager ?? "").trim();
      const clientStakeholder = String(values.clientStakeholder ?? "").trim();
      const out = await enhanceProjectBrief({
        html,
        ...(projectName ? { projectName } : {}),
        ...(projectManager ? { projectManager } : {}),
        ...(clientStakeholder ? { clientStakeholder } : {}),
      });

      const plainBefore = htmlToPreviewPlain(html);
      const plainAfter = htmlToPreviewPlain(out.enhancedHtml);
      const contextLines: string[] = [];
      if (projectName) contextLines.push(`Project name: ${projectName}`);
      if (projectManager) contextLines.push(`PM label: ${projectManager}`);
      if (clientStakeholder) contextLines.push(`Stakeholder: ${clientStakeholder}`);

      setBriefReview({
        open: true,
        busy: false,
        error: null,
        baseHtml: html,
        ...(projectName ? { projectName } : {}),
        ...(projectManager ? { projectManager } : {}),
        ...(clientStakeholder ? { clientStakeholder } : {}),
        plainBefore,
        plainAfter,
        enhancedHtml: out.enhancedHtml,
        contextLines,
        emptyEditorExplain: plainBefore.length === 0,
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : e instanceof Error
            ? e.message
            : "Could not enhance the brief.";
      await Swal.fire({
        icon: "error",
        title: "Enhance failed",
        text: typeof msg === "string" ? msg : "Could not enhance the brief.",
      });
    } finally {
      setBriefEnhanceLoading(false);
    }
  }, [
    briefAiEnhanceEnabled,
    disabled,
    values.description,
    values.name,
    values.projectManager,
    values.clientStakeholder,
  ]);

  const handleBriefReviewClose = useCallback(() => {
    if (briefReviewRef.current?.busy) return;
    setBriefReview(null);
  }, []);

  const handleBriefReviewApply = useCallback(() => {
    const snap = briefReviewRef.current;
    if (!snap?.open || snap.busy) return;
    handleChange("description")(snap.enhancedHtml);
    setBriefReview(null);
    void Swal.fire({
      icon: "success",
      title: "Brief updated",
      timer: 1600,
      showConfirmButton: false,
    });
  }, [handleChange]);

  const renderField = (field: ProjectFormFieldConfig) => {
    const value = values[field.name];
    const error = errors[field.name];
    const colClass = getGridClass(field.colSpan);

    if (field.type === "textarea") {
      const tv = (value as string) ?? "";
      return (
        <div key={field.name} className={colClass}>
          <label htmlFor={field.name} className="form-label">
            {field.label}
            {field.required && " *"}
          </label>
          {field.helpText ? (
            <p className="text-[0.75rem] text-[#8c9097] dark:text-white/45 mb-1">{field.helpText}</p>
          ) : null}
          <textarea
            id={field.name}
            className={`form-control ${error ? "is-invalid" : ""}`}
            placeholder={field.placeholder}
            rows={field.rows ?? 4}
            value={tv}
            onChange={(e) => handleChange(field.name)(e.target.value)}
            disabled={disabled}
          />
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
      );
    }

    if (field.type === "text") {
      return (
        <div key={field.name} className={colClass}>
          <label htmlFor={field.name} className="form-label">
            {field.label}
            {field.required && " *"}
          </label>
          {field.helpText ? (
            <p className="text-[0.75rem] text-[#8c9097] dark:text-white/45 mb-1">{field.helpText}</p>
          ) : null}
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
          {field.helpText ? (
            <p className="text-[0.75rem] text-[#8c9097] dark:text-white/45 mb-1">{field.helpText}</p>
          ) : null}
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
            {...selectPortalTargetProps}
            styles={
              projectFormSelectStyles(false) as StylesConfig<
                unknown,
                boolean,
                GroupBase<unknown>
              >
            }
          />
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
      );
    }

    if (field.type === "multiselect") {
      const options =
        field.name === "assignedTeams"
          ? assignedToOptions
          : field.name === "assignedUsers"
            ? assignedUserOptions
            : (field.options ?? []);
      const multiValue = Array.isArray(value) ? (value as SelectOption[]) : [];
      return (
        <div key={field.name} className={colClass}>
          <label className="form-label">
            {field.label}
            {field.required && " *"}
          </label>
          {field.helpText ? (
            <p className="text-[0.75rem] text-[#8c9097] dark:text-white/45 mb-1">{field.helpText}</p>
          ) : null}
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
            {...selectPortalTargetProps}
            styles={
              projectFormSelectStyles(true) as StylesConfig<
                unknown,
                boolean,
                GroupBase<unknown>
              >
            }
          />
          {error && <div className="invalid-feedback d-block">{error}</div>}
          {field.name === "assignedTeams" && onCreateTeamGroup && !disabled ? (
            <div className="mt-2 space-y-2">
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.8125rem] font-medium transition-all duration-200 ease-out motion-reduce:transition-none ${
                  teamCreateOpen
                    ? "border-teal-500/40 bg-teal-500/5 text-teal-800 dark:text-teal-200"
                    : "border-defaultborder text-defaulttextcolor hover:border-teal-500/50 hover:bg-teal-500/[0.04] active:scale-[0.98] motion-reduce:active:scale-100"
                }`}
                aria-expanded={teamCreateOpen}
                onClick={() => {
                  if (teamCreateOpen) {
                    setTeamCreateOpen(false);
                    setNewTeamName("");
                    setTeamCreateError(null);
                  } else {
                    setTeamCreateOpen(true);
                    setTeamCreateError(null);
                    setNewTeamName("");
                  }
                }}
              >
                <i className={`ri-team-line ${teamCreateOpen ? "" : "text-teal-600 dark:text-teal-400"}`} aria-hidden />
                {teamCreateOpen ? "Close new team" : "Create new team"}
              </button>
              <div
                className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  teamCreateOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0">
                  {teamCreateOpen ? (
                    <div
                      key="team-create-panel"
                      className="motion-safe:animate-pm-panel-in motion-reduce:animate-none space-y-2 rounded-lg border border-slate-200/90 border-l-4 border-l-teal-500 bg-slate-50/95 p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/50"
                      role="region"
                      aria-label="Create new team"
                    >
                      <label
                        htmlFor="dynamic-project-new-team-name"
                        className="form-label mb-0 text-[0.8125rem] text-defaulttextcolor"
                      >
                        New team name
                      </label>
                      <input
                        id="dynamic-project-new-team-name"
                        type="text"
                        className="form-control form-control-sm transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.2)]"
                        placeholder="e.g. Team Mobile"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        disabled={teamCreateSubmitting}
                        maxLength={120}
                        autoComplete="off"
                      />
                      {teamCreateError ? (
                        <div className="text-danger text-[0.75rem] motion-safe:animate-pm-panel-in motion-reduce:animate-none">
                          {teamCreateError}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary !text-[0.8125rem] !py-1 !px-3 transition-transform duration-150 active:scale-[0.97] motion-reduce:active:scale-100"
                          disabled={teamCreateSubmitting || !newTeamName.trim()}
                          onClick={() => {
                            void (async () => {
                              const name = newTeamName.trim();
                              if (!name) {
                                setTeamCreateError("Enter a team name.");
                                return;
                              }
                              setTeamCreateSubmitting(true);
                              setTeamCreateError(null);
                              try {
                                const opt = await onCreateTeamGroup(name);
                                const next = [...multiValue, opt];
                                handleChange(field.name)(next);
                                setTeamCreateOpen(false);
                                setNewTeamName("");
                              } catch (e: unknown) {
                                const msg =
                                  e &&
                                  typeof e === "object" &&
                                  "response" in e &&
                                  (e as { response?: { data?: { message?: string } } }).response?.data
                                    ?.message
                                    ? String(
                                        (e as { response: { data: { message: string } } }).response.data
                                          .message
                                      )
                                    : e instanceof Error
                                      ? e.message
                                      : "Could not create team.";
                                setTeamCreateError(msg);
                              } finally {
                                setTeamCreateSubmitting(false);
                              }
                            })();
                          }}
                        >
                          {teamCreateSubmitting ? (
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="inline-block size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                                aria-hidden
                              />
                              Creating…
                            </span>
                          ) : (
                            "Create & select"
                          )}
                        </button>
                        <button
                          type="button"
                          className="ti-btn ti-btn-light !text-[0.8125rem] !py-1 !px-3 transition-transform duration-150 active:scale-[0.98] motion-reduce:active:scale-100"
                          disabled={teamCreateSubmitting}
                          onClick={() => {
                            setTeamCreateOpen(false);
                            setNewTeamName("");
                            setTeamCreateError(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-0" aria-hidden />
                  )}
                </div>
              </div>
            </div>
          ) : null}
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
          {field.helpText ? (
            <p className="text-[0.75rem] text-[#8c9097] dark:text-white/45 mb-1">{field.helpText}</p>
          ) : null}
          <div className="input-group">
            <div className="input-group-text text-muted">
              <i className="ri-calendar-line" />
            </div>
            <DatePicker
              className="ti-form-input ltr:rounded-l-none rtl:rounded-r-none focus:z-10"
              selected={dateVal}
              onChange={(d) => handleChange(field.name)(d ?? null)}
              disabled={disabled}
              portalId="pm-project-form-datepicker-portal"
              popperClassName="!z-[10050]"
            />
          </div>
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
      );
    }

    if (field.type === "richtext") {
      const html = (value as string) ?? "";
      const isProjectBrief = field.name === "description";

      if (isProjectBrief) {
        return (
          <div key={field.name} className={colClass}>
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="sr-only">
                Project description — narrative and scope in rich text
                {field.required ? " (required)" : ""}
              </legend>
              <div className="mb-2.5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[0.8125rem] font-semibold text-defaulttextcolor">{field.label}</span>
                    <span className="rounded bg-slate-500/10 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-[#7987a1] dark:text-white/50">
                      Rich text
                    </span>
                  </div>
                  {field.helpText ? (
                    <p className="mb-0 mt-1 max-w-3xl text-[0.75rem] leading-relaxed text-[#8c9097] dark:text-white/45">
                      {field.helpText}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  {briefAiEnhanceEnabled ? (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/35 bg-indigo-500/[0.08] px-3 py-1.5 text-[0.78rem] font-semibold text-indigo-900 shadow-sm transition-all duration-200 hover:border-indigo-500/55 hover:bg-indigo-500/[0.12] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-60 dark:text-indigo-100 dark:hover:bg-indigo-500/20"
                      disabled={disabled || briefEnhanceLoading}
                      aria-busy={briefEnhanceLoading}
                      onClick={() => void handleBriefEnhance()}
                    >
                      {briefEnhanceLoading ? (
                        <>
                          <span
                            className="inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-indigo-400/40 border-t-indigo-700 motion-reduce:animate-none dark:border-t-indigo-200"
                            aria-hidden
                          />
                          Enhancing…
                        </>
                      ) : (
                        <>
                          <i className="ri-sparkling-2-line text-base" aria-hidden />
                          Enhance with AI
                        </>
                      )}
                    </button>
                  ) : null}
                  <p className="m-0 hidden text-end text-[0.6875rem] leading-snug text-[#949eb7] sm:block sm:max-w-[14rem] dark:text-white/40">
                    Toolbar formats copy; optional guided fields sit below when enabled.
                  </p>
                </div>
              </div>
              <div
                id="project-description-editor"
                className="overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04] transition-[box-shadow,border-color] duration-200 focus-within:border-teal-500/45 focus-within:ring-teal-500/15 motion-reduce:transition-none dark:border-white/10 dark:bg-slate-950/35 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_2px_rgba(0,0,0,0.35)] dark:ring-white/[0.06] dark:focus-within:border-teal-400/40"
              >
                <TiptapEditor
                  content={html}
                  placeholder={field.placeholder}
                  onChange={(htmlContent) => handleChange(field.name)(htmlContent)}
                  editable={!disabled}
                />
              </div>
              <p className="mt-2 mb-0 text-[0.6875rem] leading-snug text-[#949eb7] sm:hidden dark:text-white/40">
                Use the toolbar for structure; guided prompts appear below when turned on above.
              </p>
              {error && <div className="invalid-feedback d-block mt-2">{error}</div>}
            </fieldset>
          </div>
        );
      }

      return (
        <div key={field.name} className={colClass}>
          <label className="form-label">
            {field.label}
            {field.required && " *"}
          </label>
          {field.helpText ? (
            <p className="text-[0.75rem] text-[#8c9097] dark:text-white/45 mb-1">{field.helpText}</p>
          ) : null}
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
            {...selectPortalTargetProps}
            styles={projectFormSelectStyles(true)}
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

  const visibleFields = PROJECT_FORM_FIELDS.filter(
    (f) => !f.intake || showIntake
  );

  const overviewFields = visibleFields.filter((f) =>
    ["name", "projectManager", "clientStakeholder"].includes(f.name)
  );
  const briefDescFields = visibleFields.filter((f) => f.name === "description");
  const briefIntakeFields = visibleFields.filter((f) => f.intake);
  const scheduleFields = visibleFields.filter((f) =>
    ["startDate", "endDate", "status", "priority"].includes(f.name)
  );
  const rosterFields = visibleFields.filter((f) =>
    ["assignedTeams", "assignedUsers"].includes(f.name)
  );
  const metaFields = visibleFields.filter((f) => f.name === "tags" || f.type === "file");
  const sectioned = new Set(
    [
      ...overviewFields,
      ...briefDescFields,
      ...briefIntakeFields,
      ...scheduleFields,
      ...rosterFields,
      ...metaFields,
    ].map((f) => f.name)
  );
  const overflowFields = visibleFields.filter((f) => !sectioned.has(f.name));

  return (
    <div className="space-y-6 overflow-visible">
      {briefReview?.open ? (
        <BriefEnhancedReviewModal
          open={briefReview.open}
          onClose={handleBriefReviewClose}
          contextLines={briefReview.contextLines}
          emptyEditorExplain={briefReview.emptyEditorExplain}
          plainCurrent={briefReview.plainBefore}
          plainSuggestion={briefReview.plainAfter}
          busy={briefReview.busy}
          error={briefReview.error}
          onApply={handleBriefReviewApply}
          onRegenerate={handleBriefRegenerate}
        />
      ) : null}
      {INTAKE_FIELD_NAMES.length ? (
        <div
          className="rounded-xl border border-dashed border-teal-500/35 bg-teal-500/[0.04] px-4 py-3 motion-safe:animate-pm-section-in motion-reduce:animate-none dark:border-teal-400/25 dark:bg-teal-500/[0.07]"
          style={{ animationDelay: "0ms" }}
        >
          <button
            type="button"
            className="ti-btn ti-btn-outline-secondary !text-[0.8125rem] !py-2 !px-3 !mb-0 transition-transform duration-200 ease-out hover:-translate-y-px motion-reduce:transform-none active:scale-[0.98] motion-reduce:active:scale-100"
            onClick={() => setShowIntake((s) => !s)}
            disabled={disabled}
            aria-expanded={showIntake}
          >
            {showIntake ? (
              <>
                <i className="ri-arrow-up-s-line me-1.5" aria-hidden />
                Hide guided brief questions
              </>
            ) : (
              <>
                <i className="ri-questionnaire-line me-1.5" aria-hidden />
                Add guided brief questions (recommended)
              </>
            )}
          </button>
          <p className="mb-0 mt-2 max-w-3xl text-[0.75rem] leading-relaxed text-[#8c9097] dark:text-white/45">
            Optional prompts strengthen descriptions for PM assistant and handover.
          </p>
        </div>
      ) : null}

      <ProjectFormSection
        title="Overview"
        hint="Project name, PM label, and sponsor — what appears on the record."
        animationDelayMs={40}
      >
        {overviewFields.map((field) => renderField(field))}
      </ProjectFormSection>

      <ProjectFormSection
        title="Brief"
        hint="Start with a clear narrative here. For AI and handover, turn on guided brief questions at the top of the form — those answers are merged into the stored description."
        hintPlacement="callout"
        animationDelayMs={110}
      >
        {briefDescFields.map((field) => renderField(field))}
        {showIntake ? (
          <>
            <div className="col-span-12 mt-1 flex items-center gap-2 border-t border-dashed border-slate-200/90 pt-4 dark:border-white/10">
              <span className="flex size-8 items-center justify-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-white/55">
                <i className="ri-list-check-2 text-lg" aria-hidden />
              </span>
              <div>
                <h3 className="m-0 text-[0.8125rem] font-semibold text-defaulttextcolor">Guided prompts</h3>
                <p className="m-0 text-[0.72rem] leading-snug text-[#8c9097] dark:text-white/45">
                  Structured answers — appended under a delimiter in the saved brief.
                </p>
              </div>
            </div>
            {briefIntakeFields.map((field) => renderField(field))}
          </>
        ) : null}
      </ProjectFormSection>

      <ProjectFormSection
        title="Timeline & priority"
        hint="Schedule and how this work is triaged."
        animationDelayMs={180}
      >
        {scheduleFields.map((field) => renderField(field))}
      </ProjectFormSection>

      <ProjectFormSection
        title="Roster"
        hint="Link squads from the team directory and individual assignees."
        animationDelayMs={250}
      >
        {rosterFields.map((field) => renderField(field))}
      </ProjectFormSection>

      <ProjectFormSection
        title="Labels & files"
        hint="Tags for filtering; attachments optional."
        animationDelayMs={320}
      >
        {metaFields.map((field) => renderField(field))}
        {overflowFields.map((field) => renderField(field))}
      </ProjectFormSection>
    </div>
  );
}

export default DynamicProjectForm;
