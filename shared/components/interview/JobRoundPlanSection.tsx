"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import {
  MAX_PLANNED_ROUNDS,
  nextPlanKey,
  roundPlanError,
  type InterviewRoundPlanRow,
} from "@/shared/lib/api/jobs";
import type { InterviewRoundType } from "@/shared/lib/api/meetings";
import { INTERVIEW_ROUND_TYPE_OPTIONS } from "@/app/(components)/(contentlayout)/ats/interviews/_components/interviewLinkage";
import RubricCriteriaEditor from "@/shared/components/interview/RubricCriteriaEditor";
import {
  createRubricTemplate,
  listRubricTemplates,
  resolveRubric,
  type ResolvedRubric,
  type RubricCriterion,
  type RubricTemplate,
} from "@/shared/lib/api/rubricTemplates";

const RUBRIC_CUSTOM = "__custom__";

export type JobRoundPlanSectionProps = {
  value: InterviewRoundPlanRow[];
  onChange: (next: InterviewRoundPlanRow[]) => void;
  jobId?: string | null;
  onValidityChange?: (error: string | null) => void;
};

function errorTargetsRow(message: string | null, row: InterviewRoundPlanRow): boolean {
  if (!message) return false;
  const name = (row.label || "").trim();
  if (name && message.includes(name)) return true;
  return message.includes(`"${row.key}"`);
}

function rubricSelectValue(row: InterviewRoundPlanRow): string {
  if (row.templateId) return row.templateId;
  if (Array.isArray(row.criteria) && row.criteria.length > 0) return RUBRIC_CUSTOM;
  return "";
}

function RoundRubricPreview({
  jobId,
  row,
}: {
  jobId?: string | null;
  row: InterviewRoundPlanRow;
}) {
  const [preview, setPreview] = useState<ResolvedRubric | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Array.isArray(row.criteria) && row.criteria.length > 0) {
      setPreview({
        templateId: null,
        templateName: "Custom for this round",
        criteria: row.criteria,
      });
      return;
    }
    if (!row.templateId) {
      setPreview(null);
      return;
    }
    setLoading(true);
    void resolveRubric({
      jobId: jobId ?? undefined,
      roundType: row.roundType ?? undefined,
    })
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, [jobId, row.templateId, row.roundType, row.criteria]);

  if (!row.templateId && !(row.criteria?.length)) return null;
  if (loading) return <p className="mt-2 text-xs text-textmuted dark:text-white/55">Loading rubric preview…</p>;
  if (!preview) return null;

  return (
    <div className="mt-2 rounded-md border border-defaultborder/60 bg-gray-50/80 p-2 text-xs dark:border-white/10 dark:bg-white/[0.03]">
      <p className="font-medium text-defaulttextcolor dark:text-white">{preview.templateName}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {(preview.criteria || []).map((c) => (
          <span
            key={c.key}
            className="rounded-md bg-white px-2 py-0.5 tabular-nums text-defaulttextcolor/80 shadow-sm dark:bg-white/10 dark:text-white/80"
          >
            {c.label} {c.weight}%
          </span>
        ))}
      </div>
    </div>
  );
}

export default function JobRoundPlanSection({
  value,
  onChange,
  jobId,
  onValidityChange,
}: JobRoundPlanSectionProps) {
  const auth = useAuth();
  const canManage = hasPermission(auth, "manage_interview_rubrics");

  const [stashedRows, setStashedRows] = useState<InterviewRoundPlanRow[] | null>(null);
  const [templates, setTemplates] = useState<RubricTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [defaultPreview, setDefaultPreview] = useState<ResolvedRubric | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const validationError = useMemo(() => roundPlanError(value), [value]);
  const sectionEnabled = value.length > 0;

  const loadTemplates = useCallback(() => {
    setTemplatesError(null);
    return listRubricTemplates(true)
      .then((res) => setTemplates(res.results || []))
      .catch(() => {
        setTemplates([]);
        setTemplatesError("Could not load saved rubrics.");
      });
  }, []);

  const loadDefaultPreview = useCallback(() => {
    setPreviewLoading(true);
    setPreviewError(null);
    return resolveRubric({ jobId: jobId ?? undefined })
      .then((resolved) => setDefaultPreview(resolved))
      .catch(() => {
        setDefaultPreview(null);
        setPreviewError("Could not load the default rubric preview.");
      })
      .finally(() => setPreviewLoading(false));
  }, [jobId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!sectionEnabled) {
      void loadDefaultPreview();
    }
  }, [sectionEnabled, loadDefaultPreview]);

  useEffect(() => {
    if (!canManage) {
      onValidityChange?.(null);
      return;
    }
    onValidityChange?.(validationError);
  }, [canManage, validationError, onValidityChange]);

  const moveRow = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= value.length) return;
      const next = [...value];
      const [row] = next.splice(from, 1);
      next.splice(to, 0, row);
      onChange(next);
    },
    [value, onChange]
  );

  const addRound = useCallback(() => {
    if (value.length >= MAX_PLANNED_ROUNDS) return;
    const taken = new Set(value.map((r) => r.key));
    onChange([
      ...value,
      {
        key: nextPlanKey(taken),
        label: `Round ${value.length + 1}`,
        roundType: null,
        templateId: null,
        criteria: null,
      },
    ]);
  }, [value, onChange]);

  const seedStandardPlan = useCallback(() => {
    const taken = new Set<string>();
    const row = (label: string, roundType: InterviewRoundType) => {
      const key = nextPlanKey(taken);
      taken.add(key);
      return {
        key,
        label,
        roundType,
        templateId: null,
        criteria: null,
      } satisfies InterviewRoundPlanRow;
    };
    onChange([row("Screening", "screening"), row("Technical", "technical"), row("HR", "hr")]);
  }, [onChange]);

  const updateRow = (index: number, patch: Partial<InterviewRoundPlanRow>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    if (next.length === 0 && value.length > 0) {
      setStashedRows(value);
    }
    onChange(next);
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
      const row = value[rowIndex];
      onChange(
        value.map((r, i) =>
          i === rowIndex ? { ...row, templateId: created.id, criteria: null } : r
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

  const defaultPreviewBlock = (
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
          <p className="text-xs text-danger">{previewError}</p>
          <button type="button" className="ti-btn ti-btn-light mt-2 !text-xs" onClick={() => void loadDefaultPreview()}>
            Retry
          </button>
        </div>
      )}
      {!previewLoading && !previewError && defaultPreview && (
        <>
          <p className="mt-1 font-medium text-defaulttextcolor dark:text-white">{defaultPreview.templateName}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(defaultPreview.criteria || []).map((c) => (
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

  const roundTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of value) {
      const rt = row.roundType;
      if (!rt) continue;
      counts.set(rt, (counts.get(rt) || 0) + 1);
    }
    return counts;
  }, [value]);

  return (
    <section className="mt-6 border-t border-gray-200 pt-6 dark:border-defaultborder/10">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-defaulttextcolor dark:text-white">Interview rounds</h3>
        <p className="mt-1 text-sm text-textmuted dark:text-white/60">
          Rounds are held in this order. Each one is scored against its own rubric, and a candidate reaches Offer once
          every round here is passed. Leave this empty and interviews work exactly as they do now — rounds are scheduled
          one at a time with no set sequence.
        </p>
        {sectionEnabled && (
          <p className="mt-2 text-xs text-textmuted dark:text-white/55">
            Scheduling these rounds needs interview management access.
          </p>
        )}
      </div>

      {!canManage && (
        <p className="mt-3 text-sm text-textmuted dark:text-white/60">
          Interview rounds are set by someone with interview management access. You can still edit every other field on
          this job.
        </p>
      )}

      {canManage && !sectionEnabled && (
        <div className="mt-4 space-y-3">
          <button type="button" className="ti-btn ti-btn-light !text-sm min-h-[44px]" onClick={seedStandardPlan}>
            Use a standard 3-round plan
          </button>
          {stashedRows && stashedRows.length > 0 && (
            <button
              type="button"
              className="ti-btn ti-btn-secondary !text-sm min-h-[44px]"
              onClick={() => {
                onChange(stashedRows);
                setStashedRows(null);
              }}
            >
              Restore previous rounds
            </button>
          )}
          {defaultPreviewBlock}
          <button type="button" className="ti-btn ti-btn-primary !text-sm min-h-[44px]" onClick={addRound}>
            Add round
          </button>
        </div>
      )}

      {canManage && sectionEnabled && (
        <div className="mt-4 space-y-4">
          {validationError && !value.some((row) => errorTargetsRow(validationError, row)) && (
            <p className="text-xs text-danger" role="alert">{validationError}</p>
          )}
          {templatesError && <p className="text-xs text-danger">{templatesError}</p>}

          {value.map((row, index) => {
            const rowError = errorTargetsRow(validationError, row) ? validationError : null;
            const duplicateTypeCount = row.roundType ? roundTypeCounts.get(row.roundType) || 0 : 0;
            const roundLabel = (row.label || "").trim() || `Round ${index + 1}`;

            return (
              <div key={row.key} className="rounded-lg border border-defaultborder/70 p-3 dark:border-white/10">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="ti-btn ti-btn-light !min-h-[44px] !px-2 !text-xs"
                      disabled={index === 0}
                      aria-label={`Move ${roundLabel} up`}
                      onClick={() => moveRow(index, index - 1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-light !min-h-[44px] !px-2 !text-xs"
                      disabled={index === value.length - 1}
                      aria-label={`Move ${roundLabel} down`}
                      onClick={() => moveRow(index, index + 1)}
                    >
                      ↓
                    </button>
                    <span className="text-xs font-medium text-textmuted dark:text-white/55">Round {index + 1}</span>
                  </div>

                  <div className="flex flex-col gap-3 sm:grid sm:grid-cols-12 sm:items-end">
                    <div className="sm:col-span-4">
                      <label className="form-label mb-1 block text-xs font-medium" htmlFor={`plan-label-${row.key}`}>
                        Round name
                      </label>
                      <input
                        id={`plan-label-${row.key}`}
                        type="text"
                        className="form-control w-full min-h-[44px] text-sm"
                        value={row.label}
                        onChange={(e) => updateRow(index, { label: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="form-label mb-1 block text-xs font-medium" htmlFor={`plan-type-${row.key}`}>
                        Round type
                      </label>
                      <select
                        id={`plan-type-${row.key}`}
                        className="form-select w-full min-h-[44px] text-sm !bg-white dark:!bg-bodybg"
                        style={{ colorScheme: "light" }}
                        value={row.roundType ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(index, { roundType: v ? (v as InterviewRoundType) : null });
                        }}
                      >
                        <option value="">Not set</option>
                        {INTERVIEW_ROUND_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {duplicateTypeCount > 1 && (
                        <p className="mt-1 text-xs text-textmuted dark:text-white/55">
                          Another round uses this type. The round name is what tells them apart on the schedule form and
                          in the candidate&rsquo;s history — give each one a distinct name.
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-4">
                      <label className="form-label mb-1 block text-xs font-medium" htmlFor={`plan-rubric-${row.key}`}>
                        Rubric
                      </label>
                      <select
                        id={`plan-rubric-${row.key}`}
                        className="form-select w-full min-h-[44px] text-sm !bg-white dark:!bg-bodybg"
                        style={{ colorScheme: "light" }}
                        value={rubricSelectValue(row)}
                        onChange={(e) => handleRubricPick(index, e.target.value)}
                      >
                        <option value="" disabled>Select a rubric</option>
                        {templates
                          .filter((t) => !t.archivedAt || t.id === row.templateId)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                              {t.archivedAt ? " (archived)" : ""}
                            </option>
                          ))}
                        <option value={RUBRIC_CUSTOM}>Define for this round</option>
                      </select>
                    </div>
                    <div className="sm:col-span-1 flex sm:justify-end">
                      <button
                        type="button"
                        className="ti-btn ti-btn-light !text-xs min-h-[44px]"
                        onClick={() => removeRow(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {rowError && (
                  <p className="mt-2 text-xs text-danger" role="alert">{rowError}</p>
                )}

                <RoundRubricPreview jobId={jobId} row={row} />

                {rubricSelectValue(row) === RUBRIC_CUSTOM && (
                  <div className="mt-3 space-y-2">
                    <RubricCriteriaEditor
                      idPrefix={`plan-${row.key}`}
                      value={row.criteria || []}
                      onChange={(criteria) => updateRow(index, { criteria })}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="ti-btn ti-btn-secondary !text-xs min-h-[44px]"
                        onClick={() => void promoteToTemplate(index, row.criteria || [])}
                      >
                        Save as reusable template
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {value.length < MAX_PLANNED_ROUNDS && (
            <button type="button" className="ti-btn ti-btn-light !text-xs min-h-[44px]" onClick={addRound}>
              Add round
            </button>
          )}
        </div>
      )}

      {!canManage && defaultPreviewBlock}
    </section>
  );
}
