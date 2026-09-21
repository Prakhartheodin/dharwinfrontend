"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { InterviewRoundType } from "@/shared/lib/api/meetings";
import { INTERVIEW_ROUND_TYPE_OPTIONS } from "../../interviews/_components/interviewLinkage";
import RubricCriteriaEditor from "@/shared/components/interview/RubricCriteriaEditor";
import {
  archiveRubricTemplate,
  createRubricTemplate,
  criteriaWeightError,
  getRubricTemplateUsage,
  restoreRubricTemplate,
  updateRubricTemplate,
  type RubricCriterion,
  type RubricTemplate,
  type RubricTemplateUsage,
} from "@/shared/lib/api/rubricTemplates";
import { getApiErrorMessage } from "@/shared/lib/api/client";

/** Mirrors backend DEFAULT_RUBRIC_CRITERIA. Keys are frozen on stored ratings; editor defaults only seed NEW templates. */
export const DEFAULT_RUBRIC_CRITERIA: RubricCriterion[] = [
  { key: "technical", label: "Technical Skills", weight: 40, scaleMin: 1, scaleMax: 5 },
  { key: "communication", label: "Communication Skills", weight: 25, scaleMin: 1, scaleMax: 5 },
  { key: "problemSolving", label: "Problem Solving", weight: 20, scaleMin: 1, scaleMax: 5 },
  { key: "cultureFit", label: "Cultural Fit", weight: 15, scaleMin: 1, scaleMax: 5 },
];

export default function RubricTemplateEditor({
  template,
  onSaved,
  onCancel,
}: {
  template: RubricTemplate | null;
  onSaved: (saved: RubricTemplate) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(template?.id);
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [roundType, setRoundType] = useState<InterviewRoundType | "">(
    template?.appliesTo?.roundType ?? ""
  );
  const [isDefault, setIsDefault] = useState(Boolean(template?.isDefault));
  const [criteria, setCriteria] = useState<RubricCriterion[]>(() =>
    template?.criteria?.length ? template.criteria : DEFAULT_RUBRIC_CRITERIA
  );
  const [usage, setUsage] = useState<RubricTemplateUsage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!template?.id) {
      setUsage(null);
      return;
    }
    void getRubricTemplateUsage(template.id)
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [template?.id]);

  const weightError = useMemo(() => criteriaWeightError(criteria), [criteria]);

  const handleSave = async () => {
    setFieldError(null);
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFieldError("Name is required.");
      return;
    }
    if (weightError) return;
    setBusy(true);
    try {
      const payload = {
        name: trimmedName,
        description: description.trim(),
        criteria,
        appliesTo: {
          roundType: roundType || null,
        },
        isDefault,
      };
      const saved = isEdit && template?.id
        ? await updateRubricTemplate(template.id, payload)
        : await createRubricTemplate(payload);
      onSaved(saved);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not save the rubric."));
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!template?.id || busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await archiveRubricTemplate(template.id);
      onSaved(saved);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to archive the rubric."));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!template?.id || busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await restoreRubricTemplate(template.id);
      onSaved(saved);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not restore the rubric."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="rubric-name" className="form-label mb-1 block text-sm font-medium">
          Name
        </label>
        <input
          id="rubric-name"
          type="text"
          className="form-control w-full !rounded-md text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {fieldError && <p className="mt-1 text-xs text-danger">{fieldError}</p>}
      </div>

      <div>
        <label htmlFor="rubric-description" className="form-label mb-1 block text-sm font-medium">
          Description
        </label>
        <textarea
          id="rubric-description"
          rows={2}
          className="form-control w-full resize-none !rounded-md text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="text-xs text-defaulttextcolor/60 dark:text-white/60">
            To use this rubric for a specific job, open that job and set it under Interview scoring.
          </p>
        </div>
        <div>
          <label htmlFor="rubric-round-type" className="form-label mb-1 block text-sm font-medium">
            Applies to round type (filter only, optional)
          </label>
          <select
            id="rubric-round-type"
            className="form-select w-full text-sm"
            value={roundType}
            onChange={(e) => setRoundType(e.target.value as InterviewRoundType | "")}
          >
            <option value="">Any round type</option>
            {INTERVIEW_ROUND_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-textmuted dark:text-white/55">
            Filters the job-form list. It does not pick the rubric for a round. Bind a
            rubric on the job under Interview rounds.
          </p>
        </div>
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="ti-form-checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        Default rubric
      </label>

      <div>
        {isEdit && usage && usage.jobCount > 0 && (
          <div className="mb-3 rounded-lg border border-warning/25 bg-warning/[0.06] p-3 text-sm">
            Used by {usage.jobCount} {usage.jobCount === 1 ? "job" : "jobs"}
            {usage.jobs.length ? `: ${usage.jobs.map((j) => j.title).join(", ")}` : ""}.
            Changing the weights changes how those jobs score future interviews.
          </div>
        )}
        <RubricCriteriaEditor
          value={criteria}
          onChange={setCriteria}
          idPrefix="tpl-criteria"
          keysFrozen={isEdit}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-defaultborder pt-4 dark:border-white/10">
        <button type="button" className="ti-btn ti-btn-light" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        {isEdit && template?.archivedAt && (
          <button type="button" className="ti-btn ti-btn-success" onClick={() => void handleRestore()} disabled={busy}>
            Restore
          </button>
        )}
        {isEdit && !template?.archivedAt && (
          <button type="button" className="ti-btn ti-btn-danger" onClick={() => void handleArchive()} disabled={busy}>
            Archive
          </button>
        )}
        <button
          type="button"
          className="ti-btn ti-btn-primary"
          onClick={() => void handleSave()}
          disabled={busy || Boolean(weightError)}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
