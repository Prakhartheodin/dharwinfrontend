"use client";

import React, { useEffect, useMemo, useState } from "react";
import { listJobs, type Job } from "@/shared/lib/api/jobs";
import type { InterviewRoundType } from "@/shared/lib/api/meetings";
import { INTERVIEW_ROUND_TYPE_OPTIONS } from "../../interviews/_components/interviewLinkage";
import {
  archiveRubricTemplate,
  createRubricTemplate,
  criteriaWeightError,
  restoreRubricTemplate,
  updateRubricTemplate,
  type RubricCriterion,
  type RubricTemplate,
} from "@/shared/lib/api/rubricTemplates";
import { getApiErrorMessage } from "@/shared/lib/api/client";

export const DEFAULT_RUBRIC_CRITERIA: RubricCriterion[] = [
  { key: "technical", label: "Technical", weight: 40, scaleMin: 1, scaleMax: 5 },
  { key: "communication", label: "Communication", weight: 25, scaleMin: 1, scaleMax: 5 },
  { key: "problem_solving", label: "Problem Solving", weight: 20, scaleMin: 1, scaleMax: 5 },
  { key: "culture_fit", label: "Culture Fit", weight: 15, scaleMin: 1, scaleMax: 5 },
];

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

function toEditorCriteria(criteria: RubricCriterion[], freezeKeys: boolean): EditorCriterion[] {
  return criteria.map((c) => ({ ...c, keyFrozen: freezeKeys }));
}

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
  const [jobId, setJobId] = useState<string>(template?.appliesTo?.jobId ?? "");
  const [roundType, setRoundType] = useState<InterviewRoundType | "">(
    template?.appliesTo?.roundType ?? ""
  );
  const [isDefault, setIsDefault] = useState(Boolean(template?.isDefault));
  const [criteria, setCriteria] = useState<EditorCriterion[]>(() =>
    toEditorCriteria(template?.criteria?.length ? template.criteria : DEFAULT_RUBRIC_CRITERIA, isEdit)
  );
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    void listJobs({ limit: 200, sortBy: "title:asc" })
      .then((res) => setJobs(res.results || []))
      .catch(() => setJobs([]));
  }, []);

  const weightError = useMemo(() => criteriaWeightError(criteria), [criteria]);
  const weightTotal = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  const updateCriterion = (index: number, patch: Partial<EditorCriterion>) => {
    setCriteria((prev) => {
      const next = [...prev];
      const row = { ...next[index], ...patch };
      if (!row.keyFrozen && patch.label !== undefined) {
        row.key = slugifyLabel(patch.label);
      }
      next[index] = row;
      return next;
    });
  };

  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        key: "criterion",
        label: "",
        weight: 0,
        scaleMin: 1,
        scaleMax: 5,
        keyFrozen: false,
      },
    ]);
  };

  const removeCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

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
        criteria: criteria.map(({ key, label, weight, scaleMin, scaleMax }) => ({
          key,
          label,
          weight,
          scaleMin,
          scaleMax,
        })),
        appliesTo: {
          jobId: jobId || null,
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
      setError(getApiErrorMessage(err, "Could not archive the rubric."));
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
        <div>
          <label htmlFor="rubric-job" className="form-label mb-1 block text-sm font-medium">
            Applies to job (optional)
          </label>
          <select
            id="rubric-job"
            className="form-select w-full text-sm"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
          >
            <option value="">Any job</option>
            {jobs.map((job) => {
              const id = String(job.id ?? job._id ?? "");
              return (
                <option key={id} value={id}>
                  {job.title}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label htmlFor="rubric-round-type" className="form-label mb-1 block text-sm font-medium">
            Applies to round type (optional)
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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-defaulttextcolor dark:text-white">Criteria</p>
          <p className="text-xs tabular-nums text-defaulttextcolor/70 dark:text-white/70">
            Weight total: <span className="font-semibold">{weightTotal}%</span>
          </p>
        </div>
        <p className="mb-2 text-xs text-defaulttextcolor/60 dark:text-white/60">
          The criterion key is derived from the label when you add a row, then frozen. Stored ratings reference the
          key — rename the label, never the key.
        </p>
        {weightError && <p className="mb-2 text-xs text-danger">{weightError}</p>}
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
              {criteria.map((row, index) => (
                <tr key={`${row.key}-${index}`} className="border-t border-defaultborder/50 dark:border-white/10">
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      aria-label={`Criterion ${index + 1} label`}
                      className="form-control !rounded-md !py-1 text-sm"
                      value={row.label}
                      onChange={(e) => updateCriterion(index, { label: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2 text-xs text-defaulttextcolor/60 dark:text-white/60">{row.key}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      aria-label={`Criterion ${index + 1} weight`}
                      className="form-control !w-20 !rounded-md !py-1 text-sm tabular-nums"
                      value={row.weight}
                      onChange={(e) => updateCriterion(index, { weight: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      aria-label={`Criterion ${index + 1} scale min`}
                      className="form-control !w-16 !rounded-md !py-1 text-sm"
                      value={row.scaleMin}
                      onChange={(e) => updateCriterion(index, { scaleMin: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      aria-label={`Criterion ${index + 1} scale max`}
                      className="form-control !w-16 !rounded-md !py-1 text-sm"
                      value={row.scaleMax}
                      onChange={(e) => updateCriterion(index, { scaleMax: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="text-xs text-danger hover:underline"
                      onClick={() => removeCriterion(index)}
                      disabled={criteria.length <= 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="ti-btn ti-btn-light mt-2 !text-xs" onClick={addCriterion}>
          Add criterion
        </button>
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
