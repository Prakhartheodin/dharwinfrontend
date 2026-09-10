"use client"

import React, { useState } from "react"
import { gradeQuizAttempt, type TrainerQuizAttemptPayload } from "@/shared/lib/api/evaluation"
import { getApiErrorMessage } from "@/shared/lib/api/client"
import { EVAL_BTN_PRIMARY } from "./evaluation-buttons"

interface GradeQuizAttemptFormProps {
  payload: TrainerQuizAttemptPayload
  onSaved: () => void
}

/**
 * Trainer feedback editor for a graded quiz attempt.
 */
export default function GradeQuizAttemptForm({ payload, onSaved }: GradeQuizAttemptFormProps) {
  const attemptId = payload.attemptId || payload.attempt.attemptId
  const [overallFeedback, setOverallFeedback] = useState(payload.attempt.feedback ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!attemptId) {
      setError("This attempt is missing an id and cannot be updated.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await gradeQuizAttempt(attemptId, {
        feedback: overallFeedback.trim() || undefined,
      })
      onSaved()
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save feedback. Try again."))
    } finally {
      setSaving(false)
    }
  }

  const pct = payload.attempt.score?.percentage

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300" role="alert">
          {error}
        </p>
      )}
      <div className="rounded-lg border border-gray-200 dark:border-defaultborder/10 p-4 bg-white dark:bg-black/10">
        <p className="text-sm text-defaulttextcolor/70 mb-1">Auto-graded score</p>
        <p className="text-lg font-semibold tabular-nums text-gray-800 dark:text-white mb-0">
          {typeof pct === "number" ? `${pct}%` : "—"}
          {payload.attempt.score?.correctAnswers != null && payload.attempt.score?.totalQuestions != null
            ? ` (${payload.attempt.score.correctAnswers}/${payload.attempt.score.totalQuestions})`
            : null}
        </p>
      </div>
      <div>
        <label htmlFor={`${attemptId}-quiz-overall-fb`} className="text-[0.6875rem] uppercase tracking-wide text-defaulttextcolor/55 mb-1 block">
          Overall feedback
        </label>
        <textarea
          id={`${attemptId}-quiz-overall-fb`}
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
        {saving ? "Saving…" : "Save feedback"}
      </button>
    </div>
  )
}
