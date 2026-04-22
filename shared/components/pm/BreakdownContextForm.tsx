"use client";

import React, { useId } from "react";
import type { BreakdownContext, BreakdownConstraint, ProjectType, TeamSizeHint } from "@/shared/types/pmAssistant";
import styles from "./aiTaskBreakdownModal.module.css";

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "software", label: "Software" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "research", label: "Research" },
  { value: "design", label: "Design" },
  { value: "other", label: "Other" },
];

const TEAM_SIZES: { value: TeamSizeHint; label: string }[] = [
  { value: "1-3", label: "1–3" },
  { value: "4-8", label: "4–8" },
  { value: "9+", label: "9+" },
];

const CONSTRAINTS: { value: BreakdownConstraint; label: string }[] = [
  { value: "budget_cap", label: "Budget cap" },
  { value: "specific_people", label: "Specific people" },
  { value: "fixed_tech_stack", label: "Fixed tech stack" },
  { value: "regulatory_compliance", label: "Regulatory / compliance" },
  { value: "external_dependency", label: "External dependency" },
  { value: "hard_deadline", label: "Hard deadline" },
];

const TOKEN_DELIMS = /[,;\n]/;

function mergeTokens(existing: string[], pieces: string[], maxItems: number, maxTokenLen: number): string[] {
  const next = [...existing];
  for (const piece of pieces) {
    if (next.length >= maxItems) break;
    const t = piece.trim().slice(0, maxTokenLen);
    if (!t) continue;
    if (next.some((x) => x.toLowerCase() === t.toLowerCase())) continue;
    next.push(t);
  }
  return next;
}

function splitTypingBuffer(v: string): { complete: string[]; draft: string } {
  const endsWithSep = /[,;\n]$/.test(v);
  const rawParts = v.split(/[,;\n]+/);
  const trimmedAll = rawParts.map((s) => s.trim()).filter(Boolean);
  if (endsWithSep) {
    return { complete: trimmedAll, draft: "" };
  }
  if (!TOKEN_DELIMS.test(v)) {
    return { complete: [], draft: v };
  }
  const draft = (rawParts[rawParts.length - 1] ?? "").trim();
  const complete = rawParts
    .slice(0, -1)
    .map((s) => s.trim())
    .filter(Boolean);
  return { complete, draft };
}

function DeliverableChips({
  values,
  onChange,
  disabled,
  labelId,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  labelId: string;
}) {
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const maxItems = 10;
  const maxTokenLen = 80;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={`${styles.chipField} ${disabled ? styles.chipFieldDisabled : ""}`}
      onClick={() => {
        if (!disabled) inputRef.current?.focus();
      }}
    >
      {values.map((v, i) => (
        <span key={`${i}-${v}`} className={styles.chipTag} title={v}>
          <span className={styles.chipText}>{v}</span>
          <button
            type="button"
            className={styles.chipRemove}
            disabled={disabled}
            aria-label={`Remove ${v}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(values.filter((_, j) => j !== i));
            }}
          >
            <i className="ri-close-line text-[0.95rem] leading-none" aria-hidden />
          </button>
        </span>
      ))}
      {values.length < maxItems ? (
        <input
          ref={inputRef}
          type="text"
          className={styles.chipInput}
          value={draft}
          disabled={disabled}
          placeholder={values.length === 0 ? "Milestone or deliverable, Enter" : "Add more…"}
          aria-labelledby={labelId}
          onChange={(e) => {
            if (disabled) return;
            const v = e.target.value;
            const { complete, draft: d } = splitTypingBuffer(v);
            if (complete.length) {
              onChange(mergeTokens(values, complete, maxItems, maxTokenLen));
            }
            setDraft(d);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter") {
              e.preventDefault();
              const t = draft.trim();
              if (t) {
                onChange(mergeTokens(values, [t], maxItems, maxTokenLen));
                setDraft("");
              }
            } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
              e.preventDefault();
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (disabled) return;
            const t = draft.trim();
            if (!t) return;
            onChange(mergeTokens(values, [t], maxItems, maxTokenLen));
            setDraft("");
          }}
        />
      ) : null}
    </div>
  );
}

export interface BreakdownContextFormProps {
  value: BreakdownContext;
  onChange: (next: BreakdownContext) => void;
  disabled?: boolean;
  /** When false, only extra notes + legacy brief (caller may show a single optional textarea). */
  showFull?: boolean;
}

const defaultValue: BreakdownContext = { projectType: "software" };

export function getDefaultBreakdownContext(): BreakdownContext {
  return { ...defaultValue };
}

export function BreakdownContextForm({ value, onChange, disabled, showFull = true }: BreakdownContextFormProps) {
  const baseId = useId();
  const set = (patch: Partial<BreakdownContext>) => onChange({ ...value, ...patch });

  const toggleConstraint = (c: BreakdownConstraint) => {
    const cur = new Set(value.constraints || []);
    if (cur.has(c)) cur.delete(c);
    else cur.add(c);
    set({ constraints: [...cur] });
  };

  if (!showFull) {
    return (
      <div className="space-y-2">
        <label className="form-label" htmlFor={`${baseId}-extra`}>
          Extra notes (optional)
        </label>
        <textarea
          id={`${baseId}-extra`}
          className="form-control w-full min-h-[56px]"
          placeholder="Anything else the AI should know…"
          value={value.extraNotes ?? ""}
          onChange={(e) => set({ extraNotes: e.target.value.slice(0, 500) })}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-defaultborder/60 bg-white/[0.02] p-3 dark:border-white/10">
      <p className="text-[0.78rem] text-[#8c9097] dark:text-white/45 mb-0">
        Structured context improves first drafts. You can still use only extra notes if you prefer.
      </p>
      <div>
        <label className="form-label" htmlFor={`${baseId}-ptype`}>
          Project type
        </label>
        <select
          id={`${baseId}-ptype`}
          className="form-select w-full"
          value={value.projectType}
          onChange={(e) => set({ projectType: e.target.value as ProjectType })}
          disabled={disabled}
        >
          {PROJECT_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="form-label" htmlFor={`${baseId}-deadline`}>
            Target / deadline
          </label>
          <input
            id={`${baseId}-deadline`}
            type="date"
            className="form-control w-full"
            value={value.deadline?.slice(0, 10) ?? ""}
            onChange={(e) => set({ deadline: e.target.value ? e.target.value : undefined })}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="form-label" htmlFor={`${baseId}-team`}>
            Team size (hint)
          </label>
          <select
            id={`${baseId}-team`}
            className="form-select w-full"
            value={value.teamSizeHint ?? ""}
            onChange={(e) =>
              set({ teamSizeHint: (e.target.value || undefined) as TeamSizeHint | undefined })
            }
            disabled={disabled}
          >
            <option value="">—</option>
            {TEAM_SIZES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <span className="form-label" id={`${baseId}-del`}>
          Key deliverables
        </span>
        <DeliverableChips
          labelId={`${baseId}-del`}
          values={value.keyDeliverables ?? []}
          onChange={(keyDeliverables) => set({ keyDeliverables })}
          disabled={disabled}
        />
        <p className="text-[0.7rem] text-[#8c9097] dark:text-white/40 mb-0 mt-1">Up to 10, max 80 chars each.</p>
      </div>
      <div>
        <span className="form-label d-block">Constraints</span>
        <div className="flex flex-wrap gap-2">
          {CONSTRAINTS.map((c) => {
            const on = (value.constraints || []).includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                className={`ti-btn !py-0.5 !px-2.5 !text-[0.78rem] !mb-0 ${
                  on ? "ti-btn-primary" : "ti-btn-light"
                }`}
                disabled={disabled}
                onClick={() => toggleConstraint(c.value)}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <details className="group">
        <summary className="text-[0.8rem] cursor-pointer text-indigo-600 dark:text-indigo-300 list-none">
          <span className="underline">Extra notes (optional)</span>
        </summary>
        <textarea
          className="form-control w-full min-h-[56px] mt-2"
          placeholder="Freeform context…"
          value={value.extraNotes ?? ""}
          onChange={(e) => set({ extraNotes: e.target.value.slice(0, 500) })}
          disabled={disabled}
        />
      </details>
    </div>
  );
}
