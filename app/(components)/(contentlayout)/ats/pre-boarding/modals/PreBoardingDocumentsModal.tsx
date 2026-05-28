"use client"

import React, { Fragment, useCallback, useEffect, useState } from 'react'
import {
  getCandidateDocuments,
  getDocumentDownloadUrl,
  getDocumentStatus,
  adminUploadCandidateDocument,
  deleteCandidateDocument,
  verifyDocument,
  requestDocumentFromCandidate,
  cancelDocumentRequest,
  getCandidateDocumentRequests,
  type CandidateDocument,
  type DocumentRequest,
} from '@/shared/lib/api/employees'

const DOC_TYPE_GROUPS: Array<{ label: string; options: string[] }> = [
  {
    label: 'Identity / KYC (Pre-boarding)',
    options: ['Aadhar', 'PAN', 'Bank', 'Passport'],
  },
  {
    label: 'Application',
    options: [
      'CV/Resume',
      'Marksheet',
      'Degree Certificate',
      'Experience Letter',
      'Offer Letter',
      'Visa',
      'EAD Card',
      'I-765 Receipt',
      'I-983 Form-only',
    ],
  },
]

type DocStatusItem = { status: number; adminNotes?: string }

interface Props {
  candidateId: string
  candidateName: string
  /** Allows uploading new docs + approving/rejecting existing docs. */
  canEdit: boolean
  /** Allows sending a document request to the candidate. */
  canCreate: boolean
  /** Allows deleting documents. */
  canDelete: boolean
  onClose: () => void
}

const PreBoardingDocumentsModal: React.FC<Props> = ({ candidateId, candidateName, canEdit, canCreate, canDelete, onClose }) => {
  const [docs, setDocs] = useState<CandidateDocument[]>([])
  const [statusMap, setStatusMap] = useState<Record<number, DocStatusItem>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [docType, setDocType] = useState<string>('')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Admin → candidate document requests
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [reqType, setReqType] = useState<string>('')
  const [reqCustomLabel, setReqCustomLabel] = useState<string>('')
  const [reqNotes, setReqNotes] = useState<string>('')
  const [requesting, setRequesting] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listResult, statusRes, reqList] = await Promise.all([
        getCandidateDocuments(candidateId).catch((e) => {
          const ax = e as { response?: { data?: { message?: string } }; message?: string }
          throw new Error(ax?.response?.data?.message || ax?.message || 'Failed to load documents')
        }),
        getDocumentStatus(candidateId).catch(() => ({ documents: [] as Array<{ index: number; status: number; adminNotes?: string }> })),
        getCandidateDocumentRequests(candidateId).catch(() => [] as DocumentRequest[]),
      ])
      setDocs(Array.isArray(listResult) ? listResult : [])
      const m: Record<number, DocStatusItem> = {}
      ;(statusRes?.documents ?? []).forEach((d) => {
        m[d.index] = { status: d.status, adminNotes: d.adminNotes }
      })
      setStatusMap(m)
      setRequests(Array.isArray(reqList) ? reqList : [])
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load documents'
      setError(message)
      setDocs([])
      setStatusMap({})
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [candidateId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleView = async (idx: number) => {
    try {
      const { url } = await getDocumentDownloadUrl(candidateId, idx)
      // Open in new tab; browser inline-renders PDF/images
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'View failed')
    }
  }

  const handleDownload = async (idx: number, fallbackName?: string) => {
    try {
      const { url } = await getDocumentDownloadUrl(candidateId, idx)
      // Force download via temporary anchor with `download` attr
      const a = document.createElement('a')
      a.href = url
      a.download = fallbackName || `document-${idx + 1}`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'Download failed')
    }
  }

  const handleRequestDocument = async () => {
    const finalLabel = reqType === 'Other' ? reqCustomLabel.trim() : reqType
    if (!finalLabel) {
      setError('Pick a document type to request.')
      return
    }
    setRequesting(true)
    setError(null)
    try {
      await requestDocumentFromCandidate(candidateId, {
        type: reqType || 'Other',
        label: finalLabel,
        notes: reqNotes.trim() || undefined,
      })
      setSuccess('Document requested. Candidate will see it in My Applications.')
      setTimeout(() => setSuccess(null), 2200)
      setReqType('')
      setReqCustomLabel('')
      setReqNotes('')
      await refresh()
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'Request failed')
    } finally {
      setRequesting(false)
    }
  }

  const handleCancelRequest = async (idx: number) => {
    setError(null)
    try {
      await cancelDocumentRequest(candidateId, idx)
      await refresh()
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'Cancel failed')
    }
  }

  const handleDeleteDoc = async (idx: number, label?: string) => {
    if (!window.confirm(`Delete "${label || `Document ${idx + 1}`}"? This cannot be undone.`)) return
    setError(null)
    try {
      await deleteCandidateDocument(candidateId, idx)
      setSuccess('Document deleted')
      setTimeout(() => setSuccess(null), 1800)
      await refresh()
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'Delete failed')
    }
  }

  const handleVerify = async (idx: number, status: number) => {
    setError(null)
    try {
      await verifyDocument(candidateId, idx, status)
      setStatusMap((prev) => ({ ...prev, [idx]: { status } }))
      setSuccess(status === 1 ? 'Document approved' : 'Document rejected')
      setTimeout(() => setSuccess(null), 1800)
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'Verify failed')
    }
  }

  const resetUploadForm = () => {
    setDocType('')
    setCustomLabel('')
    setFile(null)
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please choose a file to upload.')
      return
    }
    const finalLabel = docType === 'Other' ? customLabel.trim() : docType
    if (!finalLabel) {
      setError('Please pick a document type (or enter a custom label).')
      return
    }
    setUploading(true)
    setError(null)
    try {
      await adminUploadCandidateDocument(candidateId, file, {
        type: docType || 'Other',
        label: finalLabel,
      })
      setSuccess('Document uploaded')
      setTimeout(() => setSuccess(null), 1800)
      resetUploadForm()
      await refresh()
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preb-docs-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative my-6 w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-start gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
          <span className="mt-0.5 inline-block h-9 w-0.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <h4 id="preb-docs-title" className="mb-0.5 text-base font-semibold text-slate-800 dark:text-slate-100">
              Documents
            </h4>
            <p className="mb-0 text-sm text-slate-500 dark:text-slate-400">
              {candidateName}
              <span className="text-slate-400 dark:text-slate-500"> · attached to candidate profile</span>
            </p>
          </div>
          <button
            type="button"
            className="ti-btn ti-btn-light ti-btn-sm !shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="max-h-[min(75vh,40rem)] space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-lg border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              {success}
            </div>
          )}

          {canEdit && (
            <div className="rounded-lg border border-slate-200/90 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
              <h5 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Upload new document</h5>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Uploads attach to this candidate. They carry over automatically when the candidate is promoted to Employee.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="form-label" htmlFor="preb-doc-type">
                    Type
                  </label>
                  <select
                    id="preb-doc-type"
                    className="form-control"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    <option value="">Select type…</option>
                    {DOC_TYPE_GROUPS.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="Other">Other (custom label)</option>
                  </select>
                </div>
                {docType === 'Other' && (
                  <div className="min-w-0">
                    <label className="form-label" htmlFor="preb-doc-custom-label">
                      Custom label
                    </label>
                    <input
                      id="preb-doc-custom-label"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Reference letter"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                    />
                  </div>
                )}
                <div className="min-w-0 sm:col-span-2">
                  <label className="form-label" htmlFor="preb-doc-file">
                    File
                  </label>
                  <input
                    id="preb-doc-file"
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  className="ti-btn ti-btn-light !mb-0"
                  onClick={resetUploadForm}
                  disabled={uploading}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary !mb-0"
                  onClick={handleUpload}
                  disabled={uploading || !file || !docType || (docType === 'Other' && !customLabel.trim())}
                >
                  {uploading ? (
                    <Fragment>
                      <i className="ri-loader-4-line me-1 animate-spin align-middle" aria-hidden />
                      Uploading…
                    </Fragment>
                  ) : (
                    <Fragment>
                      <i className="ri-upload-2-line me-1 align-middle" aria-hidden />
                      Upload
                    </Fragment>
                  )}
                </button>
              </div>
            </div>
          )}

          {canCreate && (
            <div className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-white/10 dark:bg-slate-900/40">
              <h5 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                Request a document from candidate
              </h5>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Asks the candidate to upload a specific document. Shows up in their My Applications page until they upload it.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="form-label" htmlFor="preb-req-type">Type</label>
                  <select
                    id="preb-req-type"
                    className="form-control"
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value)}
                  >
                    <option value="">Select type…</option>
                    {DOC_TYPE_GROUPS.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="Other">Other (custom label)</option>
                  </select>
                </div>
                {reqType === 'Other' && (
                  <div className="min-w-0">
                    <label className="form-label" htmlFor="preb-req-custom-label">Custom label</label>
                    <input
                      id="preb-req-custom-label"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Address proof"
                      value={reqCustomLabel}
                      onChange={(e) => setReqCustomLabel(e.target.value)}
                    />
                  </div>
                )}
                <div className="min-w-0 sm:col-span-2">
                  <label className="form-label" htmlFor="preb-req-notes">Notes (optional)</label>
                  <textarea
                    id="preb-req-notes"
                    className="form-control"
                    rows={2}
                    placeholder="Add instructions for the candidate (e.g. last 3 months only, both sides)"
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="ti-btn ti-btn-primary !mb-0"
                  onClick={handleRequestDocument}
                  disabled={requesting || !reqType || (reqType === 'Other' && !reqCustomLabel.trim())}
                >
                  {requesting ? (
                    <Fragment>
                      <i className="ri-loader-4-line me-1 animate-spin align-middle" aria-hidden />
                      Requesting…
                    </Fragment>
                  ) : (
                    <Fragment>
                      <i className="ri-mail-send-line me-1 align-middle" aria-hidden />
                      Request document
                    </Fragment>
                  )}
                </button>
              </div>

              {requests.filter((r) => r.status === 'pending').length > 0 && (
                <div className="mt-4">
                  <h6 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Open requests ({requests.filter((r) => r.status === 'pending').length} pending)
                  </h6>
                  <ul className="space-y-2">
                    {requests.filter((r) => r.status === 'pending').map((r) => {
                      const isPending = r.status === 'pending'
                      const statusClass =
                        r.status === 'fulfilled'
                          ? 'bg-success/10 text-success'
                          : r.status === 'cancelled'
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-amber-100/70 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
                      return (
                        <li
                          key={r.index}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-slate-50/40 px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="mb-0 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                              {r.type ? <span className="text-slate-500 dark:text-slate-400">[{r.type}] </span> : null}
                              {r.label}
                            </p>
                            {r.notes && (
                              <p className="mb-0 mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400" title={r.notes}>
                                {r.notes}
                              </p>
                            )}
                            <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${statusClass}`}>
                              {r.status}
                            </span>
                          </div>
                          {isPending && (
                            <button
                              type="button"
                              className="ti-btn ti-btn-sm ti-btn-light !mb-0 !h-8 !min-w-fit !w-auto !py-1.5 !px-3"
                              onClick={() => handleCancelRequest(r.index)}
                            >
                              Cancel
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div>
            <h5 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Existing documents
              <span className="ms-1 text-xs font-normal text-slate-500 dark:text-slate-400">({docs.length})</span>
            </h5>
            {loading ? (
              <div className="flex items-center gap-3 px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
                <i className="ri-loader-4-line inline-block animate-spin text-primary" aria-hidden />
                Loading documents…
              </div>
            ) : docs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300/80 bg-slate-50/30 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
                <i className="ri-file-list-3-line mb-2 block text-3xl opacity-50" aria-hidden />
                No documents yet for {candidateName}.
              </div>
            ) : (
              <ul className="space-y-2">
                {docs.map((doc, idx) => {
                  const st = statusMap[idx]
                  const statusLabel = st?.status === 1 ? 'Approved' : st?.status === 2 ? 'Rejected' : 'Pending'
                  const statusClass =
                    st?.status === 1
                      ? 'bg-success/10 text-success'
                      : st?.status === 2
                        ? 'bg-rose-100/70 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  return (
                    <li
                      key={idx}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="mb-0 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {doc.type ? <span className="text-slate-500 dark:text-slate-400">[{doc.type}] </span> : null}
                          {doc.label || doc.originalName || `Document ${idx + 1}`}
                        </p>
                        <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        <button
                          type="button"
                          className="ti-btn ti-btn-sm ti-btn-light !mb-0 !h-8 !min-w-fit !w-auto !py-1.5 !px-3"
                          onClick={() => handleView(idx)}
                          title="Preview in new tab"
                        >
                          <i className="ri-eye-line me-1" aria-hidden />
                          View
                        </button>
                        <button
                          type="button"
                          className="ti-btn ti-btn-sm ti-btn-primary !mb-0 !h-8 !min-w-fit !w-auto !py-1.5 !px-3"
                          onClick={() => handleDownload(idx, doc.originalName)}
                          title="Download file"
                        >
                          <i className="ri-download-2-line me-1" aria-hidden />
                          Download
                        </button>
                        {canEdit && (
                          <Fragment>
                            <button
                              type="button"
                              className="ti-btn ti-btn-sm ti-btn-success !mb-0 !h-8 !min-w-fit !w-auto !py-1.5 !px-3"
                              onClick={() => handleVerify(idx, 1)}
                              disabled={st?.status === 1}
                              title="Approve: mark this document as accepted. Candidate sees an Approved badge in My Applications."
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="ti-btn ti-btn-sm ti-btn-danger !mb-0 !h-8 !min-w-fit !w-auto !py-1.5 !px-3"
                              onClick={() => handleVerify(idx, 2)}
                              disabled={st?.status === 2}
                              title="Reject: flag this document. Candidate sees a Rejected banner in My Applications and can re-upload."
                            >
                              Reject
                            </button>
                          </Fragment>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="ti-btn ti-btn-sm !mb-0 !h-8 !min-w-fit !w-auto !py-1.5 !px-2 border border-rose-500/40 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                            onClick={() => handleDeleteDoc(idx, doc.label || doc.originalName)}
                            title="Delete this document permanently"
                          >
                            <i className="ri-delete-bin-line" aria-hidden />
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200/80 px-5 py-3 dark:border-white/10">
          <button type="button" className="ti-btn ti-btn-light !mb-0" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PreBoardingDocumentsModal
