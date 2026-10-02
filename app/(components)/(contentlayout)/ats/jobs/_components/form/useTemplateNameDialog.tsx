'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

export function useTemplateNameDialog() {
  const [open, setOpen] = useState<{ defaultValue: string } | null>(null)
  const resolverRef = useRef<((value: string | null) => void) | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const promptTemplateName = useCallback(
    (defaultValue: string) =>
      new Promise<string | null>((resolve) => {
        resolverRef.current = resolve
        setOpen({ defaultValue })
      }),
    []
  )

  const close = useCallback((value: string | null) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setOpen(null)
  }, [])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  const templateNameDialog = open ? (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-name-dialog-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close(null)
      }}
    >
      <form
        className="w-full max-w-md overflow-hidden rounded-xl border border-defaultborder bg-white shadow-xl dark:border-defaultborder/10 dark:bg-bodybg"
        onSubmit={(e) => {
          e.preventDefault()
          const value = inputRef.current?.value?.trim() ?? ''
          if (!value) {
            inputRef.current?.focus()
            return
          }
          close(value)
        }}
      >
        <div className="border-b border-defaultborder/70 px-5 py-4 dark:border-defaultborder/10">
          <h3 id="template-name-dialog-title" className="text-base font-semibold text-defaulttextcolor dark:text-white">
            Save as template
          </h3>
          <p className="mt-1 text-sm text-defaulttextcolor/70 dark:text-white/70 mb-3">
            Name this description so you can reuse it on future postings.
          </p>
          <label htmlFor="template-name-input" className="form-label">Template name</label>
          <input
            ref={inputRef}
            id="template-name-input"
            type="text"
            className="form-control !rounded-md"
            defaultValue={open.defaultValue}
            placeholder="e.g. Senior Backend Engineer"
            autoComplete="off"
          />
        </div>
        <div className="flex justify-end gap-2 bg-light/30 px-5 py-3.5 dark:bg-white/[0.02]">
          <button
            type="button"
            className="ti-btn ti-btn-light !min-h-[44px] !py-2 !px-4"
            onClick={() => close(null)}
          >
            Cancel
          </button>
          <button type="submit" className="ti-btn ti-btn-primary !min-h-[44px] !py-2 !px-4">
            Save
          </button>
        </div>
      </form>
    </div>
  ) : null

  return { promptTemplateName, templateNameDialog }
}
