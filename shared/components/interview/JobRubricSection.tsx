"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import {
  MAX_RUBRIC_ASSIGNMENTS,
  rubricAssignmentsError,
  type RubricAssignment,
} from "@/shared/lib/api/jobs";
import type { InterviewRoundType } from "@/shared/lib/api/meetings";
import { INTERVIEW_ROUND_TYPE_OPTIONS } from "@/app/(components)/(contentlayout)/ats/interviews/_components/interviewLinkage";
import {
  createRubricTemplate,
  criteriaWeightError,
  listRubricTemplates,
  resolveRubric,
  type ResolvedRubric,
  type RubricCriterion,
  type RubricTemplate,
} from "@/shared/lib/api/rubricTemplates";

const RUBRIC_CUSTOM = "__custom__";

export type JobRubricSectionProps = {
  /** Current value. Controlled by the parent form. */
  value: RubricAssignment[];
  onChange: (next: RubricAssignment[]) => void;
  /** Omitted on create — the preview then resolves without a job. */
  jobId?: string | null;
  /** Reports this section's validation up so the parent can disable Save. */
  onValidityChange?: (error: string | null) => void;
};

type EditorCriterion = RubricCriterion & { keyFrozen: boolean };

function slugifyLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug || "criterion";
}

/**
 * Derive a key from the label that cannot collide with another criterion's in the same row.
 *
 * Punctuation collapses to `_`, so "Problem Solving!" and "Problem Solving?" both slugify
 * to `problem_solving`, as do two blank labels. That surfaced as "Duplicate criterion key"
 * against labels that visibly differ — an error naming a concept the form never showed.
 * Suffixing means the user never meets it.
 *
 * Kept identical to the rubric template editor's copy so the same label yields the same
 * key wherever it is typed.
 */
function uniqueKeyForLabel(label: string, taken: Set<string>): string {
  const base = slugifyLabel(label);
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}_${n}`.slice(0, 40);
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`.slice(0, 40);
}

function rowRoundLabel(roundType: InterviewRoundType | null): string {
  if (roundType === null) return "rounds with no specific rubric";
  const opt = INTERVIEW_ROUND_TYPE_OPTIONS.find((o) => o.value === roundType);
  return opt ? `the ${opt.label} round` : `the ${roundType} round`;
}

function errorTargetsRow(message: string | null, roundType: InterviewRoundType | null): boolean {
  if (!message) return false;
  const label = rowRoundLabel(roundType);
  return message.includes(label);
}

function rubricSelectValue(row: RubricAssignment): string {
  if (row.templateId) return row.templateId;
  if (Array.isArray(row.criteria) && row.criteria.length > 0) return RUBRIC_CUSTOM;
  return "";
}

export default function JobRubricSection({
  value,
  onChange,
  jobId,
  onValidityChange,
}: JobRubricSectionProps) {
  const auth = useAuth();
  const canManage = hasPermission(auth, "manage_interview_rubrics");

  const [stashedRows, setStashedRows] = useState<RubricAssignment[] | null>(null);
  const [templates, setTemplates] = useState<RubricTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [preview, setPreview] = useState<ResolvedRubric | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const validationError = useMemo(() => rubricAssignmentsError(value), [value]);
  const sectionEnabled = value.length > 0;

  /**
   * Loads archived rubrics too.
   *
   * resolveRubricForRound deliberately keeps resolving a referenced template after it is
   * archived, so a job deliberately assigned one does not silently drop to the house
   * default. Listing only live rubrics meant such a row had no matching <option>: the
   * dropdown rendered blank and the assignment looked absent, inviting the user to
   * replace a rubric that was working. Archived ones are offered only where already
   * referenced — see templateOptions.
   */
  const loadTemplates = useCallback(() => {
    setTemplatesError(null);
    return listRubricTemplates(true)
      .then((res) => setTemplates(res.results || []))
      .catch(() => {
        setTemplates([]);
        setTemplatesError("Could not load saved rubrics.");
      });
  }, []);

  const loadPreview = useCallback(() => {
    setPreviewLoading(true);
    setPreviewError(null);
    return resolveRubric({ jobId: jobId ?? undefined })
      .then((resolved) => setPreview(resolved))
      .catch(() => {
        setPreview(null);
        setPreviewError("Could not load the default rubric preview.");
      })
      .finally(() => setPreviewLoading(false));
  }, [jobId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!sectionEnabled) {
      void loadPreview();
    }
  }, [sectionEnabled, loadPreview]);

  useEffect(() => {
    if (!canManage) {
      onValidityChange?.(null);
      return;
    }
    onValidityChange?.(validationError);
  }, [canManage, validationError, onValidityChange]);

  const usedRoundTypes = useMemo(() => {
    const set = new Set<string>();
    for (const row of value) {
      const rt = row.roundType ?? null;
      set.add(rt === null ? "__default__" : rt);
    }
    return set;
  }, [value]);

  const handleToggle = (nextOn: boolean) => {
    if (nextOn) {
      if (stashedRows?.length) {
        onChange(stashedRows);
        setStashedRows(null);
      } else {
        onChange([{ roundType: null }]);
      }
      return;
    }
    if (value.length > 0) {
      setStashedRows(value);
      onChange([]);
    }
  };

  const updateRow = (index: number, patch: Partial<RubricAssignment>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange(next.length ? next : []);
    if (!next.length) setStashedRows(null);
  };

  const addRow = () => {
    if (value.length >= MAX_RUBRIC_ASSIGNMENTS) return;
    onChange([...value, { roundType: null }]);
  };

  const handleRubricPick = (index: number, pick: string) => {
    if (!pick) {
      updateRow(index, { templateId: null, criteria: null });
      return;
    }
    if (pick === RUBRIC_CUSTOM) {
      updateRow(index, {
        templateId: null,
        criteria: [{ key: "criterion", label: "", weight: 0, scaleMin: 1, scaleMax: 5 }],
      });
      return;
    }
    updateRow(index, { templateId: pick, criteria: null });
  };

  const updateCriterion = (
    rowIndex: number,
    criterionIndex: number,
    patch: Partial<RubricCriterion>,
    keyFrozen: boolean
  ) => {
    const row = value[rowIndex];
    const criteria = [...(row.criteria || [])];
    const current = { ...criteria[criterionIndex], ...patch };
    if (!keyFrozen && patch.label !== undefined) {
      // Every sibling's key is off limits, so retyping a label can never collide.
      const taken = new Set(
        criteria.filter((_, i) => i !== criterionIndex).map((c) => c.key)
      );
      current.key = uniqueKeyForLabel(patch.label, taken);
    }
    criteria[criterionIndex] = current;
    updateRow(rowIndex, { criteria });
  };

  const addCriterion = (rowIndex: number) => {
    const row = value[rowIndex];
    const criteria = [...(row.criteria || [])];
    criteria.push({
      key: uniqueKeyForLabel("", new Set(criteria.map((c) => c.key))),
      label: "",
      weight: 0,
      scaleMin: 1,
      scaleMax: 5,
    });
    updateRow(rowIndex, { criteria });
  };

  const removeCriterion = (rowIndex: number, criterionIndex: number) => {
    const row = value[rowIndex];
    const criteria = (row.criteria || []).filter((_, i) => i !== criterionIndex);
    updateRow(rowIndex, { criteria: criteria.length ? criteria : null });
  };

  const promoteToTemplate = async (rowIndex: number, criteria: RubricCriterion[]) => {
    const result = await Swal.fire({
      title: "Save as reusable template",
      input: "text",
      inputLabel: "Template name",
      inputPlaceholder: "e.g. Engineering panel rubric",
      showCancelButton: true,
      confirmButtonText: "Save template",
      inputValidator: (v) => (!v?.trim() ? "Name is required." : undefined),
    });
    if (!result.isConfirmed || !result.value?.trim()) return;

    try {
      const created = await createRubricTemplate({
        name: result.value.trim(),
        criteria,
        appliesTo: {},
      });
      await loadTemplates();
      onChange(
        value.map((row, i) =>
          i === rowIndex ? { roundType: row.roundType, templateId: created.id, criteria: null } : row
        )
      );
      await Swal.fire({
        icon: "success",
        title: "Template saved",
        text: `"${created.name}" is now available in the rubric list.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({ icon: "error", title: "Save failed", text: "Could not create the template." });
    }
  };

  const previewBlock = (
    <div className="mt-2 rounded-lg border border-defaultborder/60 bg-gray-50/80 p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-defaulttextcolor/50 dark:text-white/50">
        Default rubric preview
      </p>
      {previewLoading && (
        <div className="mt-2 animate-pulse space-y-2">
          <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-white/10" />
          <div className="h-6 w-full rounded bg-gray-200 dark:bg-white/10" />
        </div>
      )}
      {!previewLoading && previewError && (
        <div className="mt-2">
          <p className="text-danger text-xs">{previewError}</p>
          <button type="button" className="ti-btn ti-btn-light mt-2 !text-xs" onClick={() => void loadPreview()}>
            Retry
          </button>
        </div>
      )}
      {!previewLoading && !previewError && preview && (
        <>
          <p className="mt-1 font-medium text-defaulttextcolor dark:text-white">{preview.templateName}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(preview.criteria || []).map((c) => (
              <span
                key={c.key}
                className="rounded-md bg-white px-2 py-0.5 text-xs tabular-nums text-defaulttextcolor/80 shadow-sm dark:bg-white/10 dark:text-white/80"
              >
                {c.label} {c.weight}%
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <section className="mt-6 border-t border-gray-200 pt-6 dark:border-defaultborder/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-defaulttextcolor dark:text-white">Interview scoring</h3>
          <p className="mt-1 text-xs text-defaulttextcolor/60 dark:text-white/60">
            Override which rubric each interview round uses for this job. Leave off to inherit the global default.
          </p>
        </div>
        {canManage && (
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="ti-form-checkbox"
              checked={sectionEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            Use job-specific rubrics
          </label>
        )}
      </div>

      {!sectionEnabled && previewBlock}

      {canManage && !sectionEnabled && stashedRows && stashedRows.length > 0 && (
        <p className="mt-2 text-xs text-warning">
          Turning this off removes {stashedRows.length} assignment{stashedRows.length === 1 ? "" : "s"} when you save
          the job.
        </p>
      )}

      {canManage && sectionEnabled && (
        <div className="mt-4 space-y-4">
          {validationError && !value.some((row) => errorTargetsRow(validationError, row.roundType ?? null)) && (
            <p className="text-xs text-danger" role="alert">{validationError}</p>
          )}
          {templatesError && <p className="text-xs text-danger">{templatesError}</p>}

          {value.map((row, index) => {
            const roundKey = row.roundType ?? null;
            const rowError = errorTargetsRow(validationError, roundKey) ? validationError : null;
            const criteria = row.criteria || [];
            const criteriaErr = criteria.length ? criteriaWeightError(criteria) : null;
            const weightTotal = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

            return (
              <div
                key={`rubric-row-${index}`}
                className="rounded-lg border border-defaultborder/70 p-3 dark:border-white/10"
              >
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-4">
                    <label className="form-label mb-1 block text-xs font-medium" htmlFor={`rubric-round-${index}`}>
                      Round
                    </label>
                    <select
                      id={`rubric-round-${index}`}
                      className="form-select w-full min-h-[44px] text-sm"
                      value={roundKey ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateRow(index, { roundType: v ? (v as InterviewRoundType) : null });
                      }}
                    >
                      <option value="" disabled={usedRoundTypes.has("__default__") && roundKey !== null}>
                        Any round
                      </option>
                      {INTERVIEW_ROUND_TYPE_OPTIONS.map((opt) => {
                        const key = opt.value;
                        const taken = usedRoundTypes.has(key) && row.roundType !== opt.value;
                        if (taken) return null;
                        return (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="sm:col-span-6">
                    <label className="form-label mb-1 block text-xs font-medium" htmlFor={`rubric-pick-${index}`}>
                      Rubric
                    </label>
                    <select
                      id={`rubric-pick-${index}`}
                      className="form-select w-full min-h-[44px] text-sm"
                      value={rubricSelectValue(row)}
                      onChange={(e) => handleRubricPick(index, e.target.value)}
                    >
                      <option value="" disabled>Select a rubric</option>
                      {templates
                        // Live rubrics are always offered. An archived one appears only on
                        // the row that already references it, so history stays visible and
                        // editable without archived rubrics cluttering new choices.
                        .filter((t) => !t.archivedAt || t.id === row.templateId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                            {t.archivedAt ? " (archived)" : ""}
                          </option>
                        ))}
                      <option value={RUBRIC_CUSTOM}>Custom for this job</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex sm:justify-end">
                    <button
                      type="button"
                      className="ti-btn ti-btn-light !text-xs min-h-[44px]"
                      onClick={() => removeRow(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {rowError && (
                  <p className="mt-2 text-xs text-danger" role="alert">{rowError}</p>
                )}

                {rubricSelectValue(row) === RUBRIC_CUSTOM && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-defaulttextcolor/60 dark:text-white/60">
                      A new criterion&apos;s key follows its label until you save, then it is frozen. Stored ratings
                      reference the key — after that, rename the label, never the key.
                    </p>
                    {criteriaErr && <p className="text-xs text-danger">{criteriaErr}</p>}
                    <div className="overflow-x-auto rounded-lg border border-defaultborder/70 dark:border-white/10">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-white/5">
                          <tr>
                            <th className="px-2 py-2 text-start font-medium">Label</th>
                            <th className="px-2 py-2 text-start font-medium">Key</th>
                            <th className="px-2 py-2 text-start font-medium">Weight %</th>
                            <th className="px-2 py-2 text-start font-medium">Min</th>
                            <th className="px-2 py-2 text-start font-medium">Max</th>
                            <th className="px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {criteria.map((c, ci) => {
                            const frozen = Boolean(c.label?.trim());
                            // Keyed by position, never by c.key: the key is recomputed from
                            // the label on every keystroke, so keying on it made React
                            // remount the row mid-word and drop the caret. This list only
                            // appends and removes, never reorders.
                            return (
                              <tr key={ci} className="border-t border-defaultborder/50 dark:border-white/10">
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    aria-label={`Criterion ${ci + 1} label`}
                                    className="form-control min-h-[44px] !rounded-md text-sm"
                                    value={c.label}
                                    onChange={(e) =>
                                      updateCriterion(index, ci, { label: e.target.value }, frozen)
                                    }
                                  />
                                </td>
                                <td className="px-2 py-2 text-xs text-defaulttextcolor/60 dark:text-white/60">
                                  {c.key}
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    aria-label={`Criterion ${ci + 1} weight`}
                                    className="form-control !w-20 min-h-[44px] !rounded-md text-sm tabular-nums"
                                    value={c.weight}
                                    onChange={(e) =>
                                      updateCriterion(index, ci, { weight: Number(e.target.value) }, frozen)
                                    }
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    aria-label={`Criterion ${ci + 1} scale min`}
                                    className="form-control !w-16 min-h-[44px] !rounded-md text-sm tabular-nums"
                                    value={c.scaleMin}
                                    onChange={(e) =>
                                      updateCriterion(index, ci, { scaleMin: Number(e.target.value) }, frozen)
                                    }
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    aria-label={`Criterion ${ci + 1} scale max`}
                                    className="form-control !w-16 min-h-[44px] !rounded-md text-sm tabular-nums"
                                    value={c.scaleMax}
                                    onChange={(e) =>
                                      updateCriterion(index, ci, { scaleMax: Number(e.target.value) }, frozen)
                                    }
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <button
                                    type="button"
                                    className="text-xs text-danger hover:underline"
                                    onClick={() => removeCriterion(index, ci)}
                                    disabled={criteria.length <= 1}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs tabular-nums text-defaulttextcolor/70 dark:text-white/70">
                        Weight total: <span className="font-semibold">{weightTotal}%</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="ti-btn ti-btn-light !text-xs" onClick={() => addCriterion(index)}>
                          Add criterion
                        </button>
                        <button
                          type="button"
                          className="ti-btn ti-btn-secondary !text-xs"
                          disabled={Boolean(criteriaErr)}
                          onClick={() => void promoteToTemplate(index, criteria)}
                        >
                          Save as reusable template
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {value.length < MAX_RUBRIC_ASSIGNMENTS && (
            <button type="button" className="ti-btn ti-btn-light !text-xs" onClick={addRow}>
              Add round assignment
            </button>
          )}
        </div>
      )}

      {!canManage && previewBlock}
    </section>
  );
}
