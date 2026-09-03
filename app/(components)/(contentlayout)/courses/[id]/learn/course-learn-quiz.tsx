"use client"

import React, { useMemo, useState } from "react"
import {
  submitQuizAttempt,
  getQuizResults,
  type QuizSubmitAnswer,
  type QuizResultsResponse,
} from "@/shared/lib/api/student-courses"
import { getApiErrorMessage } from "@/shared/lib/api/client"
import { LEARN_RECT_PRIMARY } from "./course-learn-wayfinding"

interface QuizQuestion {
  questionText?: string
  allowMultipleAnswers?: boolean
  options?: { text?: string; isCorrect?: boolean }[]
}

/** Deduplicate options by text – keeps first occurrence. */
function dedupeOptions<T extends { text?: string }>(options: T[]): T[] {
  const seen = new Set<string>()
  return options.filter((opt) => {
    const key = (opt.text ?? "").trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function QuizRenderer({
  quiz,
  playlistItemId,
  studentId,
  moduleId,
  isCompleted,
  onProgressUpdate,
}: {
  quiz: unknown
  playlistItemId: string
  studentId: string
  moduleId: string
  isCompleted?: boolean
  onProgressUpdate: () => Promise<void>
}) {
  const q = quiz as { questions?: QuizQuestion[] } | null | undefined
  const questions = useMemo(
    () =>
      (q?.questions ?? []).map((question) => ({
        ...question,
        options: dedupeOptions(question.options ?? []),
      })),
    [q?.questions]
  )
  const [selected, setSelected] = useState<Record<number, number[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ percentage: number; correctAnswers: number; totalQuestions: number } | null>(null)
  const [quizResults, setQuizResults] = useState<QuizResultsResponse | null>(null)
  const [retakeMode, setRetakeMode] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const setOption = (qidx: number, oidx: number, multiple: boolean) => {
    setSelected((prev) => {
      const next = { ...prev }
      const current = next[qidx] ?? []
      if (multiple) {
        next[qidx] = current.includes(oidx) ? current.filter((i) => i !== oidx) : [...current, oidx]
      } else {
        next[qidx] = [oidx]
      }
      return next
    })
  }

  const handleSubmit = async () => {
    const answers: QuizSubmitAnswer[] = questions.map((_, qidx) => ({
      questionIndex: qidx,
      selectedOptions: selected[qidx] ?? [],
    }))
    setSubmitting(true)
    setResult(null)
    setQuizResults(null)
    setSubmitError(null)
    try {
      const res = await submitQuizAttempt(studentId, moduleId, playlistItemId, { answers, timeSpent: 0 })
      const score = res.score
      if (score) {
        setResult({ percentage: score.percentage, correctAnswers: score.correctAnswers, totalQuestions: score.totalQuestions })
        if (score.percentage >= 90) await onProgressUpdate()
        try {
          const results = await getQuizResults(studentId, moduleId, playlistItemId)
          setQuizResults(results)
        } catch (err) {
          setSubmitError(getApiErrorMessage(err, "Score saved but detailed review could not be loaded."))
        }
      }
      setRetakeMode(false)
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Could not submit quiz. Try again."))
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Reset local answers so the learner can attempt the quiz again.
   */
  const handleRetake = () => {
    setRetakeMode(true)
    setSelected({})
    setResult(null)
    setQuizResults(null)
    setSubmitError(null)
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-12 px-4 rounded-2xl border border-dashed border-[#d1d7dc] dark:border-white/15">
        <i className="ti ti-clipboard-off text-[1.75rem] text-primary mb-2" aria-hidden />
        <p className="text-[#6a6f73] dark:text-white/60">No questions in this quiz.</p>
      </div>
    )
  }

  const showDetailedResults = result !== null && quizResults !== null
  const lockedCompleted = !!isCompleted && !retakeMode && result === null

  if (lockedCompleted) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <p className="text-emerald-700 dark:text-emerald-300 font-semibold">You&apos;ve completed this quiz.</p>
        <button type="button" className={LEARN_RECT_PRIMARY} onClick={handleRetake}>
          Retake quiz
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {submitError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[0.875rem] text-red-700 dark:text-red-300" role="alert">
          {submitError}
        </p>
      )}
      {result !== null && (
        <div className={`rounded-lg p-4 ${result.percentage >= 90 ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300"}`}>
          <p className="font-semibold">{result.percentage >= 90 ? "Passed!" : "Not yet — you need 90% to pass."}</p>
          <p className="text-[0.875rem] mt-1">Score: {result.correctAnswers}/{result.totalQuestions} ({result.percentage}%)</p>
        </div>
      )}
      {showDetailedResults && quizResults && (
        <div className="space-y-4">
          <p className="font-semibold text-[#1c1d1f] dark:text-white">Review your answers</p>
          {quizResults.quiz.questions.map((question, qidx) => {
            const correct = question.isCorrect
            return (
              <div key={qidx} className={`rounded-lg border p-4 ${correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="font-medium text-[#1c1d1f] dark:text-white">{qidx + 1}. {question.questionText ?? "Question"}</p>
                  <span className={`shrink-0 badge ${correct ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-500/20 text-red-700 dark:text-red-300"}`}>
                    {correct ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <div className="space-y-2">
                  {dedupeOptions(question.options).map((opt, oidx) => {
                    const isCorrectOption = opt.isCorrect
                    const isStudentSelected = (opt as { isSelected?: boolean }).isSelected
                    let style = "flex items-center gap-2 p-3 min-h-11 rounded-lg text-[0.9375rem] text-[#1c1d1f] dark:text-white"
                    if (isCorrectOption) style += " bg-emerald-500/10 border border-emerald-500/30"
                    else if (isStudentSelected) style += " bg-red-500/10 border border-red-500/30"
                    else style += " border border-transparent"
                    return (
                      <div key={oidx} className={style}>
                        <span className="mr-2">{isCorrectOption ? "✓" : isStudentSelected ? "✗" : ""}</span>
                        {opt.text ?? ""}
                      </div>
                    )
                  })}
                </div>
                {!correct && question.explanation && (
                  <p className="mt-3 text-[0.875rem] text-[#6a6f73] dark:text-white/70 italic border-l-2 border-primary/50 pl-3">{question.explanation}</p>
                )}
              </div>
            )
          })}
          <button type="button" className={LEARN_RECT_PRIMARY} onClick={handleRetake}>
            Retake quiz
          </button>
        </div>
      )}
      {!showDetailedResults && (
        <>
          {questions.map((question, qidx) => (
            <fieldset key={qidx} className="rounded-xl border border-[#d1d7dc] dark:border-white/10 p-4 sm:p-5 bg-white dark:bg-white/[0.03]">
              <legend className="font-semibold text-[#1c1d1f] dark:text-white mb-3 px-1">
                {qidx + 1}. {question.questionText ?? "Question"}
              </legend>
              <div className="space-y-2" role={question.allowMultipleAnswers ? "group" : "radiogroup"} aria-label={question.questionText ?? `Question ${qidx + 1}`}>
                {(question.options ?? []).map((opt, oidx) => {
                  const inputId = `quiz-${playlistItemId}-q${qidx}-o${oidx}`
                  const checked = (selected[qidx] ?? []).includes(oidx)
                  return (
                    <label
                      key={oidx}
                      htmlFor={inputId}
                      className={`flex items-center gap-3 cursor-pointer min-h-11 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                        checked
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-[#e4e8eb] dark:border-white/10 hover:border-primary/30 hover:bg-[#f7f9fa] dark:hover:bg-white/5"
                      }`}
                    >
                      <input
                        id={inputId}
                        type={question.allowMultipleAnswers ? "checkbox" : "radio"}
                        name={`quiz-${playlistItemId}-q-${qidx}`}
                        className={`h-5 w-5 shrink-0 accent-primary border-2 border-[#6a6f73] ${question.allowMultipleAnswers ? "rounded" : "rounded-full"}`}
                        checked={checked}
                        onChange={() => setOption(qidx, oidx, !!question.allowMultipleAnswers)}
                      />
                      <span className="text-[0.9375rem] text-[#1c1d1f] dark:text-white leading-snug">{opt.text ?? ""}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}
          <button type="button" className="ti-btn ti-btn-primary min-h-11" onClick={handleSubmit} disabled={submitting} aria-busy={submitting}>
            {submitting ? "Submitting…" : "Submit quiz"}
          </button>
        </>
      )}
    </div>
  )
}
