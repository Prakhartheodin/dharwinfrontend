"use client"

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import {
  getMyDocumentRequests,
  fulfillDocumentRequest,
  replaceMyRejectedDocument,
  type DocumentRequest,
  type RejectedDocument,
} from '@/shared/lib/api/employees'

interface Props {
  refreshKey?: number
  /** When true, render inside an application card (no top-of-page margins). */
  inline?: boolean
}

const DocumentsActionCard: React.FC<Props> = ({ refreshKey, inline }) => {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [rejected, setRejected] = useState<RejectedDocument[]>([])
  const [approved, setApproved] = useState<RejectedDocument[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyIndex, setBusyIndex] = useState<string | null>(null)
  const requestInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const rejectedInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMyDocumentRequests()
      setRequests(data.requests ?? [])
      setRejected(data.rejectedDocuments ?? [])
      setApproved(data.approvedDocuments ?? [])
    } catch (e) {
      setRequests([])
      setRejected([])
      setApproved([])
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const handleFulfill = async (req: DocumentRequest, file: File) => {
    const key = `req-${req.index}`
    setBusyIndex(key)
    setError(null)
    try {
      await fulfillDocumentRequest(req.index, file)
      await load()
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'Upload failed')
    } finally {
      setBusyIndex(null)
    }
  }

  const handleReplace = async (doc: RejectedDocument, file: File) => {
    const key = `rej-${doc.index}`
    setBusyIndex(key)
    setError(null)
    try {
      await replaceMyRejectedDocument(doc.index, file)
      await load()
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'Replace failed')
    } finally {
      setBusyIndex(null)
    }
  }

  if (loading) return null
  if (requests.length === 0 && rejected.length === 0 && approved.length === 0) return null

  const hasActionItems = requests.length > 0 || rejected.length > 0
  const outerSpacing = inline ? 'border-t border-defaultborder/40 dark:border-white/10' : ''
  const cardMargin = inline ? 'mt-0' : 'mb-6'

  return (
    <div className={`${outerSpacing} ${inline ? 'px-5 py-4 space-y-4 bg-defaultborder/5 dark:bg-white/[0.02]' : ''}`}>
    {hasActionItems && (
    <div className={`${cardMargin} rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white shadow-sm dark:border-amber-900/40 dark:from-amber-950/30 dark:to-bodybg`}>
      <div className="flex items-start gap-3 border-b border-amber-200/60 px-5 py-4 dark:border-amber-900/30">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200" aria-hidden>
          <i className="ri-file-warning-line text-lg" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="mb-0.5 text-base font-semibold text-amber-900 dark:text-amber-100">
            Action needed on your documents
          </h2>
          <p className="mb-0 text-sm text-amber-800/80 dark:text-amber-200/80">
            {requests.length > 0 && `${requests.length} document${requests.length > 1 ? 's' : ''} requested`}
            {requests.length > 0 && rejected.length > 0 && ' · '}
            {rejected.length > 0 && `${rejected.length} rejected — please re-upload`}
          </p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {error && (
          <div className="rounded-lg border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        {requests.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900/70 dark:text-amber-200/70">
              Requested by recruiter
            </h3>
            <ul className="space-y-2">
              {requests.map((r) => {
                const busy = busyIndex === `req-${r.index}`
                return (
                  <li
                    key={r.index}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200/70 bg-white px-3 py-3 dark:border-amber-900/30 dark:bg-bodybg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="mb-0 truncate text-sm font-medium text-defaulttextcolor dark:text-white">
                        {r.type ? <span className="text-slate-500 dark:text-white/50">[{r.type}] </span> : null}
                        {r.label}
                      </p>
                      {r.notes && (
                        <p className="mb-0 mt-0.5 text-xs text-slate-600 dark:text-white/60">{r.notes}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <input
                        ref={(el) => { requestInputRefs.current[r.index] = el }}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void handleFulfill(r, f)
                          e.target.value = ''
                        }}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => requestInputRefs.current[r.index]?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {busy ? (
                          <Fragment>
                            <i className="ri-loader-4-line animate-spin" aria-hidden />
                            Uploading…
                          </Fragment>
                        ) : (
                          <Fragment>
                            <i className="ri-upload-2-line" aria-hidden />
                            Upload
                          </Fragment>
                        )}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {rejected.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-800/80 dark:text-rose-200/70">
              Rejected — replace with a new file
            </h3>
            <ul className="space-y-2">
              {rejected.map((d) => {
                const busy = busyIndex === `rej-${d.index}`
                return (
                  <li
                    key={d.index}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200/70 bg-white px-3 py-3 dark:border-rose-900/30 dark:bg-bodybg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="mb-0 truncate text-sm font-medium text-defaulttextcolor dark:text-white">
                        {d.type ? <span className="text-slate-500 dark:text-white/50">[{d.type}] </span> : null}
                        {d.label || d.originalName || `Document ${d.index + 1}`}
                      </p>
                      {d.adminNotes && (
                        <p className="mb-0 mt-0.5 text-xs text-rose-700 dark:text-rose-300">
                          <span className="font-medium">Reviewer note:</span> {d.adminNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <input
                        ref={(el) => { rejectedInputRefs.current[d.index] = el }}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void handleReplace(d, f)
                          e.target.value = ''
                        }}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => rejectedInputRefs.current[d.index]?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed dark:border-rose-500/40 dark:bg-bodybg dark:text-rose-300 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        {busy ? (
                          <Fragment>
                            <i className="ri-loader-4-line animate-spin" aria-hidden />
                            Replacing…
                          </Fragment>
                        ) : (
                          <Fragment>
                            <i className="ri-refresh-line" aria-hidden />
                            Re-upload
                          </Fragment>
                        )}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
    )}

    {approved.length > 0 && (
      <div className={`${cardMargin} rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-white shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-bodybg`}>
        <div className="flex items-start gap-3 border-b border-emerald-200/60 px-5 py-4 dark:border-emerald-900/30">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200" aria-hidden>
            <i className="ri-shield-check-line text-lg" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="mb-0.5 text-base font-semibold text-emerald-900 dark:text-emerald-100">
              Approved documents
            </h2>
            <p className="mb-0 text-sm text-emerald-800/80 dark:text-emerald-200/80">
              {approved.length} document{approved.length > 1 ? 's' : ''} verified by recruiter
            </p>
          </div>
        </div>
        <ul className="space-y-2 px-5 py-4">
          {approved.map((d) => (
            <li
              key={d.index}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200/60 bg-white px-3 py-3 dark:border-emerald-900/30 dark:bg-bodybg"
            >
              <div className="min-w-0 flex-1">
                <p className="mb-0 truncate text-sm font-medium text-defaulttextcolor dark:text-white">
                  {d.type ? <span className="text-slate-500 dark:text-white/50">[{d.type}] </span> : null}
                  {d.label || d.originalName || `Document ${d.index + 1}`}
                </p>
                <span className="mt-0.5 inline-block rounded bg-emerald-100/80 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                  <i className="ri-check-line me-0.5" aria-hidden />Approved
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}
    </div>
  )
}

export default DocumentsActionCard
