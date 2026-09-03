"use client"

import React, { useEffect, useState } from "react"
import type { PlaylistItemForLearn } from "@/shared/lib/api/student-courses"
import { submitEssayAttempt, getEssayResults, type EssayResultsResponse } from "@/shared/lib/api/student-courses"
import { getApiErrorMessage } from "@/shared/lib/api/client"
import { LEARN_RECT_PRIMARY } from "./course-learn-wayfinding"

const QA_BLOCKED_MESSAGE = "Please answer all required questions before submitting the Q&A."

function formatEssaySubmittedAt(iso: string | undefined): string {
  if (!iso) return "Recently"
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch (err) {
    console.warn("Could not format Q&A submitted date", err)
    return "Recently"
  }
}

/**
 * Whether a Q&A answer is non-empty after trim (paste/whitespace does not count).
 */
function isEssayAnswerFilled(value: string | undefined): boolean {
  return (value ?? "").trim().length > 0
}

/**
 * Post-submit Q&A score card. Graded attempts show marks; otherwise awaiting review — no invented pass line.
 */
function EssayScoreCard({
  loading,
  attempt,
  responseCount,
  totalQuestions,
}: {
  loading: boolean
  attempt?: EssayResultsResponse["attempt"] | null
  responseCount: number
  totalQuestions: number
}) {
  const pct = attempt?.score?.percentage
  const hasScore = typeof pct === "number"
  const obtained = attempt?.obtainedMarks ?? attempt?.score?.obtainedMarks
  const max = attempt?.maxMarks ?? attempt?.score?.maxMarks ?? totalQuestions
  const awaiting = !hasScore
  const passed = attempt?.passed
  const tone = awaiting
    ? "border-[#d1d7dc] bg-[#f7f9fa] dark:border-white/15 dark:bg-white/[0.04]"
    : passed === false
      ? "border-rose-500/30 bg-rose-500/10"
      : "border-emerald-500/30 bg-emerald-500/10"

  return (
    <div className={`rounded-lg border p-4 sm:p-5 ${tone}`} aria-live="polite">
      <p className={`font-semibold text-[1rem] ${awaiting ? "text-[#1c1d1f] dark:text-white" : passed === false ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
        {awaiting ? "Submitted, awaiting review" : "Q&A graded"}
      </p>
      {loading ? (
        <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/60 mt-2">Loading your summary…</p>
      ) : hasScore ? (
        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-wide text-[#6a6f73] dark:text-white/55">Marks obtained</dt>
            <dd className="text-[1.25rem] font-bold tabular-nums text-[#1c1d1f] dark:text-white leading-tight">
              {obtained ?? 0}<span className="text-[0.875rem] font-medium text-[#6a6f73]"> / {max}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-wide text-[#6a6f73] dark:text-white/55">Percentage</dt>
            <dd className="text-[1.25rem] font-bold tabular-nums text-[#1c1d1f] dark:text-white leading-tight">{pct}%</dd>
          </div>
          {passed != null && (
            <div>
              <dt className="text-[0.6875rem] uppercase tracking-wide text-[#6a6f73] dark:text-white/55">Result</dt>
              <dd>
                <span className={`inline-flex items-center min-h-8 px-2 rounded-sm text-[0.75rem] font-semibold ${passed ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                  {passed ? "Pass" : "Fail"}
                </span>
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/70 mt-2">
          {attempt?.submittedAt
            ? `Submitted on ${formatEssaySubmittedAt(attempt.submittedAt)}${responseCount > 0 ? ` · ${responseCount} of ${totalQuestions} responses` : ""}. A trainer will grade this.`
            : "Your responses are saved. Marks will appear after this Q&A is graded."}
        </p>
      )}
    </div>
  )
}

export function EssayRenderer({
  essay,
  playlistItemId,
  studentId,
  moduleId,
  isCompleted,
  playlistItems,
  onSelectItem,
  onProgressUpdate,
}: {
  essay: unknown
  playlistItemId: string
  studentId: string
  moduleId: string
  isCompleted?: boolean
  playlistItems: PlaylistItemForLearn[]
  onSelectItem: (item: PlaylistItemForLearn) => void
  onProgressUpdate: () => Promise<void>
}) {
  const e = essay as { questions?: { questionText?: string; expectedAnswer?: string }[] } | null
  const questions = e?.questions ?? []
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [retakeMode, setRetakeMode] = useState(false)
  const [showResponses, setShowResponses] = useState(true)
  const [essayResults, setEssayResults] = useState<EssayResultsResponse | null>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [showBlockedAlert, setShowBlockedAlert] = useState(false)
  const [touched, setTouched] = useState<Record<number, boolean>>({})

  const showCompletedState = (isCompleted || submitted) && !retakeMode
  const essays = playlistItems.filter((p) => p.contentType === "essay")
  const essayIndex = essays.findIndex((p) => p.id === playlistItemId)
  const nextEssay = essayIndex >= 0 && essayIndex < essays.length - 1 ? essays[essayIndex + 1] : null
  const currentIndex = playlistItems.findIndex((p) => p.id === playlistItemId)
  const nextCourseItem = currentIndex >= 0 && currentIndex < playlistItems.length - 1 ? playlistItems[currentIndex + 1] : null
  const nextItem = nextEssay ?? nextCourseItem
  const allRequiredAnswered = questions.every((_, i) => isEssayAnswerFilled(answers[i]))

  const loadResults = async () => {
    setResultsLoading(true)
    setResultsError(null)
    try {
      const results = await getEssayResults(studentId, moduleId, playlistItemId)
      setEssayResults(results)
    } catch (err) {
      setResultsError(getApiErrorMessage(err, "Could not load your Q&A responses. Please try again."))
      setEssayResults(null)
    } finally {
      setResultsLoading(false)
    }
  }

  useEffect(() => {
    if (showCompletedState) loadResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when item/completion changes
  }, [showCompletedState, studentId, moduleId, playlistItemId])

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-12 px-4 rounded-2xl border border-dashed border-[#d1d7dc] dark:border-white/15">
        <i className="ti ti-message-off text-[1.75rem] text-primary mb-2" aria-hidden />
        <p className="text-[#6a6f73] dark:text-white/60">No Q&A questions.</p>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!questions.every((_, i) => isEssayAnswerFilled(answers[i]))) {
      setShowBlockedAlert(true)
      setTouched(Object.fromEntries(questions.map((_, i) => [i, true])))
      return
    }
    setShowBlockedAlert(false)
    setSubmitting(true)
    setResultsError(null)
    try {
      await submitEssayAttempt(studentId, moduleId, playlistItemId, {
        answers: questions.map((_, i) => ({ questionIndex: i, typedAnswer: answers[i] ?? "" })),
      })
      setSubmitted(true)
      setRetakeMode(false)
      setShowResponses(true)
      await onProgressUpdate()
    } catch (err) {
      setShowBlockedAlert(true)
      setResultsError(getApiErrorMessage(err, QA_BLOCKED_MESSAGE))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetake = () => {
    setRetakeMode(true)
    setSubmitted(false)
    setEssayResults(null)
    setResultsError(null)
    setAnswers({})
    setShowBlockedAlert(false)
    setTouched({})
  }

  if (showCompletedState) {
    const attempt = essayResults?.attempt
    const responseCount = essayResults?.essay.questions.filter((q) => q.studentAnswer.trim()).length ?? 0
    const totalQuestions = essayResults?.essay.questions.length ?? questions.length
    const nextIsEssay = nextItem?.contentType === "essay"

    return (
      <div className="space-y-5" aria-live="polite">
        <EssayScoreCard
          loading={resultsLoading}
          attempt={attempt}
          responseCount={responseCount}
          totalQuestions={totalQuestions}
        />
        {resultsError && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[0.875rem] text-amber-800 dark:text-amber-200">{resultsError}</p>
            <button type="button" className="ti-btn ti-btn-outline-primary min-h-11 shrink-0" onClick={loadResults} disabled={resultsLoading}>Retry</button>
          </div>
        )}
        {essayResults && (
          <div className="flex flex-wrap gap-3">
            <button type="button" className="ti-btn ti-btn-outline-primary min-h-11" onClick={() => setShowResponses((v) => !v)}>
              {showResponses ? "Hide responses" : "View your responses"}
            </button>
            <button type="button" className={LEARN_RECT_PRIMARY} onClick={handleRetake}>Retake Q&A</button>
          </div>
        )}
        {essayResults && showResponses && (
          <div className="space-y-4">
            <p className="font-semibold text-[#1c1d1f] dark:text-white">Your responses</p>
            {essayResults.essay.questions.map((q, qidx) => (
              <div key={qidx} className="rounded-lg border border-[#d1d7dc] dark:border-white/10 p-4 bg-white dark:bg-white/[0.03]">
                <p className="font-medium text-[#1c1d1f] dark:text-white mb-3">{qidx + 1}. {q.questionText ?? "Question"}</p>
                <div className="rounded-md border border-[#e4e8eb] dark:border-white/10 bg-[#f7f9fa] dark:bg-white/5 p-3 text-[0.9375rem] whitespace-pre-wrap min-h-[3rem]">
                  {q.studentAnswer.trim() ? q.studentAnswer : <span className="text-[#6a6f73] italic">No answer provided</span>}
                </div>
                {typeof q.score === "number" && (
                  <p className="mt-2 text-[0.8125rem] font-medium tabular-nums text-[#1c1d1f] dark:text-white">
                    Score: {q.score}/{q.maxMarks ?? 100}
                    {q.feedback ? <span className="block mt-1 font-normal text-[#6a6f73] dark:text-white/65">{q.feedback}</span> : null}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="pt-2">
          {nextItem ? (
            <button type="button" className="ti-btn ti-btn-primary min-h-11" onClick={() => onSelectItem(nextItem)}>
              {nextIsEssay ? "Next Q&A" : "Next lesson"}: {nextItem.title}
            </button>
          ) : (
            <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/60">You&apos;ve reached the last item in this course.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {resultsError && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-[0.875rem] text-rose-700 dark:text-rose-300" role="alert">
          {resultsError}
        </p>
      )}
      {(showBlockedAlert || Object.values(touched).some(Boolean)) && !allRequiredAnswered && (
        <p id={`essay-${playlistItemId}-blocked`} className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-[0.875rem] text-rose-700 dark:text-rose-300" role="alert">
          {QA_BLOCKED_MESSAGE}
        </p>
      )}
      {questions.map((q, i) => {
        const empty = !isEssayAnswerFilled(answers[i])
        const invalid = empty && (showBlockedAlert || touched[i])
        return (
        <div key={i} className="space-y-2">
          <label htmlFor={`essay-${playlistItemId}-q${i}`} className="font-medium text-[#1c1d1f] dark:text-white block">
            {i + 1}. {q.questionText ?? ""} <span className="text-rose-600" aria-hidden>*</span>
            <span className="sr-only">(required)</span>
          </label>
          <textarea
            id={`essay-${playlistItemId}-q${i}`}
            required
            aria-invalid={invalid || undefined}
            aria-describedby={!allRequiredAnswered && (showBlockedAlert || Object.values(touched).some(Boolean)) ? `essay-${playlistItemId}-blocked` : undefined}
            className={`form-control w-full rounded-xl border bg-white dark:bg-white/5 text-[#1c1d1f] dark:text-white p-3.5 min-h-[132px] leading-relaxed focus:ring-2 ${
              invalid
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-[#d1d7dc] dark:border-white/20 focus:border-primary focus:ring-primary/20"
            }`}
            rows={6}
            placeholder="Type your answer…"
            value={answers[i] ?? ""}
            onChange={(ev) => setAnswers((prev) => ({ ...prev, [i]: ev.target.value }))}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, [i]: true }))
              if (!isEssayAnswerFilled(answers[i])) setShowBlockedAlert(true)
            }}
          />
        </div>
        )
      })}
      <button
        type="button"
        className={`${LEARN_RECT_PRIMARY} ${!allRequiredAnswered || submitting ? "opacity-40" : ""}`}
        onClick={handleSubmit}
        disabled={!allRequiredAnswered || submitting}
        aria-disabled={!allRequiredAnswered || submitting}
        aria-busy={submitting}
      >
        {submitting ? "Submitting…" : "Submit Q&A"}
      </button>
    </div>
  )
}
