"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { criteriaWeightError, type RubricCriterion } from "@/shared/lib/api/rubricTemplates";

export type RubricCriteriaEditorProps = {
  value: RubricCriterion[];
  onChange: (next: RubricCriterion[]) => void;
  disabled?: boolean;
  /**
   * Prefix for every generated DOM id and `htmlFor`. Required, because this editor can
   * appear several times on one page — once per round in the job form — and duplicate ids
   * silently break every label/input pairing after the first.
   */
  idPrefix: string;
  /** When true, criterion keys do not follow label edits (saved templates). */
  keysFrozen?: boolean;
};

/**
 * A row's React key. NOT derived from the row's own data.
 *
 * The criterion key follows the label until first save, so keying on it changed the key on
 * every keystroke. React then unmounted the <tr>, the <input> became a fresh DOM node, and
 * the caret was lost after each word. rowId is generated once and never changes.
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
 * to `problem_solving`, as do two blank labels. That used to surface as
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

function toEditorCriteria(criteria: RubricCriterion[], keysFrozen: boolean): EditorCriterion[] {
  return criteria.map((c) => ({ ...c, keyFrozen: keysFrozen, rowId: nextRowId() }));
}

function stripEditorCriteria(rows: EditorCriterion[]): RubricCriterion[] {
  return rows.map(({ key, label, weight, scaleMin, scaleMax }) => ({
    key,
    label,
    weight,
    scaleMin,
    scaleMax,
  }));
}

export default function RubricCriteriaEditor({
  value,
  onChange,
  disabled = false,
  idPrefix,
  keysFrozen = false,
}: RubricCriteriaEditorProps) {
  const [criteria, setCriteria] = useState<EditorCriterion[]>(() => toEditorCriteria(value, keysFrozen));
  const lastEmitted = useRef<string>(JSON.stringify(value));
  const frozenRef = useRef(keysFrozen);

  useEffect(() => {
    frozenRef.current = keysFrozen;
  }, [keysFrozen]);

  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized === lastEmitted.current) return;
    lastEmitted.current = serialized;
    setCriteria(toEditorCriteria(value, frozenRef.current));
  }, [value]);

  const emit = useCallback(
    (next: EditorCriterion[]) => {
      setCriteria(next);
      const stripped = stripEditorCriteria(next);
      lastEmitted.current = JSON.stringify(stripped);
      onChange(stripped);
    },
    [onChange]
  );

  const weightError = useMemo(() => criteriaWeightError(criteria), [criteria]);
  const weightTotal = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  const zeroWeightLabels = useMemo(
    () =>
      criteria
        .filter((c) => (Number(c.weight) || 0) <= 0)
        .map((c) => (c.label || "").trim() || "Untitled criterion"),
    [criteria]
  );

  const updateCriterion = (index: number, patch: Partial<EditorCriterion>) => {
    const next = [...criteria];
    const row = { ...next[index], ...patch };
    if (!row.keyFrozen && patch.label !== undefined) {
      const taken = new Set(next.filter((_, i) => i !== index).map((c) => c.key));
      row.key = uniqueKeyForLabel(patch.label, taken);
    }
    next[index] = row;
    emit(next);
  };

  const addCriterion = () => {
    emit([
      ...criteria,
      {
        key: uniqueKeyForLabel("", new Set(criteria.map((c) => c.key))),
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
    emit(criteria.filter((_, i) => i !== index));
  };

  return (
    <div>
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
                    will not affect the score. Interviewers still see them and can still rate them — give them weight or
                    remove them.
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
                    id={`${idPrefix}-label-${index}`}
                    type="text"
                    aria-label={`Criterion ${index + 1} label`}
                    className="form-control !rounded-md !py-1 text-sm"
                    value={row.label}
                    disabled={disabled}
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
                    disabled={disabled}
                    onChange={(e) => updateCriterion(index, { weight: Number(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    aria-label={`Criterion ${index + 1} scale min`}
                    className="form-control !w-16 !rounded-md !py-1 text-sm"
                    value={row.scaleMin}
                    disabled={disabled}
                    onChange={(e) => updateCriterion(index, { scaleMin: Number(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    aria-label={`Criterion ${index + 1} scale max`}
                    className="form-control !w-16 !rounded-md !py-1 text-sm"
                    value={row.scaleMax}
                    disabled={disabled}
                    onChange={(e) => updateCriterion(index, { scaleMax: Number(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    className="text-xs text-danger hover:underline"
                    onClick={() => removeCriterion(index)}
                    disabled={disabled || criteria.length <= 1}
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
        className="ti-btn ti-btn-light mt-2 !text-xs"
        onClick={addCriterion}
        disabled={disabled}
      >
        Add criterion
      </button>
    </div>
  );
}
