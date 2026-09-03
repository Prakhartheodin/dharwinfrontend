"use client"

import React from "react"

export function CompleteButtonLabel({ completing, label }: { completing: boolean; label: string }) {
  if (completing) {
    return (
      <>
        <i className="ti ti-loader-2 animate-spin text-[0.875rem] shrink-0" aria-hidden />
        <span>Saving…</span>
      </>
    )
  }
  return <span>{label}</span>
}

export function CourseLearnToast({
  message,
  tone,
}: {
  message: string
  tone: "success" | "error"
}) {
  return (
    <div
      aria-live="polite"
      role="status"
      className={`fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 max-w-[min(92vw,28rem)] rounded-xl px-4 py-2.5 text-[0.8125rem] font-medium shadow-lg ring-1 ring-black/10 ${
        tone === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {message}
    </div>
  )
}

interface CompletionToggleProps {
  isCompleted: boolean
  completing: boolean
  onComplete: () => void
  onIncomplete: () => void
  completeLabel: string
  incompleteLabel: string
  compact?: boolean
}

/**
 * Toggle complete / incomplete for a lesson, video, or blog.
 */
export function CompletionToggle({
  isCompleted,
  completing,
  onComplete,
  onIncomplete,
  completeLabel,
  incompleteLabel,
  compact = false,
}: CompletionToggleProps) {
  const cls = compact
    ? "shrink-0 inline-flex items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    : "inline-flex items-center justify-center gap-1.5 shrink-0 min-h-11 px-3.5 py-2 rounded-lg text-[0.8125rem] font-medium whitespace-nowrap transition-all duration-200 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"

  if (isCompleted) {
    return (
      <button
        type="button"
        onClick={onIncomplete}
        disabled={completing}
        aria-busy={completing}
        aria-pressed="true"
        aria-label={`${incompleteLabel}. Currently marked done.`}
        title={incompleteLabel}
        className={`${cls} border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}
      >
        <i className="ti ti-circle-check text-[0.875rem] shrink-0" aria-hidden />
        <CompleteButtonLabel completing={completing} label={incompleteLabel} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onComplete}
      disabled={completing}
      aria-busy={completing}
      aria-pressed="false"
      aria-label={completeLabel}
      title={completeLabel}
      className={`${cls} bg-primary text-white`}
    >
      <CompleteButtonLabel completing={completing} label={completeLabel} />
    </button>
  )
}
