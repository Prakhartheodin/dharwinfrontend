"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { AxiosError } from "axios";
import {
  previewTaskBreakdown,
  applyTaskBreakdown,
  type TaskBreakdownPreviewTask,
} from "@/shared/lib/api/pmAssistant";
import styles from "./aiTaskBreakdownModal.module.css";

const TASK_STATUSES = ["new", "todo", "on_going", "in_review", "completed"] as const;

const LOADING_HINTS = [
  "Reading project context…",
  "Turning goals into concrete tasks…",
  "Adding tags and skill hints for staffing…",
  "Checking scope and overlap…",
];

/** Short labels for the phase rail (synced with LOADING_HINTS indices). */
const LOADING_PHASE_LABELS = ["Context", "Draft", "Staffing", "QA"];

function InlineBtnSpinner({ variant = "primary" }: { variant?: "primary" | "outline" | "success" }) {
  return (
    <span className={styles.btnSpinner} aria-hidden>
      <span
        className={`${styles.btnSpinnerRing} ${variant === "outline" ? styles.btnSpinnerRingOutline : ""}`}
      />
    </span>
  );
}

const TOKEN_DELIMS = /[,;\n]/;

function mergeTokens(
  existing: string[],
  pieces: string[],
  maxItems: number,
  maxTokenLen: number
): string[] {
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

/** Split typing buffer into completed tokens (from delimiters) and trailing draft. */
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

function TokenChipField({
  values,
  onChange,
  maxItems,
  maxTokenLen = 64,
  placeholder,
  disabled,
  variant,
  labelId,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  maxItems: number;
  maxTokenLen?: number;
  placeholder: string;
  disabled?: boolean;
  variant: "tags" | "skills";
  labelId: string;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const shellClass =
    variant === "skills"
      ? `${styles.chipField} ${styles.chipFieldSkills}`
      : `${styles.chipField} ${styles.chipFieldTags}`;
  const chipClass = variant === "skills" ? styles.chipSkill : styles.chipTag;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={`${shellClass} ${disabled ? styles.chipFieldDisabled : ""}`}
      onClick={() => {
        if (!disabled) inputRef.current?.focus();
      }}
    >
      {values.map((v, i) => (
        <span key={`${i}-${v}`} className={chipClass} title={v}>
          <span className={styles.chipText}>{v}</span>
          <button
            type="button"
            className={styles.chipRemove}
            disabled={disabled}
            aria-label={`Remove ${v}`}
            onClick={(e) => {
              e.stopPropagation();
              removeAt(i);
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
          placeholder={values.length === 0 ? placeholder : "Add more…"}
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
              removeAt(values.length - 1);
            }
          }}
          onBlur={() => {
            if (disabled) return;
            const t = draft.trim();
            if (!t) return;
            onChange(mergeTokens(values, [t], maxItems, maxTokenLen));
            setDraft("");
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (!text || (!/[,;\n]/.test(text) && !text.includes("\n"))) return;
            e.preventDefault();
            if (disabled) return;
            const pieces = text.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
            if (pieces.length) {
              onChange(mergeTokens(values, pieces, maxItems, maxTokenLen));
            }
            setDraft("");
          }}
        />
      ) : (
        <span className={styles.chipLimitNote}>Max {maxItems}</span>
      )}
    </div>
  );
}

type EditableRow = TaskBreakdownPreviewTask & {
  clientKey: string;
  include: boolean;
};

function newClientKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toEditableRows(tasks: TaskBreakdownPreviewTask[]): EditableRow[] {
  return tasks.map((t) => ({
    ...t,
    tags: normalizeStringArray(t.tags, 20) ?? [],
    requiredSkills: normalizeStringArray(t.requiredSkills, 15) ?? [],
    order: normalizeOrder(t.order),
    clientKey: newClientKey(),
    include: true,
  }));
}

function normalizeStringArray(val: unknown, max: number): string[] | undefined {
  if (val == null) return undefined;
  const raw: string[] = Array.isArray(val)
    ? val.map((x) => String(x).trim()).filter(Boolean)
    : typeof val === "string"
      ? val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const out = raw.slice(0, max);
  return out.length ? out : undefined;
}

function normalizeOrder(val: unknown): number | undefined {
  if (val == null || val === "") return undefined;
  const n = typeof val === "number" ? val : Number.parseInt(String(val).trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return undefined;
  return Math.floor(n);
}

/** Only fields the apply API accepts — avoids Joi failures from stray preview keys. */
function toPayload(rows: EditableRow[]): TaskBreakdownPreviewTask[] {
  return rows
    .filter((r) => r.include && (r.title ?? "").trim().length > 0)
    .map((r) => {
      const title = (r.title ?? "").trim();
      const description = (r.description ?? "").trim() || undefined;
      const status =
        r.status && TASK_STATUSES.includes(r.status as (typeof TASK_STATUSES)[number]) ? r.status : "new";
      const tags = normalizeStringArray(r.tags, 20);
      const requiredSkills = normalizeStringArray(r.requiredSkills, 15);
      const order = normalizeOrder(r.order);
      const out: TaskBreakdownPreviewTask = { title, description, status };
      if (tags?.length) out.tags = tags;
      if (requiredSkills?.length) out.requiredSkills = requiredSkills;
      if (order !== undefined) out.order = order;
      return out;
    });
}

function formatApplyError(err: unknown): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const raw = err.response?.data;
    if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
      const d = raw as {
        message?: string;
        errorCode?: string;
        details?: { invalidRows?: unknown; duplicateTitles?: unknown };
      };
      if (d.errorCode === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
        return "This action was already submitted with different data. Close the modal and start a new preview.";
      }
      let msg = d.message || "Request failed";
      if (d.details?.invalidRows) {
        msg += `\n\n${JSON.stringify(d.details.invalidRows, null, 2)}`;
      }
      if (d.details?.duplicateTitles) {
        msg += `\n\nDuplicates: ${JSON.stringify(d.details.duplicateTitles, null, 2)}`;
      }
      return msg;
    }
    if (typeof raw === "string" && raw.trim()) {
      const stripped = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return stripped.length > 280 ? `${stripped.slice(0, 280)}…` : stripped;
    }
    const bits = [err.message || "Request failed"];
    if (status) bits.push(`(HTTP ${status})`);
    return bits.join(" ");
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not complete the request.";
}

export interface AiTaskBreakdownModalProps {
  open: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
  onApplied?: () => void;
}

export function AiTaskBreakdownModal({
  open,
  projectId,
  projectName,
  onClose,
  onApplied,
}: AiTaskBreakdownModalProps) {
  const [extraBrief, setExtraBrief] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rows, setRows] = useState<EditableRow[] | null>(null);
  const [applyIdempotencyKey, setApplyIdempotencyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loadingHintIdx, setLoadingHintIdx] = useState(0);

  const resetState = useCallback(() => {
    setExtraBrief("");
    setFeedback("");
    setRows(null);
    setApplyIdempotencyKey(null);
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  useEffect(() => {
    if (!loading) return;
    setLoadingHintIdx(0);
    const id = window.setInterval(() => {
      setLoadingHintIdx((i) => (i + 1) % LOADING_HINTS.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, [loading]);

  if (!open) return null;

  const runPreview = async (opts: { feedback?: string; priorTasks?: Pick<TaskBreakdownPreviewTask, "title" | "description">[] }) => {
    setLoading(true);
    try {
      const res = await previewTaskBreakdown(projectId, {
        extraBrief,
        feedback: opts.feedback,
        priorTasks: opts.priorTasks,
      });
      setRows(toEditableRows(res.tasks ?? []));
      setApplyIdempotencyKey(newClientKey());
      if (!res.tasks?.length) {
        Swal.fire("No tasks", "The model returned no tasks. Try adding more context.", "info");
      }
    } catch {
      Swal.fire("Error", "Could not generate a preview. Check PM assistant and OpenAI configuration.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => runPreview({});

  const handleRegenerate = () => {
    if (!rows?.length) {
      void handlePreview();
      return;
    }
    const priorTasks = rows.map((r) => ({
      title: r.title,
      description: r.description || "",
    }));
    void runPreview({ feedback: feedback.trim() || undefined, priorTasks });
  };

  const updateRow = (clientKey: string, patch: Partial<EditableRow>) => {
    setRows((prev) => (prev ? prev.map((r) => (r.clientKey === clientKey ? { ...r, ...patch } : r)) : prev));
  };

  const removeRow = (clientKey: string) => {
    setRows((prev) => (prev ? prev.filter((r) => r.clientKey !== clientKey) : prev));
  };

  const handleApply = async () => {
    if (!rows?.length) return;
    const payload = toPayload(rows);
    if (!payload.length) {
      Swal.fire("Nothing to create", "Select at least one task with the checkbox, or add a title.", "info");
      return;
    }
    const ok = await Swal.fire({
      title: "Create tasks?",
      text: `${payload.length} task(s) will be created for "${projectName}".`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Create",
    });
    if (!ok.isConfirmed) return;
    if (!applyIdempotencyKey) {
      Swal.fire("Preview first", "Generate a preview before creating tasks.", "info");
      return;
    }
    setApplying(true);
    try {
      await applyTaskBreakdown(projectId, payload, { idempotencyKey: applyIdempotencyKey });
      await Swal.fire("Done", "Tasks were created.", "success");
      await Promise.resolve(onApplied?.());
      onClose();
    } catch (e) {
      Swal.fire("Error", formatApplyError(e), "error");
    } finally {
      setApplying(false);
    }
  };

  const includedCount = rows?.filter((r) => r.include).length ?? 0;

  const skeletonStaggerClasses = [styles.skeletonStagger0, styles.skeletonStagger1, styles.skeletonStagger2];

  const previewSkeleton = (
    <div
      className={`space-y-3 ${styles.aiGenRoot}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Generating task preview"
    >
      <span className="sr-only">Step {loadingHintIdx + 1} of 4: {LOADING_HINTS[loadingHintIdx]}</span>
      <div className={styles.progressTrack} aria-hidden>
        <div className={styles.progressFill} />
      </div>
      <ul className={styles.phaseTrack} aria-hidden>
        {LOADING_PHASE_LABELS.map((label, i) => (
          <li
            key={label}
            className={`${styles.phaseNode} ${loadingHintIdx === i ? styles.phaseNodeActive : ""}`}
          >
            <span className={styles.phaseDot} />
            <span className={styles.phaseLabel}>{label}</span>
          </li>
        ))}
      </ul>
      <div className={styles.loadingStrip}>
        <div className={styles.aiOrb} aria-hidden>
          <div className={styles.aiOrbInner} />
        </div>
        <p className={`${styles.liveStatus} mb-0 flex-1 min-w-0`}>{LOADING_HINTS[loadingHintIdx]}</p>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${styles.skeletonBlock} ${skeletonStaggerClasses[i]} p-3 space-y-2`}>
          <div className={`${styles.skeletonLine} h-3.5 w-[58%]`} />
          <div className={`${styles.skeletonLine} h-3 w-full`} />
          <div className={`${styles.skeletonLine} h-3 w-[88%]`} />
          <div className="flex gap-2 pt-1">
            <div className={`${styles.skeletonLine} h-7 w-24`} />
            <div className={`${styles.skeletonLine} h-7 flex-1 min-w-0`} />
            <div className={`${styles.skeletonLine} h-7 w-16`} />
          </div>
        </div>
      ))}
    </div>
  );

  const emptyState = (
    <div className={styles.emptyCard}>
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-indigo-500/25 bg-indigo-500/[0.07] dark:bg-indigo-500/15 mb-2">
        <i className="ri-draft-line text-2xl text-indigo-600 dark:text-indigo-300" aria-hidden />
      </div>
      <p className="text-[0.9375rem] font-semibold text-defaulttextcolor mb-1">No preview yet</p>
      <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-3 max-w-md mx-auto">
        Add optional context above, then run <strong className="text-defaulttextcolor">Preview</strong>. Nothing is
        saved until you create tasks.
      </p>
      <p className="text-[0.75rem] text-[#8c9097] dark:text-white/40 mb-0">
        Typical wait: a few seconds — depends on model load.
      </p>
    </div>
  );

  return (
    <div
      className={`fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 ${styles.overlay}`}
      onClick={onClose}
    >
      <div
        className={`bg-bodybg border border-defaultborder rounded-xl w-[96vw] max-w-3xl max-h-[92vh] flex flex-col ${styles.panel}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-start justify-between gap-3 p-4 border-b border-defaultborder ${styles.headerAccent}`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-500/25 bg-indigo-500/[0.08] dark:bg-indigo-500/15"
              aria-hidden
            >
              <i className="ri-sparkling-2-line text-xl text-indigo-600 dark:text-indigo-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h5 className="font-semibold mb-0 text-defaulttextcolor">AI task breakdown</h5>
                <span className={styles.badgeGpt}>Server GPT</span>
              </div>
              <p className="text-[0.78rem] text-[#8c9097] dark:text-white/45 mb-0 mt-0.5 truncate" title={projectName}>
                {projectName}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`ti-btn ti-btn-light !py-1 !px-2 shrink-0 ${styles.btnPress}`}
            onClick={onClose}
            aria-label="Close AI task breakdown"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-0 leading-relaxed">
            Preview runs on the server with GPT. Review and edit the draft, then create tasks — nothing is written
            until you confirm.
          </p>
          <label className="form-label" htmlFor="pm-extra-brief">
            Extra context (optional)
          </label>
          <textarea
            id="pm-extra-brief"
            className="form-control w-full min-h-[72px] transition-opacity duration-200"
            placeholder="Goals, milestones, tech stack, constraints…"
            value={extraBrief}
            onChange={(e) => setExtraBrief(e.target.value)}
            disabled={loading || applying}
          />
          <div className={`flex flex-wrap gap-2 ${styles.actionBar}`}>
            <button
              type="button"
              className={`ti-btn ti-btn-primary !mb-0 ${styles.btnPress}`}
              onClick={() => void handlePreview()}
              disabled={loading || applying}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <InlineBtnSpinner />
                  Generating…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-play-line" aria-hidden />
                  Preview
                </span>
              )}
            </button>
            {rows && rows.length > 0 ? (
              <button
                type="button"
                className={`ti-btn ti-btn-outline-primary !mb-0 ${styles.btnPress}`}
                onClick={() => void handleRegenerate()}
                disabled={loading || applying}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <InlineBtnSpinner variant="outline" />
                    Regenerating…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <i className="ri-refresh-line" aria-hidden />
                    Regenerate with feedback
                  </span>
                )}
              </button>
            ) : null}
            {rows && rows.length > 0 ? (
              <button
                type="button"
                className={`ti-btn ti-btn-success !mb-0 ${styles.btnPress}`}
                onClick={() => void handleApply()}
                disabled={applying || includedCount === 0 || loading}
              >
                {applying ? (
                  <span className="inline-flex items-center gap-2">
                    <InlineBtnSpinner />
                    Creating…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <i className="ri-task-line" aria-hidden />
                    Create {includedCount} task(s)
                  </span>
                )}
              </button>
            ) : null}
          </div>
          {rows && rows.length > 0 ? (
            <div className="space-y-2">
              <label className="form-label mb-0" htmlFor="pm-regenerate-feedback">
                Feedback for regenerate (optional)
              </label>
              <textarea
                id="pm-regenerate-feedback"
                className="form-control w-full min-h-[64px]"
                placeholder="What should change in the next draft?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={loading || applying}
              />
            </div>
          ) : null}
          {loading ? (
            previewSkeleton
          ) : rows && rows.length > 0 ? (
            <div
              className={`flex flex-col gap-3 max-h-[46vh] overflow-y-auto ${styles.taskListShell}`}
            >
              {rows.map((r, rowIndex) => (
                <article
                  key={r.clientKey}
                  className={styles.taskCard}
                  style={{ animationDelay: `${Math.min(rowIndex, 12) * 0.045}s` }}
                  aria-label={`Draft task ${rowIndex + 1} of ${rows.length}`}
                >
                  <div className={styles.taskCardHeader}>
                    <div className={styles.taskCardLead}>
                      <label className={styles.includeToggle}>
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={(e) => updateRow(r.clientKey, { include: e.target.checked })}
                          disabled={applying}
                        />
                        <span>Include</span>
                      </label>
                      <span className={styles.taskIndex} title="Row order in this list">
                        #{rowIndex + 1}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.taskRemoveBtn}
                      title="Remove this task from the draft"
                      onClick={() => removeRow(r.clientKey)}
                      disabled={applying}
                    >
                      <i className="ri-delete-bin-line text-lg leading-none" aria-hidden />
                      <span className="sr-only">Remove task {rowIndex + 1}</span>
                    </button>
                  </div>
                  <div
                    className={`${styles.taskCardBody} ${!r.include ? styles.taskCardBodyMuted : ""}`}
                  >
                    <div>
                      <span className={styles.fieldLabel}>Task title</span>
                      <input
                        type="text"
                        className={`form-control form-control-sm w-full ${styles.taskTitleInput}`}
                        placeholder="Short, actionable title"
                        value={r.title}
                        onChange={(e) => updateRow(r.clientKey, { title: e.target.value })}
                        disabled={applying}
                      />
                    </div>
                    <div className={styles.taskDescWell}>
                      <span className={styles.fieldLabel}>Brief</span>
                      <textarea
                        className={`form-control form-control-sm w-full ${styles.taskTextarea}`}
                        placeholder="Scope, acceptance hints, links…"
                        value={r.description ?? ""}
                        onChange={(e) => updateRow(r.clientKey, { description: e.target.value })}
                        disabled={applying}
                      />
                    </div>
                    <div className={styles.taskMetaGrid}>
                      <div>
                        <span className={styles.fieldLabel}>Status</span>
                        <select
                          className={`form-select form-select-sm w-full min-w-0 ${styles.taskSelect}`}
                          value={
                            r.status && TASK_STATUSES.includes(r.status as (typeof TASK_STATUSES)[number])
                              ? r.status
                              : "new"
                          }
                          onChange={(e) => updateRow(r.clientKey, { status: e.target.value })}
                          disabled={applying}
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className={styles.fieldLabel} id={`pm-tags-lbl-${r.clientKey}`}>
                          Tags
                        </span>
                        <TokenChipField
                          labelId={`pm-tags-lbl-${r.clientKey}`}
                          values={r.tags || []}
                          onChange={(tags) => updateRow(r.clientKey, { tags })}
                          maxItems={20}
                          maxTokenLen={64}
                          placeholder="Type a tag, comma, or Enter"
                          disabled={applying}
                          variant="tags"
                        />
                      </div>
                      <div>
                        <span className={styles.fieldLabel} id={`pm-skills-lbl-${r.clientKey}`}>
                          Required skills
                        </span>
                        <TokenChipField
                          labelId={`pm-skills-lbl-${r.clientKey}`}
                          values={r.requiredSkills || []}
                          onChange={(requiredSkills) =>
                            updateRow(r.clientKey, { requiredSkills: requiredSkills.slice(0, 15) })
                          }
                          maxItems={15}
                          maxTokenLen={64}
                          placeholder="e.g. React, Node, LLM eval"
                          disabled={applying}
                          variant="skills"
                        />
                      </div>
                      <div className={`${styles.orderPill} ${styles.metaOrder}`}>
                        <span className={styles.fieldLabel}>Sequence</span>
                        <input
                          type="number"
                          className={`form-control form-control-sm w-full ${styles.orderInput}`}
                          placeholder="Auto"
                          title="Optional display order; leave empty to append after existing tasks"
                          value={r.order === undefined || r.order === null ? "" : String(r.order)}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              updateRow(r.clientKey, { order: undefined });
                              return;
                            }
                            const n = Number.parseInt(v, 10);
                            updateRow(r.clientKey, {
                              order: Number.isFinite(n) ? n : undefined,
                            });
                          }}
                          disabled={applying}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            emptyState
          )}
        </div>
      </div>
    </div>
  );
}
