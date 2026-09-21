"use client"

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useModalBehavior } from '@/shared/hooks/useModalBehavior'
import ConfirmDiscardDialog from '@/shared/components/ConfirmDiscardDialog'
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
import PayrollDetailsTab from './PayrollDetailsTab'

// 'Bank' is deliberately absent: structured bank details are collected on the
// Bank & payroll tab, and leaving 'Bank' here sent recruiters down the old
// upload-a-file path instead. It stays in the model's DOCUMENT_TYPES enum so
// documents already stored under it keep validating and rendering — this list
// only controls what can be requested or uploaded from now on. 'Bank Proof'
// replaces it and is what the payroll form's proof upload expects.
const DOC_TYPE_GROUPS: Array<{ label: string; options: string[] }> = [
  {
    label: 'Identity / KYC (Pre-boarding)',
    options: ['Aadhar', 'PAN', 'Bank Proof', 'Passport'],
  },
  {
    label: 'Payroll forms',
    options: ['W-4', 'State Withholding Certificate', 'Form 12BB', 'Form I-9'],
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

const DIALOG_Z = 12050
// Mirrors backend jobApplicationUpload (multer): PDF/DOCX/JPG/PNG, 10MB.
// Keep in sync with uat.dharwin.backend/src/middlewares/upload.js.
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png']
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',')
const MAX_LABEL_LEN = 80
const MAX_NOTES_LEN = 500
const INVALID_FIELD = '!border-rose-400 dark:!border-rose-500/70'
const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
// `.ti-btn-sm` hard-sets w-[1.75rem] h-[1.75rem] — a 28px square meant for
// icon-only buttons (public/assets/scss/tailwind/_buttons.scss). !w-auto/!h-auto
// drop that fixed box so a labelled button can size to its text; min-h/min-w
// then supply the 44px touch floor. Without !w-auto the labels overflow and
// overlap the next button. !shrink-0 keeps the row wrapping rather than squeezing.
const BTN_44 =
  '!mb-0 !h-auto !w-auto !min-h-11 !min-w-11 !shrink-0 !whitespace-nowrap !inline-flex !items-center !justify-center !px-3 !py-2 !text-[0.8125rem]'

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
  // Bumped to force the uncontrolled <input type="file"> to drop its stale filename.
  const [fileInputKey, setFileInputKey] = useState(0)
  // Field-level validation. The submit buttons stay enabled so a click always
  // explains what is missing — a disabled button is neither clickable nor
  // announced by screen readers, so the user gets no feedback at all.
  type FieldError = { field: string; message: string } | null
  const [uploadFieldError, setUploadFieldError] = useState<FieldError>(null)
  const [reqFieldError, setReqFieldError] = useState<FieldError>(null)
  const [verifyingIdx, setVerifyingIdx] = useState<number | null>(null)
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  // Admin → candidate document requests
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [reqType, setReqType] = useState<string>('')
  const [reqCustomLabel, setReqCustomLabel] = useState<string>('')
  const [reqNotes, setReqNotes] = useState<string>('')
  const [requesting, setRequesting] = useState(false)

  const [tab, setTab] = useState<'documents' | 'payroll'>('documents')
  const [payrollDirty, setPayrollDirty] = useState(false)
  const isDirty = Boolean(docType || customLabel || file || reqType || reqCustomLabel || reqNotes || payrollDirty)
  const { containerRef, backdropProps, requestClose, confirmDiscardOpen, confirmDiscard, cancelDiscard } =
    useModalBehavior({ isOpen: true, onClose, isDirty })

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

  // Auto-dismiss success without a detached timer firing after unmount.
  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), 2200)
    return () => clearTimeout(t)
  }, [success])

  // Banners live at the top of a scrollable body — pull them into view.
  useEffect(() => {
    if (error || success) bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [error, success])

  const handleView = async (idx: number) => {
    setError(null)
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
    setError(null)
    try {
      const { url } = await getDocumentDownloadUrl(candidateId, idx)
      // Force download via temporary anchor with `download` attr
      const a = document.createElement('a')
      a.href = url
      a.download = fallbackName || `document-${idx + 1}`
      // Presigned S3 URLs are cross-origin: browsers ignore `download` there and
      // would navigate this tab away, destroying the modal. Open a new tab instead.
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'Download failed')
    }
  }

  const failReqField = (field: string, message: string, focusId: string) => {
    setReqFieldError({ field, message })
    document.getElementById(focusId)?.focus()
  }

  const handleRequestDocument = async () => {
    setReqFieldError(null)
    if (!reqType) {
      failReqField('type', 'Pick a document type to request.', 'preb-req-type')
      return
    }
    const finalLabel = reqType === 'Other' ? reqCustomLabel.trim() : reqType
    if (!finalLabel) {
      failReqField('label', 'Enter a label for this custom document.', 'preb-req-custom-label')
      return
    }
    const alreadyPending = requests.some(
      (r) => r.status === 'pending' && (r.label || '').trim().toLowerCase() === finalLabel.toLowerCase()
    )
    if (alreadyPending) {
      failReqField(
        'type',
        `"${finalLabel}" is already requested and still pending. Cancel it first to re-request.`,
        'preb-req-type'
      )
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
    if (deletingIdx !== null) return
    if (!window.confirm(`Delete "${label || `Document ${idx + 1}`}"? This cannot be undone.`)) return
    setError(null)
    setDeletingIdx(idx)
    try {
      // ponytail: the API addresses documents positionally, so a concurrent
      // delete by another admin shifts indexes. refresh() re-syncs right after.
      await deleteCandidateDocument(candidateId, idx)
      setSuccess('Document deleted')
      await refresh()
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'Delete failed')
    } finally {
      setDeletingIdx(null)
    }
  }

  const handleVerify = async (idx: number, status: number) => {
    if (verifyingIdx !== null) return
    setError(null)
    setVerifyingIdx(idx)
    try {
      await verifyDocument(candidateId, idx, status)
      setStatusMap((prev) => ({ ...prev, [idx]: { ...prev[idx], status } }))
      setSuccess(status === 1 ? 'Document approved' : 'Document rejected')
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      setError(ax?.response?.data?.message || ax?.message || 'Verify failed')
    } finally {
      setVerifyingIdx(null)
    }
  }

  const resetUploadForm = () => {
    setDocType('')
    setCustomLabel('')
    setFile(null)
    setFileInputKey((k) => k + 1)
    setUploadFieldError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null
    if (!picked) {
      setFile(null)
      return
    }
    const lower = picked.name.toLowerCase()
    const reject = (message: string) => {
      setError(message)
      setFile(null)
      setFileInputKey((k) => k + 1)
    }
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      reject('Unsupported file type. Use PDF, DOCX, JPG or PNG.')
      return
    }
    if (picked.size === 0) {
      reject('That file is empty (0 bytes). Pick another file.')
      return
    }
    if (picked.size > MAX_FILE_BYTES) {
      reject(`File is ${formatBytes(picked.size)} — the limit is 10 MB.`)
      return
    }
    setError(null)
    setUploadFieldError(null)
    setFile(picked)
  }

  const failUploadField = (field: string, message: string, focusId: string) => {
    setUploadFieldError({ field, message })
    document.getElementById(focusId)?.focus()
  }

  const handleUpload = async () => {
    setUploadFieldError(null)
    if (!docType) {
      failUploadField('type', 'Pick a document type first.', 'preb-doc-type')
      return
    }
    const finalLabel = docType === 'Other' ? customLabel.trim() : docType
    if (!finalLabel) {
      failUploadField('label', 'Enter a label for this custom document.', 'preb-doc-custom-label')
      return
    }
    if (!file) {
      failUploadField('file', 'Choose a file to upload.', 'preb-doc-file')
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
    <Fragment>
      <div
        className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px] sm:p-6"
        style={{ zIndex: DIALOG_Z }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preb-docs-title"
        {...backdropProps}
      >
        <div
          ref={containerRef}
          className="relative my-6 w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950"
        >
        <div className="flex items-start gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
          <span className="mt-0.5 inline-block h-9 w-0.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <h4 id="preb-docs-title" className="mb-0.5 text-base font-semibold text-slate-800 dark:text-slate-100">
              Identity documents (KYC)
            </h4>
            <p className="mb-0 text-sm text-slate-500 dark:text-slate-400">
              {candidateName}
              <span className="text-slate-400 dark:text-slate-500"> · attached to candidate profile</span>
            </p>
            <p className="mb-0 mt-1 text-xs text-slate-500 dark:text-slate-400">
              Upload or request Aadhar, PAN, and other ID proofs; HR verifies them here (separate from BGV).
            </p>
          </div>
          <button
            type="button"
            className={`ti-btn ti-btn-light ti-btn-sm !shrink-0 ${BTN_44}`}
            onClick={requestClose}
            aria-label="Close"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="KYC sections"
          className="flex gap-1 border-b border-slate-200/80 px-5 dark:border-white/10"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            setTab((current) => (current === 'documents' ? 'payroll' : 'documents'))
          }}
        >
          <button
            type="button"
            role="tab"
            id="preb-tab-documents"
            aria-controls="preb-panel-documents"
            aria-selected={tab === 'documents'}
            tabIndex={tab === 'documents' ? 0 : -1}
            className={`ti-btn ti-btn-sm !mb-0 rounded-none border-0 border-b-2 bg-transparent ${BTN_44} ${
              tab === 'documents'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-slate-400'
            }`}
            onClick={() => setTab('documents')}
          >
            Documents
          </button>
          <button
            type="button"
            role="tab"
            id="preb-tab-payroll"
            aria-controls="preb-panel-payroll"
            aria-selected={tab === 'payroll'}
            tabIndex={tab === 'payroll' ? 0 : -1}
            className={`ti-btn ti-btn-sm !mb-0 rounded-none border-0 border-b-2 bg-transparent ${BTN_44} ${
              tab === 'payroll'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-slate-400'
            }`}
            onClick={() => setTab('payroll')}
          >
            Bank & payroll
          </button>
        </div>

        {tab === 'documents' && (
        <div
          ref={bodyRef}
          id="preb-panel-documents"
          role="tabpanel"
          aria-labelledby="preb-tab-documents"
          className="max-h-[min(75vh,40rem)] space-y-4 overflow-y-auto px-5 py-4"
        >
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
            >
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
                    className={`form-control ${uploadFieldError?.field === 'type' ? INVALID_FIELD : ''}`}
                    value={docType}
                    aria-invalid={uploadFieldError?.field === 'type' || undefined}
                    aria-describedby={uploadFieldError?.field === 'type' ? 'preb-doc-type-error' : undefined}
                    onChange={(e) => {
                      setDocType(e.target.value)
                      setUploadFieldError(null)
                    }}
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
                  {uploadFieldError?.field === 'type' && (
                    <p id="preb-doc-type-error" role="alert" className="mb-0 mt-1 text-xs text-rose-600 dark:text-rose-300">
                      {uploadFieldError.message}
                    </p>
                  )}
                </div>
                {docType === 'Other' && (
                  <div className="min-w-0">
                    <label className="form-label" htmlFor="preb-doc-custom-label">
                      Custom label
                    </label>
                    <input
                      id="preb-doc-custom-label"
                      type="text"
                      className={`form-control ${uploadFieldError?.field === 'label' ? INVALID_FIELD : ''}`}
                      maxLength={MAX_LABEL_LEN}
                      placeholder="e.g. Reference letter"
                      value={customLabel}
                      aria-invalid={uploadFieldError?.field === 'label' || undefined}
                      aria-describedby={uploadFieldError?.field === 'label' ? 'preb-doc-label-error' : undefined}
                      onChange={(e) => {
                        setCustomLabel(e.target.value)
                        setUploadFieldError(null)
                      }}
                    />
                    {uploadFieldError?.field === 'label' && (
                      <p id="preb-doc-label-error" role="alert" className="mb-0 mt-1 text-xs text-rose-600 dark:text-rose-300">
                        {uploadFieldError.message}
                      </p>
                    )}
                  </div>
                )}
                <div className="min-w-0 sm:col-span-2">
                  <label className="form-label" htmlFor="preb-doc-file">
                    File
                  </label>
                  <input
                    key={fileInputKey}
                    id="preb-doc-file"
                    type="file"
                    className={`form-control ${uploadFieldError?.field === 'file' ? INVALID_FIELD : ''}`}
                    accept={ACCEPT_ATTR}
                    aria-invalid={uploadFieldError?.field === 'file' || undefined}
                    aria-describedby={
                      uploadFieldError?.field === 'file' ? 'preb-doc-file-error' : 'preb-doc-file-hint'
                    }
                    onChange={handleFileChange}
                  />
                  {uploadFieldError?.field === 'file' && (
                    <p id="preb-doc-file-error" role="alert" className="mb-0 mt-1 text-xs text-rose-600 dark:text-rose-300">
                      {uploadFieldError.message}
                    </p>
                  )}
                  <p id="preb-doc-file-hint" className="mb-0 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {file ? (
                      <span className="text-slate-700 dark:text-slate-200">
                        <i className="ri-attachment-2 me-1 align-middle" aria-hidden />
                        <span className="break-all">{file.name}</span> · {formatBytes(file.size)}
                      </span>
                    ) : (
                      'PDF, DOCX, JPG or PNG · up to 10 MB'
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  className={`ti-btn ti-btn-light ${BTN_44}`}
                  onClick={() => {
                    setError(null)
                    resetUploadForm()
                  }}
                  disabled={uploading}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className={`ti-btn ti-btn-primary ${BTN_44}`}
                  onClick={handleUpload}
                  disabled={uploading}
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
                    className={`form-control ${reqFieldError?.field === 'type' ? INVALID_FIELD : ''}`}
                    value={reqType}
                    aria-invalid={reqFieldError?.field === 'type' || undefined}
                    aria-describedby={reqFieldError?.field === 'type' ? 'preb-req-type-error' : undefined}
                    onChange={(e) => {
                      setReqType(e.target.value)
                      setReqFieldError(null)
                    }}
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
                  {reqFieldError?.field === 'type' && (
                    <p id="preb-req-type-error" role="alert" className="mb-0 mt-1 text-xs text-rose-600 dark:text-rose-300">
                      {reqFieldError.message}
                    </p>
                  )}
                </div>
                {reqType === 'Other' && (
                  <div className="min-w-0">
                    <label className="form-label" htmlFor="preb-req-custom-label">Custom label</label>
                    <input
                      id="preb-req-custom-label"
                      type="text"
                      className={`form-control ${reqFieldError?.field === 'label' ? INVALID_FIELD : ''}`}
                      maxLength={MAX_LABEL_LEN}
                      placeholder="e.g. Address proof"
                      value={reqCustomLabel}
                      aria-invalid={reqFieldError?.field === 'label' || undefined}
                      aria-describedby={reqFieldError?.field === 'label' ? 'preb-req-label-error' : undefined}
                      onChange={(e) => {
                        setReqCustomLabel(e.target.value)
                        setReqFieldError(null)
                      }}
                    />
                    {reqFieldError?.field === 'label' && (
                      <p id="preb-req-label-error" role="alert" className="mb-0 mt-1 text-xs text-rose-600 dark:text-rose-300">
                        {reqFieldError.message}
                      </p>
                    )}
                  </div>
                )}
                <div className="min-w-0 sm:col-span-2">
                  <label className="form-label" htmlFor="preb-req-notes">Notes (optional)</label>
                  <textarea
                    id="preb-req-notes"
                    className="form-control"
                    rows={2}
                    maxLength={MAX_NOTES_LEN}
                    placeholder="Add instructions for the candidate (e.g. last 3 months only, both sides)"
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className={`ti-btn ti-btn-primary ${BTN_44}`}
                  onClick={handleRequestDocument}
                  disabled={requesting}
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
                            <p
                              className="mb-0 truncate text-sm font-medium text-slate-800 dark:text-slate-100"
                              title={`${r.type ? `[${r.type}] ` : ''}${r.label}`}
                            >
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
                              className={`ti-btn ti-btn-sm ti-btn-light ${BTN_44}`}
                              onClick={() => handleCancelRequest(r.index)}
                              disabled={loading}
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
                        <p
                          className="mb-0 truncate text-sm font-medium text-slate-800 dark:text-slate-100"
                          title={`${doc.type ? `[${doc.type}] ` : ''}${doc.label || doc.originalName || `Document ${idx + 1}`}`}
                        >
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
                          className={`ti-btn ti-btn-sm ti-btn-light ${BTN_44}`}
                          onClick={() => handleView(idx)}
                          title="Preview in new tab"
                        >
                          <i className="ri-eye-line me-1" aria-hidden />
                          View
                        </button>
                        <button
                          type="button"
                          className={`ti-btn ti-btn-sm ti-btn-primary ${BTN_44}`}
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
                              className={`ti-btn ti-btn-sm ti-btn-success ${BTN_44}`}
                              onClick={() => handleVerify(idx, 1)}
                              disabled={st?.status === 1 || verifyingIdx !== null}
                              title="Approve: mark this document as accepted. Candidate sees an Approved badge in My Applications."
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className={`ti-btn ti-btn-sm ti-btn-danger ${BTN_44}`}
                              onClick={() => handleVerify(idx, 2)}
                              disabled={st?.status === 2 || verifyingIdx !== null}
                              title="Reject: flag this document. Candidate sees a Rejected banner in My Applications and can re-upload."
                            >
                              Reject
                            </button>
                          </Fragment>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className={`ti-btn ti-btn-sm border border-rose-500/40 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10 ${BTN_44}`}
                            onClick={() => handleDeleteDoc(idx, doc.label || doc.originalName)}
                            disabled={deletingIdx !== null}
                            aria-label={`Delete document ${doc.label || doc.originalName || `Document ${idx + 1}`}`}
                            title="Delete this document permanently"
                          >
                            <i
                              className={
                                deletingIdx === idx ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-line'
                              }
                              aria-hidden
                            />
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
        )}
        {tab === 'payroll' && (
        <div
          id="preb-panel-payroll"
          role="tabpanel"
          aria-labelledby="preb-tab-payroll"
          className="max-h-[min(75vh,40rem)] space-y-4 overflow-y-auto px-5 py-4"
        >
          <PayrollDetailsTab
            candidateId={candidateId}
            candidateName={candidateName}
            canEdit={canEdit}
            canCreate={canCreate}
            canReveal={canEdit}
            onDirtyChange={setPayrollDirty}
          />
        </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-200/80 px-5 py-3 dark:border-white/10">
          <button type="button" className={`ti-btn ti-btn-light ${BTN_44}`} onClick={requestClose}>
            Close
          </button>
        </div>
        </div>
      </div>

      <ConfirmDiscardDialog open={confirmDiscardOpen} onConfirm={confirmDiscard} onCancel={cancelDiscard} />
    </Fragment>
  )
}

export { INVALID_FIELD, BTN_44 }
export default PreBoardingDocumentsModal
