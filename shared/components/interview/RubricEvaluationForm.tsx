"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import type { RubricCriterion } from "@/shared/lib/api/rubricTemplates";
import {
  getInterviewEvaluations,
  saveInterviewEvaluation,
  type EvaluationRatingInput,
  type InterviewEvaluation,
} from "@/shared/lib/api/meetings";

type RatingEntry = { rating: number | null; notApplicable: boolean };

/**
 * Mirrors backend src/utils/interviewScore.js computeWeightedScore. The server recomputes
 * and stores the authoritative figure on save; this is only the live preview while the
 * interviewer is still clicking.
 */
function previewWeightedScore(
  criteria: RubricCriterion[],
  ratings: Record<string, RatingEntry>
): {
  weightedScore: number | null;
  coveragePct: number;
  scoredCount: number;
  totalCount: number;
  isComplete: boolean;
} {
  let weightedSum = 0;
  let ratedWeight = 0;
  let applicableWeight = 0;
  let scoredCount = 0;
  let totalCount = 0;

  for (const criterion of criteria) {
    const entry = ratings[criterion.key];
    if (entry?.notApplicable) continue;

    const span = criterion.scaleMax - criterion.scaleMin;
    if (criterion.weight <= 0 || span <= 0) continue;

    totalCount += 1;
    applicableWeight += criterion.weight;

    const rating = entry?.rating;
    if (typeof rating !== "number" || !Number.isFinite(rating)) continue;

    const clamped = Math.min(Math.max(rating, criterion.scaleMin), criterion.scaleMax);
    weightedSum += ((clamped - criterion.scaleMin) / span) * criterion.weight;
    ratedWeight += criterion.weight;
    scoredCount += 1;
  }

  const round1 = (n: number) => Number(n.toFixed(1));
  return {
    weightedScore: ratedWeight > 0 ? round1((weightedSum / ratedWeight) * 100) : null,
    coveragePct: applicableWeight > 0 ? round1((ratedWeight / applicableWeight) * 100) : 0,
    scoredCount,
    totalCount,
    isComplete: totalCount > 0 && scoredCount === totalCount,
  };
}

function evaluationToRatings(
  evaluation: InterviewEvaluation | undefined,
  criteria: RubricCriterion[]
): Record<string, RatingEntry> {
  const map: Record<string, RatingEntry> = {};
  for (const criterion of criteria) {
    const row = evaluation?.ratings?.find((r) => r.key === criterion.key);
    map[criterion.key] = {
      rating: row?.notApplicable ? null : row?.rating ?? null,
      notApplicable: Boolean(row?.notApplicable),
    };
  }
  return map;
}

export type RubricEvaluationFormProps = {
  meetingId: string;
  variant?: "default" | "obsidian";
  onSaved?: (evaluation: InterviewEvaluation) => void;
  hideSaveButton?: boolean;
  saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
};

export default function RubricEvaluationForm({
  meetingId,
  variant = "default",
  onSaved,
  hideSaveButton = false,
  saveRef,
}: RubricEvaluationFormProps) {
  const { user } = useAuth();
  const userId = String(user?.id || "");
  const userEmail = (user?.email || "").trim().toLowerCase();

  /**
   * Which stored evaluation is the caller's own.
   *
   * Matches on the user id first, because that is what the server upserts on —
   * `(meeting, evaluator)`. Email is only a fallback for rows written before the id was
   * returned. Matching on email alone meant an account with no email, or an email changed
   * after scoring, saw its own evaluation listed as somebody else's and opened a blank
   * form, inviting the interviewer to re-enter scores they had already submitted.
   */
  const isMine = useCallback(
    (evaluation: InterviewEvaluation) => {
      if (userId && evaluation.evaluator) return String(evaluation.evaluator) === userId;
      if (!userEmail) return false;
      return (evaluation.evaluatorEmail || "").trim().toLowerCase() === userEmail;
    },
    [userId, userEmail]
  );

  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  /** Which rubric this round is scored against, so the interviewer can see it changed. */
  const [rubricName, setRubricName] = useState("");
  const [ratings, setRatings] = useState<Record<string, RatingEntry>>({});
  const [comment, setComment] = useState("");
  const [otherEvaluations, setOtherEvaluations] = useState<InterviewEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!meetingId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getInterviewEvaluations(meetingId);
      const rubricCriteria = data.rubric?.criteria || [];
      setCriteria(rubricCriteria);
      setRubricName(data.rubric?.templateName || "");

      const mine = data.evaluations.find(isMine);
      setRatings(evaluationToRatings(mine, rubricCriteria));
      setComment(mine?.comment || "");
      setOtherEvaluations(data.evaluations.filter((e) => !isMine(e)));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Could not load the evaluation.";
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [meetingId, isMine]);

  useEffect(() => {
    void load();
  }, [load]);

  const preview = useMemo(() => previewWeightedScore(criteria, ratings), [criteria, ratings]);

  const isObsidian = variant === "obsidian";

  const ratingButtonClass = (active: boolean) => {
    const base =
      "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2";
    const offset = isObsidian ? " dark:focus-visible:ring-offset-[#16181c]" : " dark:focus-visible:ring-offset-bodybg";
    if (active) {
      return `${base}${offset} border-primary bg-primary text-white`;
    }
    if (isObsidian) {
      return `${base}${offset} border-white/15 text-white/85 hover:bg-white/10`;
    }
    return `${base}${offset} border-defaultborder text-defaulttextcolor/80 hover:bg-gray-50 dark:border-white/15 dark:text-white/85 dark:hover:bg-white/10`;
  };

  const notesFieldClass = isObsidian
    ? "form-control h-24 w-full resize-none !rounded-md border border-white/15 !bg-[#1a1d22] text-sm !text-white placeholder:!text-white/45 focus:!border-primary/60 focus:!ring-2 focus:!ring-primary/30"
    : "form-control h-24 w-full resize-none !rounded-md text-sm dark:bg-bodybg dark:text-white dark:placeholder:text-white/40";

  const handleSave = useCallback(async () => {
    if (!meetingId || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const ratingRows: EvaluationRatingInput[] = criteria.map((criterion) => {
        const entry = ratings[criterion.key];
        return {
          key: criterion.key,
          rating: entry?.notApplicable ? null : entry?.rating ?? null,
          notApplicable: Boolean(entry?.notApplicable),
        };
      });
      const saved = await saveInterviewEvaluation(meetingId, {
        ratings: ratingRows,
        comment: comment.trim(),
      });
      setRatings(evaluationToRatings(saved, criteria));
      setComment(saved.comment || "");
      onSaved?.(saved);
      // Refetch so a colleague's evaluation submitted while this form was open appears.
      // Previously the else-branch here cleared the list outright when the caller had no
      // email, so everyone else's evaluations vanished from view until a reload.
      const refreshed = await getInterviewEvaluations(meetingId);
      setOtherEvaluations(refreshed.evaluations.filter((e) => !isMine(e)));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Could not save the evaluation.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }, [meetingId, saving, criteria, ratings, comment, onSaved, isMine]);

  useEffect(() => {
    if (!saveRef) return;
    saveRef.current = handleSave;
    return () => {
      saveRef.current = null;
    };
  }, [saveRef, handleSave]);

  const setRating = (key: string, value: number) => {
    setRatings((prev) => {
      const current = prev[key] || { rating: null, notApplicable: false };
      if (current.notApplicable) return prev;
      const nextRating = current.rating === value ? null : value;
      return {
        ...prev,
        [key]: { rating: nextRating, notApplicable: false },
      };
    });
  };

  const toggleNa = (key: string) => {
    setRatings((prev) => {
      const current = prev[key] || { rating: null, notApplicable: false };
      const nextNa = !current.notApplicable;
      return {
        ...prev,
        [key]: { rating: null, notApplicable: nextNa },
      };
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading evaluation">
        <div className="h-8 rounded-md bg-gray-200 dark:bg-white/10" />
        <div className="h-24 rounded-md bg-gray-200 dark:bg-white/10" />
        <div className="h-24 rounded-md bg-gray-200 dark:bg-white/10" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-danger/25 bg-danger/10 p-4 text-sm text-danger">
        <p>{loadError}</p>
        <button type="button" className="ti-btn ti-btn-light mt-3 !py-1.5 !px-3 !text-sm" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (!criteria.length) {
    return (
      <p className="text-sm text-defaulttextcolor/70 dark:text-white/70">
        No rubric criteria are configured for this round.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-defaulttextcolor dark:text-white">Evaluation</p>
          {/* Rubrics differ by job and by round, so naming the one in play is what lets an
              interviewer notice it is not the one they used on the previous round. */}
          {rubricName && (
            <span className="rounded bg-primary/[0.08] px-1.5 py-0.5 text-[0.65rem] font-medium text-primary dark:bg-primary/15">
              {rubricName}
            </span>
          )}
        </div>
        <p className="text-xs text-textmuted dark:text-white/70">
          Rate each criterion. Click a rating again to clear it. Use N/A when a criterion does not apply.
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-2 tabular-nums">
          <span className="text-lg font-semibold text-primary">
            {preview.weightedScore === null ? "—" : `${preview.weightedScore}%`}
          </span>
          {!preview.isComplete && preview.weightedScore !== null && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:text-amber-300">
              Incomplete — {preview.coveragePct}% of weight scored
            </span>
          )}
          {!preview.isComplete && preview.weightedScore === null && preview.totalCount > 0 && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:text-amber-300">
              Incomplete — {preview.coveragePct}% of weight scored
            </span>
          )}
          <span className="text-xs text-defaulttextcolor/60 dark:text-white/60">
            {preview.scoredCount} of {preview.totalCount} criteria
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {criteria.map((criterion) => {
          const entry = ratings[criterion.key] || { rating: null, notApplicable: false };
          const scaleValues: number[] = [];
          for (let v = criterion.scaleMin; v <= criterion.scaleMax; v += 1) scaleValues.push(v);

          return (
            <div key={criterion.key} className="flex flex-col gap-2 border-b border-defaultborder/60 pb-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className="text-sm font-medium text-defaulttextcolor dark:text-white">{criterion.label}</span>
                <span className="ms-2 text-xs text-defaulttextcolor/60 dark:text-white/60">{criterion.weight}%</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label={criterion.label}>
                  {scaleValues.map((value) => {
                    const active = !entry.notApplicable && entry.rating === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        aria-label={`${criterion.label}: ${value}`}
                        disabled={entry.notApplicable}
                        onClick={() => setRating(criterion.key, value)}
                        className={ratingButtonClass(active)}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  aria-pressed={entry.notApplicable}
                  onClick={() => toggleNa(criterion.key)}
                  className={`ms-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-2 text-xs font-medium ${
                    entry.notApplicable
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-defaultborder text-defaulttextcolor/70 dark:border-white/15 dark:text-white/70"
                  }`}
                >
                  N/A
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <label
          htmlFor={`rubric-eval-comment-${meetingId}`}
          className="form-label mb-1.5 block text-sm font-medium text-defaulttextcolor dark:text-white"
        >
          Notes
        </label>
        <textarea
          id={`rubric-eval-comment-${meetingId}`}
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What stood out, concerns, follow-up questions..."
          className={notesFieldClass}
        />
      </div>

      {saveError && (
        <p role="alert" className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
          {saveError}
        </p>
      )}

      {!hideSaveButton && (
        <div className="flex justify-end">
          <button
            type="button"
            className="ti-btn ti-btn-primary min-h-11 !px-4 !py-2 !text-sm"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save evaluation"}
          </button>
        </div>
      )}

      {otherEvaluations.length > 0 && (
        <div className="border-t border-defaultborder pt-4 dark:border-white/10">
          <p className="mb-3 text-sm font-medium text-defaulttextcolor dark:text-white">Other evaluations</p>
          <ul className="space-y-3">
            {otherEvaluations.map((ev) => (
              <li
                key={ev.id || ev.evaluatorEmail}
                className="rounded-lg border border-defaultborder/80 p-3 dark:border-white/10"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-defaulttextcolor dark:text-white">{ev.evaluatorName}</span>
                  <div className="flex flex-wrap items-baseline gap-2 tabular-nums text-sm">
                    {ev.weightedScore !== null ? (
                      <span className="font-semibold text-primary">{ev.weightedScore}%</span>
                    ) : (
                      <span className="text-xs text-defaulttextcolor/60 dark:text-white/60">
                        Recorded on the previous scorecard
                      </span>
                    )}
                    {ev.weightedScore !== null && (
                      <>
                        <span className="text-xs text-defaulttextcolor/60 dark:text-white/60">
                          {ev.coveragePct}% coverage
                        </span>
                        {!ev.isComplete && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:text-amber-300">
                            Incomplete
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {ev.comment?.trim() && (
                  <p className="mt-2 text-sm text-defaulttextcolor/80 dark:text-white/80">{ev.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
