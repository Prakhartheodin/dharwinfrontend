"use client"
import React, { useCallback, useEffect, useRef, useState } from "react"
import type { SeriesEditMode } from "@/shared/lib/api/internal-meetings"

export interface RecurringScopeOptions {
  title: string
  message: React.ReactNode
  actionVerb?: string
  tone?: "danger" | "primary"
}

const SCOPE_CHOICES: { value: SeriesEditMode; label: string; hint: string }[] = [
  { value: "single", label: "This occurrence only", hint: "Other dates in the series stay as they are." },
  { value: "future", label: "This and future occurrences", hint: "Earlier dates are not changed." },
  { value: "series", label: "Entire series", hint: "Applies to every scheduled occurrence in the series." },
]

export function useRecurringScopeDialog() {
  const [opts, setOpts] = useState<RecurringScopeOptions | null>(null)
  const resolverRef = useRef<((v: SeriesEditMode | null) => void) | null>(null)

  const pickScope = useCallback(
    (options: RecurringScopeOptions) =>
      new Promise<SeriesEditMode | null>((resolve) => {
        resolverRef.current = resolve
        setOpts(options)
      }),
    []
  )

  const settle = useCallback((v: SeriesEditMode | null) => {
    resolverRef.current?.(v)
    resolverRef.current = null
    setOpts(null)
  }, [])

  const recurringScopeDialog = opts ? (
    <RecurringScopeDialogUI options={opts} onSelect={(scope) => settle(scope)} onDismiss={() => settle(null)} />
  ) : null

  return { pickScope, recurringScopeDialog }
}

function RecurringScopeDialogUI({
  options,
  onSelect,
  onDismiss,
}: {
  options: RecurringScopeOptions
  onSelect: (scope: SeriesEditMode) => void
  onDismiss: () => void
}) {
  const { title, message, actionVerb = "Apply", tone = "danger" } = options
  const dismissRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    dismissRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recurring-scope-dialog-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-defaultborder bg-white shadow-xl dark:border-defaultborder/10 dark:bg-bodybg">
        <div className="border-b border-defaultborder/70 px-5 py-4 dark:border-defaultborder/10">
          <h3 id="recurring-scope-dialog-title" className="text-base font-semibold text-defaulttextcolor dark:text-white">
            {title}
          </h3>
          <div className="mt-1 text-sm text-defaulttextcolor/70 dark:text-white/70">{message}</div>
        </div>
        <div className="space-y-2 px-5 py-4">
          {SCOPE_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                choice.value === "series"
                  ? "border-danger/30 bg-danger/[0.04] hover:bg-danger/10 dark:border-danger/40"
                  : "border-defaultborder hover:bg-light dark:border-defaultborder/10 dark:hover:bg-white/5"
              }`}
              onClick={() => onSelect(choice.value)}
            >
              <span className="block text-sm font-medium text-defaulttextcolor dark:text-white">{choice.label}</span>
              <span className="mt-0.5 block text-xs text-defaulttextcolor/60 dark:text-white/60">{choice.hint}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-end border-t border-defaultborder/70 bg-light/30 px-5 py-3.5 dark:border-defaultborder/10 dark:bg-white/[0.02]">
          <button
            ref={dismissRef}
            type="button"
            className="ti-btn ti-btn-light !min-h-[44px] !py-2 !px-4 !text-sm font-medium"
            onClick={onDismiss}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
