"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { INTERVIEW_ROUND_TYPE_OPTIONS } from "@/app/(components)/(contentlayout)/ats/interviews/_components/interviewLinkage";
import type { RubricAssignment } from "@/shared/lib/api/jobs";
import { MAX_RUBRIC_ASSIGNMENTS, rubricAssignmentsError } from "@/shared/lib/api/jobs";
import type { InterviewRoundType } from "@/shared/lib/api/meetings";
import {
  criteriaWeightError,
  listRubricTemplates,
  resolveRubric,
  type RubricCriterion,
  type RubricTemplate,
} from "@/shared/lib/api/rubricTemplates";
import { hasPermission } from "@/shared/lib/permissions";

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

const CUSTOM_RUBRIC_VALUE = "__custom__";

function slugifyLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug || "criterion";
}

function rowRubricSelectValue(row: RubricAssignment): string {
  if (row.templateId) return String(row.templateId);
  if (Array.isArray(row.criteria) && row.criteria.length > 0) return CUSTOM_RUBRIC_VALUE;
  return "";
}

export default function JobRubricSection({
  value,
  onChange,
  jobId,
  onValidityChange,
}: JobRubricSectionProps) {
  const auth = useAuth();
  const canEdit = hasPermission(auth, "manage_interview_rubrics");

  const [stash, setStash] = useState<RubricAssignment[]>([]);
  const [templates, setTemplates] = useState<RubricTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [previewName, setPreviewName] = useState<string | null>(null);
  const [previewCriteria, setPreviewCriteria] = useState<RubricCriterion[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const sectionOn = value.length > 0;
  const validationError = useMemo(() => rubricAssignmentsError(value), [value]);

  useEffect(() => {
    if (!canEdit) {
      onValidityChange?.(null);
      return;
    }
    onValidityChange?.(validationError);
  }, [canEdit, validationError, onValidityChange]);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await listRubricTemplates(false);
      setTemplates(res.results || []);
    } catch (err: unknown) {
      setTemplatesError((err as Error)?.message || "Could not load rubric templates.");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canEdit) return;
    void loadTemplates();
  }, [canEdit, loadTemplates]);

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const resolved = await resolveRubric({ jobId: jobId || null, roundType: null });
      setPreviewName(resolved.templateName);
      setPreviewCriteria(resolved.criteria || []);
    } catch (err: unknown) {
      setPreviewError((err as Error)?.message || "Could not load the default rubric preview.");
      setPreviewName(null);
      setPreviewCriteria([]);
    } finally {
      setPreviewLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (sectionOn) return;
    void loadPreview();
  }, [sectionOn, loadPreview]);

  const usedRoundTypes = useMemo(() => {
    const set = new Set<string>();
    for (const row of value) {
      if (row.roundType) set.add(row.roundType);
    }
    return set;
  }, [value]);

  const setToggle = (nextOn: boolean) => {
    if (!canEdit) return;
    if (nextOn) {
      if (value.length > 0) return;
      if (stash.length > 0) {
        onChange(stash);
        setStash([]);
      } else {
        onChange([{ roundType: null }]);
      }
      return;
    }
    if (value.length === 0) return;
    setStash(value);
    onChange([]);
  };

  const updateRow = (index: number, patch: Partial<RubricAssignment>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...value, { roundType: null }]);
  };

  const updateCustomCriteria = (rowIndex: number, criteria: EditorCriterion[]) => {
    updateRow(rowIndex, {
      criteria: criteria.map(({ key, label, weight, scaleMin, scaleMax }) => ({
        key,
        label,
        weight,
        scaleMin,
        scaleMax,
      })),
      templateId: null,
    });
  };

  const previewLine = (
    <div className="mt-2 rounded-md border border-defaultborder/40 bg-gray-50/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]">
      {previewLoading ? (
        <div className="animate-pulse space-y-2" aria-hidden="true">
          <div className="h-3 w-40 rounded bg-gray-200 dark:bg-white/10" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-6 w-24 rounded bg-gray-200 dark:bg-white/10" />
          </div>
        </div>
      ) : previewError ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-danger">{previewError}</span>
          <button type="button" className="ti-btn ti-btn-light !py-1 !text-xs" onClick={() => void loadPreview()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <p className="text-defaulttextcolor/80 dark:text-white/80">
            Default rubric: <span className="font-medium text-defaulttextcolor dark:text-white">{previewName}</span>
          </p>
          {previewCriteria.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {previewCriteria.map((c) => (
                <span
                  key={c.key}
                  className="inline-flex rounded-full border border-defaultborder/50 bg-white px-2 py-0.5 text-xs tabular-nums dark:border-white/15 dark:bg-transparent"
                >
                  {c.label} {c.weight}%
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <section className="box mb-4">
      <div className="box-header">
        <h3 className="box-title text-base">Interview scoring</h3>
      </div>
      <div className="box-body space-y-4">
        {canEdit ? (
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="ti-form-checkbox"
              checked={sectionOn}
              onChange={(e) => setToggle(e.target.checked)}
            />
            Set interview scoring for this job
          </label>
        ) : (
          <p className="text-sm text-defaulttextcolor/70 dark:text-white/70">
            Interview scoring for this job (read-only)
          </p>
        )}

        {!sectionOn && previewLine}

        {!sectionOn && stash.length > 0 && canEdit && (
          <p className="text-xs text-defaulttextcolor/60 dark:text-white/60">
            Turning this off removes {stash.length} assignment{stash.length === 1 ? "" : "s"} when you save the job.
          </p>
        )}

        {sectionOn && canEdit && (
          <>
            {validationError && (
              <p role="alert" className="text-sm text-danger">
                {validationError}
              </p>
            )}

            {templatesError && (
              <p className="text-xs text-danger">
                {templatesError}{" "}
                <button type="button" className="underline" onClick={() => void loadTemplates()}>
                  Retry
                </button>
              </p>
            )}

            <div className="space-y-4">
              {value.map((row, index) => {
                const roundOptions = INTERVIEW_ROUND_TYPE_OPTIONS.filter(
                  (opt) => opt.value === row.roundType || !usedRoundTypes.has(opt.value)
                );
                const rubricValue = rowRubricSelectValue(row);
                const customCriteria = (Array.isArray(row.criteria) ? row.criteria : []).map((c) => ({
                  ...c,
                  keyFrozen: Boolean(String(c.label || "").trim()),
                }));
                const customWeightError = customCriteria.length ? criteriaWeightError(customCriteria) : null;
                const customWeightTotal = customCriteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

                return (
                  <div
                    key={`assignment-${index}`}
                    className="rounded-lg border border-defaultborder/70 p-3 dark:border-white/10"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`rubric-round-${index}`} className="form-label mb-1 block text-sm font-medium">
                          Round
                        </label>
                        <select
                          id={`rubric-round-${index}`}
                          className="form-select w-full text-sm"
                          value={row.roundType ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateRow(index, { roundType: v ? (v as InterviewRoundType) : null });
                          }}
                        >
                          <option value="">Any round (job default)</option>
                          {roundOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`rubric-pick-${index}`} className="form-label mb-1 block text-sm font-medium">
                          Rubric
                        </label>
                        <select
                          id={`rubric-pick-${index}`}
                          className="form-select w-full text-sm"
                          value={rubricValue}
                          disabled={templatesLoading}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!v) {
                              updateRow(index, { templateId: null, criteria: null });
                              return;
                            }
                            if (v === CUSTOM_RUBRIC_VALUE) {
                              updateRow(index, {
                                templateId: null,
                                criteria: [
                                  {
                                    key: "criterion",
                                    label: "",
                                    weight: 0,
                                    scaleMin: 1,
                                    scaleMax: 5,
                                  },
                                ],
                              });
                              return;
                            }
                            updateRow(index, { templateId: v, criteria: null });
                          }}
                        >
                          <option value="" disabled>
                            Choose a rubric…
                          </option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                          <option value={CUSTOM_RUBRIC_VALUE}>Custom for this job</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        className="ti-btn ti-btn-light !text-xs sm:mb-0.5"
                        onClick={() => removeRow(index)}
                        disabled={value.length <= 1}
                      >
                        Remove row
                      </button>
                    </div>

                    {rubricValue === CUSTOM_RUBRIC_VALUE && (
                      <div className="mt-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">Custom criteria</p>
                          <p className="text-xs tabular-nums text-defaulttextcolor/70 dark:text-white/70">
                            Weight total: <span className="font-semibold">{customWeightTotal}%</span>
                          </p>
                        </div>
                        <p className="text-xs text-defaulttextcolor/60 dark:text-white/60">
                          The criterion key is derived from the label when you add a row, then frozen. Stored ratings
                          reference the key — rename the label, never the key.
                        </p>
                        {customWeightError && <p className="text-xs text-danger">{customWeightError}</p>}
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
                              {customCriteria.map((criterion, cIndex) => (
                                <tr
                                  key={`${criterion.key}-${cIndex}`}
                                  className="border-t border-defaultborder/50 dark:border-white/10"
                                >
                                  <td className="px-2 py-2">
                                    <input
                                      type="text"
                                      aria-label={`Criterion ${cIndex + 1} label`}
                                      className="form-control !rounded-md !py-1 text-sm"
                                      value={criterion.label}
                                      onChange={(e) => {
                                        const next = [...customCriteria];
                                        const rowCrit = { ...next[cIndex], label: e.target.value };
                                        if (!rowCrit.keyFrozen) {
                                          rowCrit.key = slugifyLabel(e.target.value);
                                        }
                                        next[cIndex] = rowCrit;
                                        updateCustomCriteria(index, next);
                                      }}
                                    />
                                  </td>
                                  <td className="px-2 py-2 text-xs text-defaulttextcolor/60 dark:text-white/60">
                                    {criterion.key}
                                  </td>
                                  <td className="px-2 py-2">
                                    <input
                                      type="number"
                                      aria-label={`Criterion ${cIndex + 1} weight`}
                                      className="form-control !w-20 !min-h-11 !rounded-md !py-1 text-sm tabular-nums"
                                      value={criterion.weight}
                                      onChange={(e) => {
                                        const next = [...customCriteria];
                                        next[cIndex] = { ...next[cIndex], weight: Number(e.target.value) };
                                        updateCustomCriteria(index, next);
                                      }}
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <input
                                      type="number"
                                      aria-label={`Criterion ${cIndex + 1} scale min`}
                                      className="form-control !w-16 !min-h-11 !rounded-md !py-1 text-sm"
                                      value={criterion.scaleMin}
                                      onChange={(e) => {
                                        const next = [...customCriteria];
                                        next[cIndex] = { ...next[cIndex], scaleMin: Number(e.target.value) };
                                        updateCustomCriteria(index, next);
                                      }}
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <input
                                      type="number"
                                      aria-label={`Criterion ${cIndex + 1} scale max`}
                                      className="form-control !w-16 !min-h-11 !rounded-md !py-1 text-sm"
                                      value={criterion.scaleMax}
                                      onChange={(e) => {
                                        const next = [...customCriteria];
                                        next[cIndex] = { ...next[cIndex], scaleMax: Number(e.target.value) };
                                        updateCustomCriteria(index, next);
                                      }}
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <button
                                      type="button"
                                      className="text-xs text-danger hover:underline"
                                      onClick={() => {
                                        const next = customCriteria.filter((_, i) => i !== cIndex);
                                        updateCustomCriteria(index, next);
                                      }}
                                      disabled={customCriteria.length <= 1}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <button
                          type="button"
                          className="ti-btn ti-btn-light !text-xs"
                          onClick={() => {
                            updateCustomCriteria(index, [
                              ...customCriteria,
                              {
                                key: "criterion",
                                label: "",
                                weight: 0,
                                scaleMin: 1,
                                scaleMax: 5,
                                keyFrozen: false,
                              },
                            ]);
                          }}
                        >
                          Add criterion
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {value.length < MAX_RUBRIC_ASSIGNMENTS && (
              <button type="button" className="ti-btn ti-btn-light !text-xs" onClick={addRow}>
                Add assignment row
              </button>
            )}
          </>
        )}

        {sectionOn && !canEdit && previewLine}
      </div>
    </section>
  );
}
