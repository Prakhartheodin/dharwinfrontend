"use client"
import React, { useMemo } from 'react'
import { useAuth } from '@/shared/contexts/auth-context'
import { appendJoinIdentityToUrl } from '@/shared/lib/join-room-url'
import type { Meeting } from '@/shared/lib/api/meetings'
import type { Job } from '@/shared/lib/api/jobs'
import type { CandidateListItem } from '@/shared/lib/api/candidates'
import type { User } from '@/shared/lib/types'

export interface CreateInterviewModalProps {
  createdMeeting: Meeting | null
  resetCreateMeetingForm: () => void
  formError: string | null
  formLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  dropdownsLoading: boolean
  jobs: Job[]
  candidates: CandidateListItem[]
  recruiters: User[]
  hosts: { nameOrRole: string; email: string }[]
  setHosts: React.Dispatch<React.SetStateAction<{ nameOrRole: string; email: string }[]>>
  emailInvites: string[]
  setEmailInvites: React.Dispatch<React.SetStateAction<string[]>>
}

export default function CreateInterviewModal({
  createdMeeting,
  resetCreateMeetingForm,
  formError,
  formLoading,
  onSubmit,
  dropdownsLoading,
  jobs,
  candidates,
  recruiters,
  hosts,
  setHosts,
  emailInvites,
  setEmailInvites,
}: CreateInterviewModalProps) {
  const { user } = useAuth()
  const personalMeetingUrl = useMemo(() => {
    const base = createdMeeting?.publicMeetingUrl || ''
    if (!base) return ''
    const joinName = (user?.name?.trim() || user?.email?.split('@')[0] || '').trim()
    const joinEmail = user?.email?.trim() || ''
    return appendJoinIdentityToUrl(base, joinName, joinEmail)
  }, [createdMeeting?.publicMeetingUrl, user?.name, user?.email])

  return (
    <div id="create-interview-modal" className="hs-overlay hidden ti-modal size-lg !z-[105]" tabIndex={-1} aria-labelledby="create-interview-modal-label" aria-hidden="true">
      <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out transition-all sm:max-w-2xl">
        <div className="ti-modal-content border border-defaultborder dark:border-defaultborder/10 rounded-xl shadow-xl overflow-hidden">
          <div className="ti-modal-header bg-gray-50 dark:bg-black/20 border-b border-defaultborder dark:border-defaultborder/10 px-6 py-4">
            <h3 id="create-interview-modal-label" className="ti-modal-title text-lg font-semibold text-defaulttextcolor dark:text-white flex items-center gap-2">
              <i className="ri-calendar-schedule-line text-primary text-xl"></i>
              {createdMeeting ? 'Meeting Created' : 'Schedule Interview'}
            </h3>
            <button
              type="button"
              className="ti-modal-close-btn hs-dropdown-toggle flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 dark:text-[#8c9097] dark:hover:text-white/80 rounded-md hover:bg-gray-100 dark:hover:bg-black/40 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
              data-hs-overlay="#create-interview-modal"
              onClick={resetCreateMeetingForm}
              aria-label="Close"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          {createdMeeting ? (
            <div className="ti-modal-body px-6 py-5">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 text-success mb-4">
                  <i className="ri-check-double-line text-2xl"></i>
                </div>
                <h4 className="text-lg font-semibold text-defaulttextcolor dark:text-white mb-1">Meeting Created Successfully!</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{createdMeeting.title}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="form-label block text-xs font-medium text-defaulttextcolor dark:text-white mb-1">Meeting URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={personalMeetingUrl || createdMeeting.publicMeetingUrl || ''}
                      className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg bg-gray-50 dark:bg-black/20"
                    />
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary !py-2 !px-3 !text-sm"
                      onClick={() => {
                        const url = personalMeetingUrl || createdMeeting.publicMeetingUrl
                        if (url) {
                          navigator.clipboard.writeText(url)
                        }
                      }}
                    >
                      <i className="ri-file-copy-line"></i> Copy
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Meeting ID</span>
                    <p className="font-medium text-defaulttextcolor dark:text-white">{createdMeeting.meetingId}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    <p className="font-medium text-defaulttextcolor dark:text-white capitalize">{createdMeeting.status}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end mt-6 pt-4 border-t border-defaultborder dark:border-defaultborder/10">
                <button
                  type="button"
                  className="ti-btn ti-btn-light !py-2 !px-4 !text-sm font-medium"
                  onClick={() => { resetCreateMeetingForm(); (window as any).HSOverlay?.close(document.querySelector('#create-interview-modal')); }}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-outline-primary !py-2 !px-4 !text-sm font-medium"
                  onClick={resetCreateMeetingForm}
                >
                  <i className="ri-add-line me-1.5"></i>Create Another Meeting
                </button>
                <a
                  href={personalMeetingUrl || createdMeeting.publicMeetingUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm font-medium"
                >
                  <i className="ri-vidicon-line me-1.5"></i>Join Meeting
                </a>
              </div>
            </div>
          ) : (
            <form className="ti-modal-body !p-0" onSubmit={onSubmit} noValidate>
              <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {formError && (
                  <div
                    id="schedule-interview-form-error"
                    role="alert"
                    className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm"
                  >
                    {formError}
                  </div>
                )}
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</p>
                <div>
                  <label htmlFor="schedule-meeting-title" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                    Meeting Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="schedule-meeting-title"
                    placeholder="e.g. Technical Interview - John Doe"
                    className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="schedule-description" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                    Description
                  </label>
                  <textarea
                    id="schedule-description"
                    rows={2}
                    placeholder="Optional meeting description..."
                    className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
                <div>
                  <label htmlFor="schedule-job" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                    Job / Position
                  </label>
                  <select
                    id="schedule-job"
                    className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={dropdownsLoading}
                  >
                    <option value="">{dropdownsLoading ? 'Loading...' : 'Select job position'}</option>
                    {jobs.map((job) => (
                      <option key={job.id ?? job._id} value={job.id ?? job._id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pt-1">When</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="schedule-date" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                      Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      id="schedule-date"
                      className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="schedule-time" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                      Time <span className="text-danger">*</span>
                    </label>
                    <input
                      type="time"
                      id="schedule-time"
                      className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="schedule-duration" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                      Duration (minutes) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      id="schedule-duration"
                      name="schedule-duration"
                      min={1}
                      max={480}
                      defaultValue={60}
                      required
                      className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="schedule-max-participants" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      id="schedule-max-participants"
                      min={1}
                      max={100}
                      defaultValue={10}
                      className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="schedule-allow-guest" defaultChecked className="form-check-input !w-4 !h-4 text-primary" />
                    <span className="text-sm text-defaulttextcolor dark:text-white">Allow guest join</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="schedule-require-approval" className="form-check-input !w-4 !h-4 text-primary" />
                    <span className="text-sm text-defaulttextcolor dark:text-white">Require approval</span>
                  </label>
                </div>
                <div>
                  <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                    Hosts (name/role + email) <span className="text-danger">*</span>
                    <span className="text-xs font-normal text-defaulttextcolor/70 dark:text-white/70 ml-1">— at least one host with email required</span>
                  </label>
                  <div className="space-y-2">
                    {hosts.map((h, i) => (
                      <div key={i} className="flex gap-2 flex-wrap">
                        <input
                          type="text"
                          placeholder="Name or role"
                          value={h.nameOrRole}
                          onChange={(e) => {
                            const next = [...hosts]
                            next[i] = { ...next[i], nameOrRole: e.target.value }
                            setHosts(next)
                          }}
                          className="form-control !py-2 !text-sm flex-1 min-w-[120px] border-defaultborder dark:border-defaultborder/10 rounded-lg"
                        />
                        <input
                          type="email"
                          placeholder="email@example.com"
                          value={h.email}
                          onChange={(e) => {
                            const next = [...hosts]
                            next[i] = { ...next[i], email: e.target.value }
                            setHosts(next)
                          }}
                          className="form-control !py-2 !text-sm flex-1 min-w-[160px] border-defaultborder dark:border-defaultborder/10 rounded-lg"
                        />
                        <button
                          type="button"
                          className="ti-btn ti-btn-light !py-2 !px-2"
                          onClick={() => setHosts((prev) => prev.filter((_, j) => j !== i))}
                          aria-label="Remove host"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="ti-btn ti-btn-outline-light !py-1.5 !px-3 !text-sm"
                      onClick={() => setHosts((prev) => [...prev, { nameOrRole: '', email: '' }])}
                    >
                      <i className="ri-add-line me-1"></i>Add host
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                    Email invites
                  </label>
                  <div className="space-y-2">
                    {emailInvites.map((email, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="email"
                          placeholder="email@example.com"
                          value={email}
                          onChange={(e) => {
                            const next = [...emailInvites]
                            next[i] = e.target.value
                            setEmailInvites(next)
                          }}
                          className="form-control !py-2 !text-sm flex-1 border-defaultborder dark:border-defaultborder/10 rounded-lg"
                        />
                        <button
                          type="button"
                          className="ti-btn ti-btn-light !py-2 !px-2"
                          onClick={() => setEmailInvites((prev) => prev.filter((_, j) => j !== i))}
                          aria-label="Remove"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="ti-btn ti-btn-outline-light !py-1.5 !px-3 !text-sm"
                      onClick={() => setEmailInvites((prev) => [...prev, ''])}
                    >
                      <i className="ri-add-line me-1"></i>Add email
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                    Interview Type <span className="text-danger">*</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {(['Video', 'In-Person', 'Phone'] as const).map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border-2 border-defaultborder dark:border-defaultborder/10 hover:border-primary/50 dark:hover:border-primary/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:bg-primary/10"
                      >
                        <input
                          type="radio"
                          name="schedule-type"
                          value={type === 'In-Person' ? 'in-person' : type.toLowerCase()}
                          defaultChecked={type === 'Video'}
                          className="form-check-input !w-4 !h-4 text-primary"
                        />
                        <i className={`ri-${type === 'Video' ? 'vidicon-line' : type === 'In-Person' ? 'user-line' : 'phone-line'} text-base text-gray-600 dark:text-gray-400`}></i>
                        <span className="text-sm font-medium text-defaulttextcolor dark:text-white">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="schedule-candidate" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                    Candidate
                  </label>
                  <select
                    id="schedule-candidate"
                    className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={dropdownsLoading}
                  >
                    <option value="">{dropdownsLoading ? 'Loading...' : 'Select candidate'}</option>
                    {candidates.map((c) => (
                      <option key={c.id ?? c._id} value={c.id ?? c._id}>
                        {c.fullName} - {c.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="schedule-recruiter" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                    Recruiter
                  </label>
                  <select
                    id="schedule-recruiter"
                    className="form-select !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={dropdownsLoading}
                  >
                    <option value="">{dropdownsLoading ? 'Loading...' : 'Select recruiter'}</option>
                    {recruiters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name ?? r.email} - {r.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="schedule-notes" className="form-label block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                    Notes
                  </label>
                  <textarea
                    id="schedule-notes"
                    rows={3}
                    placeholder="Add any additional notes or instructions for the interview..."
                    className="form-control !py-2 !text-sm w-full border-defaultborder dark:border-defaultborder/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
              </div>
              <div className="ti-modal-footer flex flex-col gap-3 px-6 py-4 bg-gray-50 dark:bg-black/20 border-t border-defaultborder dark:border-defaultborder/10">
                {formError && (
                  <div
                    id="schedule-interview-footer-error"
                    role="alert"
                    className="w-full p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm"
                  >
                    {formError}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 justify-end w-full">
                <button
                  type="button"
                  className="ti-btn ti-btn-light !py-2 !px-4 !text-sm font-medium"
                  data-hs-overlay="#create-interview-modal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm font-medium"
                >
                  {formLoading ? (
                    <>
                      <span className="animate-spin inline-block me-1.5 w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line me-1.5 align-middle"></i>
                      Schedule Interview
                    </>
                  )}
                </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
