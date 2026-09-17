"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { InterviewRoundType } from "@/shared/lib/api/meetings";
import { INTERVIEW_ROUND_TYPE_OPTIONS } from "../../interviews/_components/interviewLinkage";
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

export const DEFAULT_RUBRIC_CRITERIA: RubricCriterion[] = [
  { key: "technical", label: "Technical", weight: 40, scaleMin: 1, scaleMax: 5 },
  { key: "communication", label: "Communication", weight: 25, scaleMin: 1, scaleMax: 5 },
  { key: "problem_solving", label: "Problem Solving", weight: 20, scaleMin: 1, scaleMax: 5 },
  { key: "culture_fit", label: "Culture Fit", weight: 15, scaleMin: 1, scaleMax: 5 },
];

/**
 * `rowId` is a render identity — never persisted, never derived from the data.
 *
 * It exists because `key` is recomputed from the label on every keystroke of an unfrozen
 * row. Keying the <tr> on that made React unmount and remount the row per character, so
 * the label input became a new DOM node mid-word and the caret was lost.
 */
type EditorCriterion = RubricCriterion & { keyFrozen: boolean; rowId: string };

let rowIdCounter = 0;
const nextRowId = () => `row-${(rowIdCounter += 1)}`;

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
 * Derive a key from the label that cannot collide with another row's.
 *
 * Punctuation collapses to `_`, so "Problem Solving!" and "Problem Solving?" both slugify
 * to `problem_solving`, as do two blank labels (both `criterion`). That used to surface as
 * "Duplicate criterion key: problem_solving" against two labels that visibly differ — an
 * error naming a concept the form never showed. Suffixing means the user never meets it.
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

function toEditorCriteria(criteria: RubricCriterion[], freezeKeys: boolean): EditorCriterion[] {
  return criteria.map((c) => ({ ...c, keyFrozen: freezeKeys, rowId: nextRowId() }));
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
  const [roundType, setRoundType] = useState<InterviewRoundType | "">(
    template?.appliesTo?.roundType ?? ""
  );
  const [isDefault, setIsDefault] = useState(Boolean(template?.isDefault));
  const [criteria, setCriteria] = useState<EditorCriterion[]>(() =>
    toEditorCriteria(template?.criteria?.length ? template.criteria : DEFAULT_RUBRIC_CRITERIA, isEdit)
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
  const weightTotal = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  /**
   * computeWeightedScore skips any criterion with weight <= 0, so a 0% row is dead: the
   * interviewer still sees it and can still rate it, but it moves neither the score nor
   * the completeness count. Weights can legitimately still total 100 with one present,
   * so this warns rather than blocks.
   */
  const zeroWeightLabels = useMemo(
    () =>
      criteria
        .filter((c) => (Number(c.weight) || 0) <= 0)
        .map((c) => (c.label || "").trim() || "Untitled criterion"),
    [criteria]
  );

  const updateCriterion = (index: number, patch: Partial<EditorCriterion>) => {
    setCriteria((prev) => {
      const next = [...prev];
      const row = { ...next[index], ...patch };
      if (!row.keyFrozen && patch.label !== undefined) {
        // Every other row's key is off limits, so retyping a label can never collide.
        const taken = new Set(next.filter((_, i) => i !== index).map((c) => c.key));
        row.key = uniqueKeyForLabel(patch.label, taken);
      }
      next[index] = row;
      return next;
    });
  };

  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        key: uniqueKeyForLabel("", new Set(prev.map((c) => c.key))),
        label: "",
        weight: 0,
        scaleMin: 1,
        scaleMax: 5,
        keyFrozen: false,
        rowId: nextRowId(),
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
        {isEdit && usage && usage.jobCount > 0 && (
          <div className="mb-3 rounded-lg border border-warning/25 bg-warning/[0.06] p-3 text-sm">
            Used by {usage.jobCount} {usage.jobCount === 1 ? "job" : "jobs"}
            {usage.jobs.length ? `: ${usage.jobs.map((j) => j.title).join(", ")}` : ""}.
            Changing the weights changes how those jobs score future interviews.
          </div>
        )}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-defaulttextcolor dark:text-white">Criteria</p>
          <p className="text-xs tabular-nums text-defaulttextcolor/70 dark:text-white/70">
            Weight total: <span className="font-semibold">{weightTotal}%</span>
          </p>
        </div>
        <p className="mb-2 text-xs text-defaulttextcolor/60 dark:text-white/60">
          A new criterion&apos;s key follows its label until you save, then it is frozen. Stored ratings reference the
          key — after that, rename the label, never the key.
        </p>
        {/* One stack, blocker first. These are different severities — the weight total
            stops the save, the zero-weight note does not — so each carries a text label
            as well as a colour, and the two never read as interchangeable noise. */}
        {(weightError || zeroWeightLabels.length > 0) && (
          <div className="mb-3 space-y-2">
            {weightError && (
              <p
                className="flex gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
                role="alert"
              >
                <span className="font-semibold uppercase tracking-wide">Fix to save</span>
                <span className="min-w-0 flex-1">{weightError}</span>
              </p>
            )}
            {zeroWeightLabels.length > 0 && (
              <p
                className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning"
                role="status"
              >
                <span className="font-semibold uppercase tracking-wide">Heads up</span>
                <span className="min-w-0 flex-1">
                  {zeroWeightLabels.length === 1 ? (
                    <>
                      <strong className="font-semibold">{zeroWeightLabels[0]}</strong> has 0% weight, so it will not
                      affect the score. Interviewers still see it and can still rate it — give it weight or remove it.
                    </>
                  ) : (
                    <>
                      <strong className="font-semibold">{zeroWeightLabels.join(", ")}</strong> have 0% weight, so they
                      will not affect the score. Interviewers still see them and can still rate them — give them
                      weight or remove them.
                    </>
                  )}
                </span>
              </p>
            )}
          </div>
        )}
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
                <tr key={row.rowId} className="border-t border-defaultborder/50 dark:border-white/10">
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
