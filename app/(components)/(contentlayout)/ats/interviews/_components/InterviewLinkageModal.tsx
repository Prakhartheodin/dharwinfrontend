"use client"
import React, { useCallback, useEffect, useState } from 'react'
import {
  createApplicationForMeeting,
  getMeetingLinkage,
  patchMeetingLinkage,
  type MeetingLinkage,
} from '@/shared/lib/api/meetings'
import { listJobApplications, type JobApplication } from '@/shared/lib/api/jobApplications'
import { jobApplicationRecordId } from '@/shared/lib/ats/offer-application-eligibility'
import { useConfirm } from '@/shared/components/ui/useConfirm'
import {
  linkageActions,
  linkageBadge,
  parseInterviewLinkageError,
  preselectApplicationId,
  resolveLinkageConflict,
} from './interviewLinkage'

export interface InterviewLinkageTarget {
  /** Meeting id (ObjectId or meetingId) — both resolve on the linkage endpoints. */
  meetingId: string
  candidateId?: string
  candidateName?: string
  /** Row display title. */
  position?: string
  /** Raw Meeting.jobPosition: a 24-hex job id, or a title on legacy interviews. */
  jobPosition?: string
  linkageStatus?: string
  /** Why the dialog opened, so it can name the step to retry afterwards. */
  reason?: 'placement' | 'transfer' | 'result'
}

const REASON_COPY: Record<NonNullable<InterviewLinkageTarget['reason']>, string> = {
  placement:
    'Move to Offer needs this interview linked to a job application. After linking, use “Move to Offer” again.',
  transfer: 'Internal transfer needs this interview linked to a job application. After linking, run Internal transfer again.',
  result:
    "The result was saved, but the application's stage was not updated because this interview isn't linked. Link it to keep the pipeline in sync.",
}

const apiMessage = (err: any, fallback: string): string => err?.response?.data?.message || err?.message || fallback

export function InterviewLinkageBadge({ status, className = '' }: { status?: string | null; className?: string }) {
  const badge = linkageBadge(status)
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${badge.className} ${className}`.trim()}
      title={badge.title}
    >
      <i className={badge.kind === 'verified' ? 'ri-link-m' : 'ri-link-unlink-m'} aria-hidden />
      {badge.label}
    </span>
  )
}

/**
 * "Link application" (PATCH with expectedRevision) and "Create application for this interview"
 * (explicit, confirmed). Mount with a `key` per target so a slow response never lands in another interview.
 */
export default function InterviewLinkageModal({
  target,
  onClose,
  onLinked,
}: {
  target: InterviewLinkageTarget
  onClose: () => void
  /** Runs after a successful link or create, before the dialog closes (e.g. refresh the list). */
  onLinked: () => void | Promise<void>
}) {
  const { confirm, confirmDialog } = useConfirm()
  const [linkage, setLinkage] = useState<MeetingLinkage | null>(null)
  const [linkageLoading, setLinkageLoading] = useState(true)
  const [apps, setApps] = useState<JobApplication[]>([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState('')
  const [busy, setBusy] = useState<'link' | 'create' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { canLink } = linkageActions({ candidateId: target.candidateId })

  const fetchLinkage = useCallback(async (): Promise<MeetingLinkage | null> => {
    setLinkageLoading(true)
    try {
      const next = await getMeetingLinkage(target.meetingId)
      setLinkage(next)
      return next
    } catch (err) {
      setError(apiMessage(err, 'Could not load this interview’s link.'))
      return null
    } finally {
      setLinkageLoading(false)
    }
  }, [target.meetingId])

  // ponytail: first 100 applications of one candidate (GET /job-applications limit cap); page if a candidate ever exceeds it.
  const fetchApps = useCallback(async (): Promise<JobApplication[]> => {
    if (!target.candidateId) return []
    setAppsLoading(true)
    try {
      // No scheduleEligible filter: linking a past interview may target an Offered/Hired/Rejected application.
      const res = await listJobApplications({ candidateId: target.candidateId, limit: 100 })
      const list = res.results ?? []
      setApps(list)
      return list
    } catch (err) {
      setError(apiMessage(err, 'Could not load this candidate’s applications.'))
      return []
    } finally {
      setAppsLoading(false)
    }
  }, [target.candidateId])

  useEffect(() => {
    void (async () => {
      const [current, list] = await Promise.all([fetchLinkage(), canLink ? fetchApps() : Promise.resolve([])])
      setSelectedAppId(preselectApplicationId(list, { applicationId: current?.applicationId, jobPosition: target.jobPosition }))
    })()
  }, [fetchLinkage, fetchApps, canLink, target.jobPosition])

  /** 409 → show why and refetch what went stale; the recruiter retries after reviewing. Other errors → message. */
  const handleFailure = async (err: unknown, fallback: string) => {
    const info = parseInterviewLinkageError(err)
    if (!info) {
      setError(apiMessage(err, fallback))
      return
    }
    const resolution = resolveLinkageConflict(info)
    setNotice(resolution.notice)
    const [, reloaded] = await Promise.all([
      resolution.reloadLinkage ? fetchLinkage() : Promise.resolve(null),
      resolution.reloadApplications ? fetchApps() : Promise.resolve(null),
    ])
    const list = reloaded ?? apps
    const preselect = resolution.preselectApplicationId
    if (preselect && list.some((a) => jobApplicationRecordId(a) === preselect)) setSelectedAppId(preselect)
  }

  const handleLink = async () => {
    if (!linkage || !selectedAppId || busy) return
    setBusy('link')
    setError(null)
    setNotice(null)
    try {
      await patchMeetingLinkage(target.meetingId, {
        applicationId: selectedAppId,
        expectedRevision: linkage.linkageRevision ?? 0,
      })
      await onLinked()
      onClose()
    } catch (err) {
      await handleFailure(err, 'Could not link the application.')
    } finally {
      setBusy(null)
    }
  }

  const handleCreate = async () => {
    if (busy) return
    const ok = await confirm({
      title: 'Create application for this interview?',
      message: (
        <>
          This creates a new job application for <strong>{target.candidateName || 'this candidate'}</strong> on the job
          of <strong>{target.position || 'this interview'}</strong>, at the Interview stage, and links this interview to
          it. The action is recorded in the audit log.
        </>
      ),
      confirmLabel: 'Create application',
      cancelLabel: 'Cancel',
    })
    if (!ok) return
    setBusy('create')
    setError(null)
    setNotice(null)
    try {
      await createApplicationForMeeting(target.meetingId)
      await onLinked()
      onClose()
    } catch (err) {
      await handleFailure(err, 'Could not create the application.')
    } finally {
      setBusy(null)
    }
  }

  const status = linkage?.linkageStatus ?? target.linkageStatus
  const { canCreateApplication } = linkageActions({
    candidateId: target.candidateId,
    jobPosition: target.jobPosition,
    applicationId: linkage?.applicationId,
  })
  const loading = linkageLoading || appsLoading
  const alreadyLinkedToSelection =
    linkageBadge(status).kind === 'verified' && Boolean(selectedAppId) && linkage?.applicationId === selectedAppId

  return (
    <>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interview-linkage-title"
      >
        <div className="w-full max-w-lg rounded-xl border border-defaultborder bg-white shadow-xl dark:border-defaultborder/10 dark:bg-bodybg">
          <div className="flex items-center justify-between gap-3 border-b border-defaultborder px-5 py-4 dark:border-defaultborder/10">
            <h4 id="interview-linkage-title" className="flex items-center gap-2 text-base font-semibold text-defaulttextcolor dark:text-white">
              <i className="ri-link-m text-primary" aria-hidden />
              Link interview to application
            </h4>
            <button
              type="button"
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-black/40 dark:hover:text-white/80"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="ri-close-line text-xl" aria-hidden />
            </button>
          </div>

          <div className="space-y-4 px-5 py-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-defaulttextcolor dark:text-white">{target.position || 'Interview'}</p>
              <p className="text-xs text-textmuted dark:text-white/60">Candidate: {target.candidateName || '—'}</p>
              <InterviewLinkageBadge status={status} />
            </div>

            {target.reason && (
              <p className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-defaulttextcolor dark:text-white/80">
                {REASON_COPY[target.reason]}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
                {notice}
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-danger">
                {error}
              </p>
            )}

            {!canLink ? (
              <p className="text-textmuted dark:text-white/60">
                This interview has no candidate. Edit the interview and choose a candidate before linking an application.
              </p>
            ) : (
              <div>
                <label htmlFor="interview-linkage-application" className="form-label mb-1.5 block text-sm font-medium text-defaulttextcolor dark:text-white">
                  Application
                </label>
                <select
                  id="interview-linkage-application"
                  className="form-select w-full rounded-lg border-defaultborder !py-2 !text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-defaultborder/10"
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  disabled={loading || Boolean(busy)}
                >
                  <option value="">{loading ? 'Loading…' : apps.length ? 'Select an application' : 'No applications for this candidate'}</option>
                  {apps.map((a) => {
                    const id = jobApplicationRecordId(a)
                    return (
                      <option key={id} value={id}>
                        {(a.job?.title || 'Position') + ' · ' + a.status}
                      </option>
                    )
                  })}
                </select>
                <p className="mt-1.5 text-xs text-textmuted dark:text-white/50">
                  Only this candidate&apos;s applications are listed. Linking is recorded in the audit log.
                </p>
              </div>
            )}

            {canLink && linkage && canCreateApplication && (
              <div className="border-t border-defaultborder pt-4 dark:border-defaultborder/10">
                <p className="mb-2 text-xs text-textmuted dark:text-white/60">
                  No application for this interview&apos;s job? Create one explicitly.
                </p>
                <button
                  type="button"
                  className="ti-btn ti-btn-outline-primary !py-1.5 !px-3 !text-sm"
                  onClick={() => void handleCreate()}
                  disabled={loading || Boolean(busy)}
                >
                  {busy === 'create' ? 'Creating…' : 'Create application for this interview'}
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-defaultborder px-5 py-3 dark:border-defaultborder/10">
            <button type="button" className="ti-btn ti-btn-light !py-2 !px-4 !text-sm" onClick={onClose}>
              Cancel
            </button>
            {canLink && (
              <button
                type="button"
                className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm"
                onClick={() => void handleLink()}
                disabled={!linkage || !selectedAppId || loading || Boolean(busy) || alreadyLinkedToSelection}
              >
                {busy === 'link' ? 'Linking…' : 'Link application'}
              </button>
            )}
          </div>
        </div>
      </div>
      {confirmDialog}
    </>
  )
}
