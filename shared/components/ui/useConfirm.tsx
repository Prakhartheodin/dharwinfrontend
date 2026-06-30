"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface ConfirmOptions {
  title?: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary' | 'success'
  /** Single-button mode — hides the cancel button. Use for info / success acknowledgements. */
  hideCancel?: boolean
}

/**
 * Promise-based styled confirm dialog — drop-in replacement for window.confirm
 * that matches the app's modal styling, is keyboard/scrim dismissible, and meets
 * a11y (role=alertdialog, focus the primary action, Esc to cancel).
 *
 * Usage:
 *   const { confirm, confirmDialog } = useConfirm()
 *   ...
 *   if (!(await confirm({ title, message, tone: 'danger' }))) return
 *   ...
 *   return (<>{confirmDialog}{rest}</>)
 */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve
        setOpts(options)
      }),
    []
  )

  const settle = useCallback((v: boolean) => {
    resolverRef.current?.(v)
    resolverRef.current = null
    setOpts(null)
  }, [])

  const confirmDialog = opts ? (
    <ConfirmDialog options={opts} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
  ) : null

  return { confirm, confirmDialog }
}

function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void
}) {
  const {
    title = 'Are you sure?',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'primary',
    hideCancel = false,
  } = options
  const confirmRef = useRef<HTMLButtonElement>(null)

  const toneMap = {
    primary: { wrap: 'bg-primary/10 text-primary', icon: 'ri-question-line', btn: 'ti-btn-primary' },
    danger: { wrap: 'bg-danger/10 text-danger', icon: 'ri-error-warning-line', btn: 'ti-btn-danger' },
    success: { wrap: 'bg-success/10 text-success', icon: 'ri-checkbox-circle-line', btn: 'ti-btn-success' },
  } as const
  const t = toneMap[tone]

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-defaultborder bg-white shadow-xl dark:border-defaultborder/10 dark:bg-bodybg">
        <div className="flex items-start gap-3 border-b border-defaultborder/70 px-5 py-4 dark:border-defaultborder/10">
          <span
            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.wrap}`}
          >
            <i className={`${t.icon} text-lg`} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-defaulttextcolor dark:text-white">
              {title}
            </h3>
            <div className="mt-1 text-sm text-defaulttextcolor/70 dark:text-white/70">{message}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2 bg-light/30 px-5 py-3.5 dark:bg-white/[0.02]">
          {!hideCancel && (
            <button
              type="button"
              className="ti-btn ti-btn-light !min-h-[44px] !py-2 !px-4 !text-sm font-medium"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className={`ti-btn !min-h-[44px] !py-2 !px-4 !text-sm font-medium ${t.btn}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
