"use client"
import React from 'react'
import { mapCandidateToDisplay, getCandidateRecruiterFeedback, type CandidateDocument } from '@/shared/lib/api/candidates'

type CandidateDisplay = ReturnType<typeof mapCandidateToDisplay>

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const MODAL_FOOTER_BTN =
  'ti-btn !mb-0 !h-auto !w-auto !min-h-[2.75rem] !px-4 whitespace-nowrap inline-flex items-center justify-center gap-1.5'

function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Rating from 1 to 5 stars">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= value
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`Rate ${n} out of 5`}
              disabled={disabled}
              onClick={() => onChange(n)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors duration-150 ${
                filled
                  ? 'border-amber-400 bg-amber-50 text-amber-500 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10'
                  : 'border-gray-200 bg-white text-gray-300 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-400 dark:border-defaultborder/20 dark:bg-black/20'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <i className={`${filled ? 'ri-star-fill' : 'ri-star-line'} text-xl`} aria-hidden />
            </button>
          )
        })}
      </div>
      <p className="mb-0 text-xs text-gray-500 dark:text-gray-400">
        {value === 1 && 'Poor — significant concerns'}
        {value === 2 && 'Below average — needs improvement'}
        {value === 3 && 'Average — meets basic expectations'}
        {value === 4 && 'Good — solid performance'}
        {value === 5 && 'Excellent — outstanding performance'}
      </p>
    </div>
  )
}

export interface CandidateActionModalsProps {
  documentsCandidate: CandidateDisplay | null
  setDocumentsCandidate: (c: CandidateDisplay | null) => void
  documentsList: CandidateDocument[]
  documentsLoading: boolean
  documentStatusMap: Record<number, { status: number; adminNotes?: string }>
  handleDocumentDownload: (candidateId: string, docIndex: number) => void
  handleDocumentVerify: (candidateId: string, docIndex: number, status: number) => void
  salarySlipsFromCandidate: Array<{ month?: string; year?: number; key?: string }>
  handleSalarySlipView: (candidateId: string, idx: number) => void
  handleSalarySlipDelete: (candidateId: string, idx: number) => void

  salarySlipCandidate: CandidateDisplay | null
  setSalarySlipCandidate: (c: CandidateDisplay | null) => void
  salarySlipForm: { month: string; year: string; file: File | null }
  setSalarySlipForm: React.Dispatch<React.SetStateAction<{ month: string; year: string; file: File | null }>>
  salarySlipSubmitting: boolean
  handleSalarySlipSubmit: () => void

  feedbackCandidate: CandidateDisplay | null
  setFeedbackCandidate: (c: CandidateDisplay | null) => void
  feedbackForm: { feedback: string; rating: number }
  setFeedbackForm: React.Dispatch<React.SetStateAction<{ feedback: string; rating: number }>>
  feedbackSubmitting: boolean
  handleFeedbackSubmit: () => void

  exportCandidate: CandidateDisplay | null
  setExportCandidate: (c: CandidateDisplay | null) => void
  exportEmail: string
  setExportEmail: (v: string) => void
  exportSubmitting: boolean
  handleExportSubmit: () => void

  exportAllEmail: string
  setExportAllEmail: (v: string) => void
  exportAllSubmitting: boolean
  handleExportAllSubmit: () => void
  selectedExportCount: number

  assignRecruiterCandidate: CandidateDisplay | null
  setAssignRecruiterCandidate: (c: CandidateDisplay | null) => void
  recruitersList: { id: string; name: string; email?: string }[]
  assignRecruiterId: string
  setAssignRecruiterId: (v: string) => void
  assignRecruiterSubmitting: boolean
  handleAssignRecruiterSubmit: () => void

  joiningDateCandidate: CandidateDisplay | null
  setJoiningDateCandidate: (c: CandidateDisplay | null) => void
  joiningDateValue: string
  setJoiningDateValue: (v: string) => void
  joiningDateSubmitting: boolean
  handleJoiningDateSubmit: () => void

  resignDateCandidate: CandidateDisplay | null
  setResignDateCandidate: (c: CandidateDisplay | null) => void
  resignDateValue: string
  setResignDateValue: (v: string) => void
  resignDateSubmitting: boolean
  handleResignDateSubmit: () => void

  weekOffCandidateIds: string[]
  setWeekOffCandidateIds: (ids: string[]) => void
  weekOffDays: string[]
  setWeekOffDays: (days: string[]) => void
  weekOffSubmitting: boolean
  handleWeekOffSubmit: () => void
  toggleWeekOffDay: (day: string) => void

  assignShiftCandidateIds: string[]
  setAssignShiftCandidateIds: (ids: string[]) => void
  assignShiftId: string
  setAssignShiftId: (v: string) => void
  shiftsList: { id: string; name: string }[]
  assignShiftSubmitting: boolean
  handleAssignShiftSubmit: () => void

  actionError: string | null
  setActionError: (v: string | null) => void
}

export default function CandidateActionModals(props: CandidateActionModalsProps) {
  const {
    documentsCandidate, setDocumentsCandidate, documentsList, documentsLoading, documentStatusMap,
    handleDocumentDownload, handleDocumentVerify, salarySlipsFromCandidate, handleSalarySlipView, handleSalarySlipDelete,
    salarySlipCandidate, setSalarySlipCandidate, salarySlipForm, setSalarySlipForm,
    salarySlipSubmitting, handleSalarySlipSubmit,
    feedbackCandidate, setFeedbackCandidate, feedbackForm, setFeedbackForm,
    feedbackSubmitting, handleFeedbackSubmit,
    exportCandidate, setExportCandidate, exportEmail, setExportEmail,
    exportSubmitting, handleExportSubmit,
    exportAllEmail, setExportAllEmail, exportAllSubmitting, handleExportAllSubmit, selectedExportCount,
    assignRecruiterCandidate, setAssignRecruiterCandidate, recruitersList,
    assignRecruiterId, setAssignRecruiterId, assignRecruiterSubmitting, handleAssignRecruiterSubmit,
    joiningDateCandidate, setJoiningDateCandidate, joiningDateValue, setJoiningDateValue,
    joiningDateSubmitting, handleJoiningDateSubmit,
    resignDateCandidate, setResignDateCandidate, resignDateValue, setResignDateValue,
    resignDateSubmitting, handleResignDateSubmit,
    weekOffCandidateIds, setWeekOffCandidateIds, weekOffDays, setWeekOffDays,
    weekOffSubmitting, handleWeekOffSubmit, toggleWeekOffDay,
    assignShiftCandidateIds, setAssignShiftCandidateIds, assignShiftId, setAssignShiftId,
    shiftsList, assignShiftSubmitting, handleAssignShiftSubmit,
    actionError, setActionError,
  } = props

  // Export-all email: derive whether we'll email vs download, and validate input
  const exportAllEmailTrimmed = exportAllEmail.trim()
  const exportAllEmailInvalid = exportAllEmailTrimmed.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(exportAllEmailTrimmed)
  const exportAllWillEmail = exportAllEmailTrimmed.length > 0 && !exportAllEmailInvalid

  return (
    <>
      {/* Documents modal */}
      <div id="documents-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Documents – {documentsCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#documents-modal" onClick={() => setDocumentsCandidate(null)}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body min-h-[200px]">
              {documentsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
                  <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Loading documents...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {documentsList.length > 0 && (
                    <div>
                      <h6 className="form-label mb-2">Documents</h6>
                      <ul className="space-y-2">
                        {documentsList.map((doc, idx) => {
                          const st = documentStatusMap[idx]
                          const statusLabel = st?.status === 1 ? 'Approved' : st?.status === 2 ? 'Rejected' : 'Pending'
                          return (
                            <li key={idx} className="flex flex-wrap items-center justify-between gap-2 p-2 border border-gray-200 dark:border-defaultborder/10 rounded">
                              <div className="min-w-0 flex-1">
                                <span className="text-sm truncate block">{doc.type ? `[${doc.type}] ` : ''}{doc.label || doc.originalName || `Document ${idx + 1}`}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{statusLabel}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-sm ti-btn-primary !w-auto !h-auto !min-h-[1.75rem] py-1.5 px-3 whitespace-nowrap"
                                  onClick={() => documentsCandidate && handleDocumentDownload(documentsCandidate.id, idx)}
                                >
                                  Download
                                </button>
                                {documentsCandidate && (
                                  <>
                                    <button type="button" className="ti-btn ti-btn-sm ti-btn-success !w-auto !h-auto !min-h-[1.75rem] py-1.5 px-3 whitespace-nowrap" onClick={() => handleDocumentVerify(documentsCandidate.id, idx, 1)}>Approve</button>
                                    <button type="button" className="ti-btn ti-btn-sm ti-btn-danger !w-auto !h-auto !min-h-[1.75rem] py-1.5 px-3 whitespace-nowrap" onClick={() => handleDocumentVerify(documentsCandidate.id, idx, 2)}>Reject</button>
                                  </>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                  {salarySlipsFromCandidate.length > 0 && (
                    <div>
                      <h6 className="form-label mb-2">Salary slips</h6>
                      <ul className="space-y-2">
                        {salarySlipsFromCandidate.map((slip, idx) => (
                          <li key={idx} className="flex items-center justify-between gap-2 p-2 border border-gray-200 dark:border-defaultborder/10 rounded">
                            <span className="text-sm">{slip.month ?? ''} {slip.year ?? ''}</span>
                            {documentsCandidate && (
                              <div className="flex gap-1">
                                {(slip.key || (slip as any).documentUrl) && (
                                  <button type="button" className="ti-btn ti-btn-sm ti-btn-primary" onClick={() => handleSalarySlipView(documentsCandidate.id, idx)}>
                                    <i className="ri-external-link-line me-1"></i>View
                                  </button>
                                )}
                                <button type="button" className="ti-btn ti-btn-sm ti-btn-danger" onClick={() => handleSalarySlipDelete(documentsCandidate.id, idx)}>Delete</button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {documentsList.length === 0 && salarySlipsFromCandidate.length === 0 && !documentsLoading && (
                    <div className="text-center py-10 px-4">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-black/30 text-gray-400 dark:text-gray-500 mb-4">
                        <i className="ri-file-list-3-line text-3xl"></i>
                      </div>
                      <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-1">No documents yet</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
                        No documents or salary slips have been added for {documentsCandidate?.name ?? 'this candidate'}.
                      </p>
                      {documentsCandidate && (
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary"
                          onClick={() => {
                            setSalarySlipCandidate(documentsCandidate)
                            setSalarySlipForm({ month: '', year: '', file: null })
                            setActionError(null)
                            ;(window as any).HSOverlay?.close(document.querySelector('#documents-modal'))
                            setTimeout(() => {
                              ;(window as any).HSOverlay?.open(document.querySelector('#salary-slip-modal'))
                            }, 150)
                          }}
                        >
                          <i className="ri-file-add-line me-1"></i>Upload Salary Slip
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Salary slip modal */}
      <div id="salary-slip-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Upload Salary Slip – {salarySlipCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#salary-slip-modal" onClick={() => setSalarySlipCandidate(null)}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body space-y-4">
              <div>
                <label className="form-label">Month</label>
                <input type="text" className="form-control" placeholder="e.g. January" value={salarySlipForm.month} onChange={(e) => setSalarySlipForm(f => ({ ...f, month: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Year</label>
                <input type="number" className="form-control" placeholder="2024" value={salarySlipForm.year} onChange={(e) => setSalarySlipForm(f => ({ ...f, year: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">File</label>
                <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSalarySlipForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} />
              </div>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#salary-slip-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={salarySlipSubmitting || !salarySlipForm.month || !salarySlipForm.year || !salarySlipForm.file} onClick={handleSalarySlipSubmit}>
                {salarySlipSubmitting ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback modal */}
      <div id="feedback-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out m-3 lg:!mx-auto lg:w-full lg:!max-w-md">
          <div className="ti-modal-content overflow-hidden rounded-xl">
            <div className="ti-modal-header border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-white/5 dark:bg-black/20">
              <div className="flex min-w-0 items-start gap-3 pe-8">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <i className="ri-feedback-line text-xl" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h6 className="ti-modal-title mb-0 text-base font-semibold text-gray-900 dark:text-white">
                    {feedbackCandidate && getCandidateRecruiterFeedback(feedbackCandidate).feedback
                      ? 'Update feedback'
                      : 'Add feedback'}
                  </h6>
                  {feedbackCandidate?.name ? (
                    <p className="mb-0 mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                      for {feedbackCandidate.name}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="hs-dropdown-toggle ti-modal-close-btn"
                data-hs-overlay="#feedback-modal"
                onClick={() => setFeedbackCandidate(null)}
                aria-label="Close feedback dialog"
              >
                <span className="sr-only">Close</span>
                <i className="ri-close-line text-lg" aria-hidden />
              </button>
            </div>

            <div className="ti-modal-body space-y-5 px-5 py-5">
              {actionError ? (
                <div
                  className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
                  role="alert"
                >
                  {actionError}
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="feedback-text" className="form-label mb-0 font-medium text-gray-800 dark:text-gray-200">
                  Feedback <span className="text-danger">*</span>
                </label>
                <textarea
                  id="feedback-text"
                  className="form-control min-h-[7.5rem] resize-y rounded-lg !py-2.5 text-sm leading-relaxed"
                  rows={4}
                  value={feedbackForm.feedback}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, feedback: e.target.value }))}
                  placeholder="Summarize performance, interview impressions, or areas to improve…"
                  disabled={feedbackSubmitting}
                />
                <p className="mb-0 text-xs text-gray-500 dark:text-gray-400">
                  Visible to recruiters on this employee profile.
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/60 p-4 dark:border-white/5 dark:bg-black/10">
                <label className="form-label mb-0 font-medium text-gray-800 dark:text-gray-200">
                  Rating
                </label>
                <StarRatingInput
                  value={feedbackForm.rating}
                  onChange={(rating) => setFeedbackForm((f) => ({ ...f, rating }))}
                  disabled={feedbackSubmitting}
                />
              </div>
            </div>

            <div className="ti-modal-footer flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/50 px-5 py-4 dark:border-white/5 dark:bg-black/10 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={`${MODAL_FOOTER_BTN} ti-btn-light w-full border border-gray-200 dark:border-defaultborder/20 sm:w-auto`}
                data-hs-overlay="#feedback-modal"
                disabled={feedbackSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${MODAL_FOOTER_BTN} ti-btn-primary-full w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={feedbackSubmitting || !feedbackForm.feedback.trim()}
                onClick={handleFeedbackSubmit}
              >
                {feedbackSubmitting ? (
                  <>
                    <span
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      aria-hidden
                    />
                    Saving…
                  </>
                ) : feedbackCandidate && getCandidateRecruiterFeedback(feedbackCandidate).feedback ? (
                  <>
                    <i className="ri-save-line text-base" aria-hidden />
                    Save changes
                  </>
                ) : (
                  <>
                    <i className="ri-check-line text-base" aria-hidden />
                    Save feedback
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export (email) modal */}
      <div id="export-candidate-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Export profile by email – {exportCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#export-candidate-modal" onClick={() => setExportCandidate(null)}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Recipient email</label>
              <input type="email" className="form-control" placeholder="email@example.com" value={exportEmail} onChange={(e) => setExportEmail(e.target.value)} />
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#export-candidate-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={exportSubmitting || !exportEmail.trim()} onClick={handleExportSubmit}>
                {exportSubmitting ? 'Sending...' : 'Send export email'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export all candidates modal */}
      <div id="export-all-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-success/10 text-success shrink-0">
                  <i className="ri-file-excel-2-line align-middle" aria-hidden />
                </span>
                Export to Excel
              </h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#export-all-modal" aria-label="Close"><span className="sr-only">Close</span><i className="ri-close-line align-middle" aria-hidden /></button>
            </div>
            <div className="ti-modal-body">
              {/* Scope summary — what exactly will be exported */}
              <div className="flex items-start gap-2.5 rounded-md bg-primary/5 border border-primary/10 px-3 py-2.5 mb-4">
                <i className="ri-information-line text-primary text-base leading-5 shrink-0" aria-hidden />
                <p className="text-[0.8125rem] leading-5 text-defaulttextcolor dark:text-white/80 mb-0">
                  {selectedExportCount > 0
                    ? <>Exporting <span className="font-semibold">{selectedExportCount}</span> selected {selectedExportCount === 1 ? 'employee' : 'employees'}.</>
                    : <>Exporting <span className="font-semibold">all employees</span> matching the current filters.</>}
                </p>
              </div>

              {/* Optional email — controls download vs send */}
              <label htmlFor="export-all-email" className="form-label flex items-center justify-between mb-1">
                <span>Send Excel by email</span>
                <span className="text-xs font-normal text-textmuted dark:text-white/50 border border-defaultborder dark:border-white/10 rounded-full px-2 py-0.5">Optional</span>
              </label>
              <input
                id="export-all-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className={`form-control${exportAllEmailInvalid ? ' !border-danger focus:!border-danger' : ''}`}
                placeholder="name@company.com"
                value={exportAllEmail}
                onChange={(e) => setExportAllEmail(e.target.value)}
                aria-invalid={exportAllEmailInvalid}
                aria-describedby="export-all-email-help"
              />
              {exportAllEmailInvalid ? (
                <p id="export-all-email-help" className="text-xs text-danger mt-1.5 flex items-center gap-1" role="alert">
                  <i className="ri-error-warning-line align-middle" aria-hidden />
                  Enter a valid email, or leave it empty to download instead.
                </p>
              ) : (
                <p id="export-all-email-help" className="text-xs text-textmuted dark:text-white/60 mt-1.5">
                  {exportAllWillEmail
                    ? 'A multi-sheet .xlsx file will be emailed to this address.'
                    : 'Leave empty to download the multi-sheet .xlsx directly.'}
                </p>
              )}
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#export-all-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={exportAllSubmitting || exportAllEmailInvalid} onClick={handleExportAllSubmit}>
                {exportAllSubmitting
                  ? (exportAllWillEmail ? 'Sending…' : 'Preparing…')
                  : exportAllWillEmail
                    ? <><i className="ri-mail-send-line me-1 align-middle" aria-hidden />Email Excel</>
                    : <><i className="ri-download-line me-1 align-middle" aria-hidden />Download Excel</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assign recruiter modal */}
      <div id="assign-recruiter-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Assign recruiter – {assignRecruiterCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#assign-recruiter-modal" onClick={() => { setAssignRecruiterCandidate(null); setAssignRecruiterId('') }}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Recruiter</label>
              <select className="form-control" value={assignRecruiterId} onChange={(e) => setAssignRecruiterId(e.target.value)}>
                <option value="">Select recruiter</option>
                {recruitersList.map((u) => (<option key={u.id} value={u.id}>{u.name}{u.email ? ` (${u.email})` : ''}</option>))}
              </select>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#assign-recruiter-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={assignRecruiterSubmitting || !assignRecruiterId} onClick={handleAssignRecruiterSubmit}>
                {assignRecruiterSubmitting ? 'Saving...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Joining date modal */}
      <div id="joining-date-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Joining date – {joiningDateCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#joining-date-modal" onClick={() => { setJoiningDateCandidate(null); setJoiningDateValue('') }}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Joining date</label>
              <input type="date" className="form-control" value={joiningDateValue} onChange={(e) => setJoiningDateValue(e.target.value)} />
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#joining-date-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={joiningDateSubmitting || !joiningDateValue} onClick={handleJoiningDateSubmit}>
                {joiningDateSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resign date modal */}
      <div id="resign-date-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Resign date – {resignDateCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#resign-date-modal" onClick={() => { setResignDateCandidate(null); setResignDateValue('') }}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Resign date</label>
              <input type="date" className="form-control" value={resignDateValue} onChange={(e) => setResignDateValue(e.target.value)} />
              <button type="button" className="ti-btn ti-btn-light mt-2" onClick={() => setResignDateValue('')}>Clear date</button>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#resign-date-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={resignDateSubmitting} onClick={handleResignDateSubmit}>
                {resignDateSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Week-off modal */}
      <div id="week-off-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Week-off {weekOffCandidateIds.length > 1 ? `(${weekOffCandidateIds.length} candidates)` : ''}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#week-off-modal" onClick={() => { setWeekOffCandidateIds([]); setWeekOffDays([]) }}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Select week-off days</label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => (
                  <label key={day} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" className="form-check-input" checked={weekOffDays.includes(day)} onChange={() => toggleWeekOffDay(day)} />
                    <span className="text-sm">{day}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#week-off-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={weekOffSubmitting || weekOffDays.length === 0} onClick={handleWeekOffSubmit}>
                {weekOffSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assign shift modal */}
      <div id="assign-shift-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Assign shift {assignShiftCandidateIds.length > 1 ? `(${assignShiftCandidateIds.length} candidates)` : ''}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#assign-shift-modal" onClick={() => { setAssignShiftCandidateIds([]); setAssignShiftId('') }}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Shift</label>
              <select className="form-control" value={assignShiftId} onChange={(e) => setAssignShiftId(e.target.value)}>
                <option value="">Select shift</option>
                {shiftsList.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#assign-shift-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={assignShiftSubmitting || !assignShiftId} onClick={handleAssignShiftSubmit}>
                {assignShiftSubmitting ? 'Saving...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
