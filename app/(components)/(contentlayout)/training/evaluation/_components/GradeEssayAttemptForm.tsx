"use client"

import React, { useMemo, useState } from "react"
import { gradeEssayAttempt, type TrainerEssayAttemptPayload } from "@/shared/lib/api/evaluation"
import { getApiErrorMessage } from "@/shared/lib/api/client"
import { EVAL_BTN_PRIMARY } from "./evaluation-buttons"

interface GradeEssayAttemptFormProps {
  payload: TrainerEssayAttemptPayload
  onSaved: () => void
}

/**
 * Parse a mark input; empty returns null so optional questions can stay unscored.
 */
function parseMarkInput(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/**
 * Trainer mark editor for a single Q&A attempt.
 */
export default function GradeEssayAttemptForm({ payload, onSaved }: GradeEssayAttemptFormProps) {
  const questions = payload.essay.questions
  const attemptId = payload.attemptId || payload.attempt.attemptId

  const [scores, setScores] = useState<Record<number, string>>(() =>
    Object.fromEntries(questions.map((q, i) => [i, typeof q.score === "number" ? String(q.score) : ""]))
  )
  const [feedbacks, setFeedbacks] = useState<Record<number, string>>(() =>
    Object.fromEntries(questions.map((q, i) => [i, q.feedback ?? ""]))
  )
  const [overallFeedback, setOverallFeedback] = useState(payload.attempt.feedback ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const missingRequired = useMemo(
    () =>
      questions.some((q, i) => {
        if (q.optional === true) return false
        return parseMarkInput(scores[i] ?? "") == null
      }),
    [questions, scores]
  )

  /**
   * Clamp-aware save of trainer marks for this attempt.
   */
  async function handleSave() {
    if (!attemptId) {
      setError("This attempt is missing an id and cannot be graded.")
      return
    }
    if (missingRequired) {
      setError("Every required question must have a numeric score.")
      return
    }
    const answers = questions
      .map((q, i) => {
        const score = parseMarkInput(scores[i] ?? "")
        if (score == null) return null
        const feedback = (feedbacks[i] ?? "").trim()
        return {
          questionIndex: i,
          score,
          ...(feedback ? { feedback } : {}),
        }
      })
      .filter((a): a is { questionIndex: number; score: number; feedback?: string } => a != null)

    if (answers.length === 0) {
      setError("Enter at least one score before saving.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      await gradeEssayAttempt(attemptId, {
        answers,
        feedback: overallFeedback.trim() || undefined,
      })
      onSaved()
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save marks. Try again."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300" role="alert">
          {error}
        </p>
      )}
      {questions.map((q, i) => {
        const maxMarks = q.maxMarks ?? 100
        const scoreInvalid = q.optional !== true && parseMarkInput(scores[i] ?? "") == null
        return (
          <article
            key={`${attemptId}-q${i}`}
            className="rounded-lg border border-gray-200 dark:border-defaultborder/10 p-4 bg-white dark:bg-black/10 space-y-3"
          >
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-0">
              {i + 1}. {q.questionText || "Question"}
              {q.optional === true ? (
                <span className="ml-2 text-[0.7rem] font-medium uppercase tracking-wide text-defaulttextcolor/55">Optional</span>
              ) : (
                <span className="text-rose-600" aria-hidden> *</span>
              )}
            </h3>
            <div>
              <p className="text-[0.6875rem] uppercase tracking-wide text-defaulttextcolor/55 mb-1">Student answer</p>
              <p className="text-sm whitespace-pre-wrap rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 min-h-[3rem] mb-0">
                {q.studentAnswer?.trim() ? q.studentAnswer : <span className="italic text-defaulttextcolor/55">No answer provided</span>}
              </p>
            </div>
            {q.expectedAnswer?.trim() ? (
              <div>
                <p className="text-[0.6875rem] uppercase tracking-wide text-defaulttextcolor/55 mb-1">Expected answer</p>
                <p className="text-sm whitespace-pre-wrap rounded-md border border-primary/20 bg-primary/5 p-3 mb-0">{q.expectedAnswer}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor={`${attemptId}-score-${i}`} className="text-[0.6875rem] uppercase tracking-wide text-defaulttextcolor/55 mb-1 block">
                  Marks (0–{maxMarks})
                </label>
                <input
                  id={`${attemptId}-score-${i}`}
                  type="number"
                  min={0}
                  max={maxMarks}
                  step={1}
                  inputMode="numeric"
                  aria-invalid={scoreInvalid || undefined}
                  aria-required={q.optional !== true}
                  className="form-control w-full rounded-md border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 p-2.5 tabular-nums"
                  value={scores[i] ?? ""}
                  onChange={(ev) => setScores((prev) => ({ ...prev, [i]: ev.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${attemptId}-fb-${i}`} className="text-[0.6875rem] uppercase tracking-wide text-defaulttextcolor/55 mb-1 block">
                  Feedback
                </label>
                <input
                  id={`${attemptId}-fb-${i}`}
                  type="text"
                  maxLength={1000}
                  className="form-control w-full rounded-md border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 p-2.5"
                  value={feedbacks[i] ?? ""}
                  onChange={(ev) => setFeedbacks((prev) => ({ ...prev, [i]: ev.target.value }))}
                />
              </div>
            </div>
          </article>
        )
      })}
      <div>
        <label htmlFor={`${attemptId}-overall-fb`} className="text-[0.6875rem] uppercase tracking-wide text-defaulttextcolor/55 mb-1 block">
          Overall feedback
        </label>
        <textarea
          id={`${attemptId}-overall-fb`}
          maxLength={2000}
          rows={3}
          className="form-control w-full rounded-md border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 p-2.5"
          value={overallFeedback}
          onChange={(ev) => setOverallFeedback(ev.target.value)}
        />
      </div>
      <button
        type="button"
        className={EVAL_BTN_PRIMARY}
        onClick={() => void handleSave()}
        disabled={saving}
        aria-busy={saving}
      >
        {saving ? "Saving…" : "Save marks"}
      </button>
    </div>
  )
}
