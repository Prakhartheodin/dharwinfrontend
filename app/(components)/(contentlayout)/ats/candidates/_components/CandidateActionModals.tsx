"use client"
import React from 'react'
import { mapCandidateToDisplay, type CandidateDocument } from '@/shared/lib/api/candidates'

type CandidateDisplay = ReturnType<typeof mapCandidateToDisplay>

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
    exportAllEmail, setExportAllEmail, exportAllSubmitting, handleExportAllSubmit,
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
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title">Add Feedback – {feedbackCandidate?.name}</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#feedback-modal" onClick={() => setFeedbackCandidate(null)}><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body space-y-4">
              <div>
                <label className="form-label">Feedback</label>
                <textarea className="form-control" rows={4} value={feedbackForm.feedback} onChange={(e) => setFeedbackForm(f => ({ ...f, feedback: e.target.value }))} placeholder="Enter feedback..." />
              </div>
              <div>
                <label className="form-label">Rating (1-5)</label>
                <select className="form-control" value={feedbackForm.rating} onChange={(e) => setFeedbackForm(f => ({ ...f, rating: parseInt(e.target.value, 10) }))}>
                  {[1, 2, 3, 4, 5].map(n => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#feedback-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={feedbackSubmitting || !feedbackForm.feedback.trim()} onClick={handleFeedbackSubmit}>
                {feedbackSubmitting ? 'Saving...' : 'Save Feedback'}
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
              <h6 className="ti-modal-title">Export all candidates</h6>
              <button type="button" className="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#export-all-modal"><span className="sr-only">Close</span>×</button>
            </div>
            <div className="ti-modal-body">
              <label className="form-label">Send CSV by email (optional)</label>
              <input type="email" className="form-control" placeholder="email@example.com" value={exportAllEmail} onChange={(e) => setExportAllEmail(e.target.value)} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave empty to download only.</p>
            </div>
            <div className="ti-modal-footer">
              <button type="button" className="ti-btn ti-btn-light" data-hs-overlay="#export-all-modal">Cancel</button>
              <button type="button" className="ti-btn ti-btn-primary" disabled={exportAllSubmitting} onClick={handleExportAllSubmit}>
                {exportAllSubmitting ? 'Exporting...' : 'Export'}
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
