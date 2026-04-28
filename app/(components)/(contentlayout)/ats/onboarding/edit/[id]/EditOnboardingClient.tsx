"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import pipelineStyles from '../../../ats-pipeline-list.module.css'
import { useRouter, useParams } from 'next/navigation'
import { getPlacementById, updatePlacement } from '@/shared/lib/api/placements'
import {
  getCandidate,
  updateCandidate,
  getCandidateFilterAgents,
  assignAgentToStudent,
} from '@/shared/lib/api/employees'
import { createPosition, getAllPositions } from '@/shared/lib/api/positions'
import type { Placement } from '@/shared/lib/api/placements'
import { listJobApplications, type JobApplication } from '@/shared/lib/api/jobApplications'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'
import Swal from 'sweetalert2'

async function showHrmsValidationToast(message: string): Promise<void> {
  await Swal.fire({
    icon: 'error',
    title: 'Required fields',
    text: message,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 7000,
    timerProgressBar: true,
  })
}

const isValidMongoId = (id: unknown): id is string =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)

/** Placeholder roster row named for the settings screen — not a real job role. */
const ATS_APPLIED_POSITION_SELECT_VALUE = '__ats_applied_role__'

function isExcludedPlaceholderPosition(name: string | undefined | null): boolean {
  const n = (name ?? '').trim().toLowerCase()
  return n === 'training position'
}

/** Job title from offer / placement (same record as pre-boarding in ATS). */
function placementJobTitle(placement: Placement): string {
  const j = placement.job
  if (!j) return ''
  if (typeof j === 'object' && j !== null && 'title' in j) {
    const title = (j as { title?: string }).title
    return typeof title === 'string' ? title.trim() : ''
  }
  return ''
}

/** Map applied job title to a Training → Positions id when names align. */
function resolvePositionIdFromAppliedJobTitle(
  roster: { id: string; name: string }[],
  title: string | undefined | null
): string {
  const t = typeof title === 'string' ? title.trim().toLowerCase() : ''
  if (!t || !roster.length) return ''
  const norm = (s: string) => s.trim().toLowerCase()
  const exact = roster.find((p) => p.id && norm(p.name) === t)
  if (exact?.id) return exact.id
  const loose = roster.find((p) => {
    const pn = norm(p.name || '')
    return pn.length > 0 && (pn.includes(t) || t.includes(pn))
  })
  return loose?.id ?? ''
}

/** Latest job-application job title(s) sorted `createdAt:desc` on the API. */
function firstApplicationJobTitle(apps: JobApplication[]): string {
  for (const a of apps) {
    const j = a.job
    if (!j || typeof j !== 'object') continue
    const title = (j as { title?: string }).title
    if (typeof title === 'string' && title.trim()) return title.trim()
  }
  return ''
}

function initialsFromDisplayName(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]!.charAt(0)
    const b = parts[parts.length - 1]!.charAt(0)
    return (a + b).toUpperCase()
  }
  return t.slice(0, 2).toUpperCase()
}

function formatSidebarJoining(iso: string): string {
  if (!iso?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—'
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
  } catch {
    return iso
  }
}

/** e.g. "Prakhar Sharma" → "Prakhar S." */
function shortPersonName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) {
    const last = p[p.length - 1] ?? ''
    return `${p[0]} ${last.charAt(0).toUpperCase()}.`
  }
  return name.trim() || '—'
}

interface EditOnboardingClientProps {
  /** When using static route /ats/onboarding/edit?id=xxx (deployed), id comes from query. */
  placementIdFromQuery?: string
}

export default function EditOnboardingClient({ placementIdFromQuery }: EditOnboardingClientProps = {}) {
  const router = useRouter()
  const params = useParams()
  const rawId = placementIdFromQuery ?? params?.id
  const placementId = isValidMongoId(rawId) ? rawId : null
  const { canEdit } = useFeaturePermissions('ats.onboarding')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    department: '',
    positionId: '',
    agentId: '',
    joiningDate: '',
  })
  const [agents, setAgents] = useState<{ id: string; name: string; email?: string }[]>([])
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([])
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [candidateName, setCandidateName] = useState('')
  /** Offer/placement → job applications → referral; surfaced as dropdown option when needed. */
  const [atsAppliedJobTitle, setAtsAppliedJobTitle] = useState('')

  useEffect(() => {
    if (!placementId || placementId === '_') {
      setError(rawId && rawId !== '_' ? 'Invalid placement ID' : null)
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      setError(null)
      setAtsAppliedJobTitle('')
      try {
        const [placement, positionsList] = await Promise.all([
          getPlacementById(placementId),
          getAllPositions().catch(() => [] as { id?: string; _id?: string; name: string }[]),
        ])
        const rosterAll = positionsList
          .map((p) => ({ id: String(p.id ?? p._id ?? ''), name: p.name }))
          .filter((p) => p.id)
        /** Drop placeholder “training position”; keep full list briefly to detect bad candidate assignment. */
        const rosterVisible = rosterAll.filter((p) => !isExcludedPlaceholderPosition(p.name))
        setPositions(rosterVisible)

        const cand = placement.candidate
        const cidRaw = typeof cand === 'string' ? cand : cand && typeof cand === 'object' ? ((cand as { id?: string; _id?: string }).id ?? (cand as { _id?: string })._id) : null
        const cid = typeof cidRaw === 'string' ? cidRaw : cidRaw != null ? String(cidRaw) : null
        if (!cid) {
          setError('Placement has no candidate')
          setLoading(false)
          return
        }
        setCandidateId(cid)
        setCandidateName((placement.candidate as { fullName?: string })?.fullName || 'Employee')
        const [c, applicationsRes] = await Promise.all([
          getCandidate(String(cid)),
          listJobApplications({ candidateId: String(cid), limit: 20 }).catch(() => ({
            results: [] as JobApplication[],
          })),
        ])
        const appTitle = firstApplicationJobTitle(applicationsRes.results ?? [])
        const appliedJobTitle =
          placementJobTitle(placement) ||
          appTitle ||
          (typeof c.referralJobTitle === 'string' ? c.referralJobTitle.trim() : '')
        setAtsAppliedJobTitle(appliedJobTitle)
        const positionFromAppliedRole = resolvePositionIdFromAppliedJobTitle(rosterVisible, appliedJobTitle)

        const ag = c.assignedAgent
        const assignedId =
          typeof ag === 'object' && ag != null && ('_id' in ag || 'id' in ag)
            ? String((ag as { _id?: string; id?: string })._id ?? (ag as { id?: string }).id ?? '')
            : typeof ag === 'string'
              ? ag
              : ''
        const rm = c.reportingManager
        const rmId =
          typeof rm === 'object' && rm && '_id' in rm
            ? String((rm as { _id: string })._id)
            : typeof rm === 'string'
              ? rm
              : ''
        const pos = c.position
        let posId = typeof pos === 'object' && pos && (pos as { id?: string; _id?: string }).id != null
          ? ((pos as { id?: string; _id?: string }).id ?? (pos as { _id?: string })._id ?? '')
          : typeof pos === 'string' ? pos : ''
        const pointingAtExcludedPlaceholder = rosterAll.some(
          (p) => p.id === posId && isExcludedPlaceholderPosition(p.name)
        )
        if (pointingAtExcludedPlaceholder) posId = ''
        /** When we know what they applied for, that drives position — not other roster rows on the candidate. */
        let nextPositionId = ''
        if (appliedJobTitle.trim()) {
          nextPositionId = positionFromAppliedRole || ATS_APPLIED_POSITION_SELECT_VALUE
        } else {
          nextPositionId = posId || ''
        }
        const joiningSlice = placement.joiningDate
          ? String(placement.joiningDate).slice(0, 10)
          : ''
        setForm({
          department: c.department ?? '',
          positionId: nextPositionId,
          agentId: assignedId || rmId || '',
          joiningDate: joiningSlice,
        })
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load placement')
      } finally {
        setLoading(false)
      }
    }
    load()
    getCandidateFilterAgents()
      .then((r) => {
        setAgents((r.agents ?? []).map((a) => ({ id: a.id, name: a.name, email: a.email })))
      })
      .catch(() => {
        setAgents([])
      })
  }, [placementId, rawId])

  /** Include current value if it is not in the roster (legacy or API drift). */
  const agentOptionsForSelect = useMemo(() => {
    if (form.agentId && !agents.some((a) => a.id === form.agentId)) {
      return [{ id: form.agentId, name: 'Saved assignment', email: '' }, ...agents]
    }
    return agents
  }, [agents, form.agentId])

  /** Only the role this candidate applied for (mapped roster row or synthetic until save creates a row). */
  const positionOptionsForSelect = useMemo(() => {
    const applied = atsAppliedJobTitle.trim()
    const out: { id: string; name: string }[] = []

    if (applied) {
      const mappedFromAts = resolvePositionIdFromAppliedJobTitle(positions, applied)
      if (mappedFromAts) {
        const row = positions.find((p) => p.id === mappedFromAts)
        if (row) out.push({ id: row.id, name: row.name })
        else out.push({ id: ATS_APPLIED_POSITION_SELECT_VALUE, name: applied })
      } else {
        out.push({ id: ATS_APPLIED_POSITION_SELECT_VALUE, name: applied })
      }
    } else if (form.positionId && isValidMongoId(form.positionId)) {
      const row = positions.find((p) => p.id === form.positionId)
      out.push({ id: form.positionId, name: row?.name ?? 'Saved position' })
    }

    return out
  }, [positions, form.positionId, atsAppliedJobTitle])

  const sidebarRoleLabel = useMemo(() => {
    const opt = positionOptionsForSelect.find((o) => o.id === form.positionId)
    if (opt?.name) return opt.name
    return atsAppliedJobTitle.trim() || '—'
  }, [positionOptionsForSelect, form.positionId, atsAppliedJobTitle])

  const sidebarJoiningLabel = useMemo(() => formatSidebarJoining(form.joiningDate), [form.joiningDate])

  const sidebarAgentLabel = useMemo(() => {
    if (!form.agentId) return 'Not assigned'
    const a = agentOptionsForSelect.find((x) => x.id === form.agentId)
    if (!a?.name?.trim()) return '—'
    return shortPersonName(a.name)
  }, [agentOptionsForSelect, form.agentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!candidateId) return
    setError(null)

    const departmentTrimmed = form.department.trim()
    if (!departmentTrimmed) {
      await showHrmsValidationToast('Department cannot be empty.')
      return
    }
    if (!form.joiningDate || !/^\d{4}-\d{2}-\d{2}$/.test(form.joiningDate)) {
      await showHrmsValidationToast('Joining date is required — pick a valid date.')
      return
    }
    if (!form.positionId) {
      await showHrmsValidationToast('Position / job title is required.')
      return
    }
    if (form.positionId === ATS_APPLIED_POSITION_SELECT_VALUE && !atsAppliedJobTitle.trim()) {
      await showHrmsValidationToast('Applied job title is missing. Reload the page and try again.')
      return
    }

    setSubmitting(true)
    try {
      let positionToSave = form.positionId || ''
      let designationFromPosition: string | undefined
      if (positionToSave === ATS_APPLIED_POSITION_SELECT_VALUE) {
        const title = atsAppliedJobTitle.trim()
        if (!title) {
          setError('Applied job title missing; reload the page.')
          setSubmitting(false)
          return
        }
        const created = await createPosition({ name: title })
        positionToSave = String(created.id ?? created._id ?? '')
        if (!isValidMongoId(positionToSave)) {
          throw new Error('Could not create HRMS position')
        }
        designationFromPosition = title
      } else if (positionToSave) {
        const opt = positionOptionsForSelect.find((o) => o.id === positionToSave)
        let nm = opt?.name?.trim()
        if (nm === 'Saved position') {
          nm = positions.find((p) => p.id === positionToSave)?.name?.trim()
        }
        designationFromPosition = nm || undefined
      }

      await updateCandidate(candidateId, {
        department: departmentTrimmed || undefined,
        designation: designationFromPosition,
        position: positionToSave || undefined,
      })
      const agentIdOrNull = form.agentId && /^[0-9a-fA-F]{24}$/.test(form.agentId) ? form.agentId : null
      try {
        await assignAgentToStudent(candidateId, agentIdOrNull)
      } catch (agentErr: any) {
        if (agentErr?.response?.status === 403) {
          await updateCandidate(candidateId, {
            reportingManager: form.agentId || undefined,
          })
        } else {
          throw agentErr
        }
      }
      /* Placement joining date last so finalize emails use the Employee row after department/position/agent updates. */
      if (placementId && form.joiningDate && /^\d{4}-\d{2}-\d{2}$/.test(form.joiningDate)) {
        await updatePlacement(placementId, { joiningDate: form.joiningDate })
      }
      router.push('/ats/onboarding')
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save')
      setSubmitting(false)
    }
  }

  if (!canEdit) {
    return (
      <Fragment>
        <Seo title="Edit HRMS" />
        <Pageheader currentpage="Edit HRMS" activepage="Onboarding" mainpage="Edit HRMS" />
        <div className={`mt-5 grid grid-cols-12 gap-6 min-w-0 sm:mt-6 ${pipelineStyles.listShell}`}>
          <div className="col-span-12 p-6 rounded-[10px] border border-danger/25 bg-danger/5 text-danger">
            You do not have permission to edit onboarding.
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title="Edit HRMS" />
      <Pageheader currentpage="Edit HRMS" activepage="Onboarding" mainpage={`Edit HRMS – ${candidateName || '…'}`} />
      <div className={`mt-5 grid grid-cols-12 gap-6 min-w-0 sm:mt-6 ${pipelineStyles.listShell}`}>
        <div className="col-span-12 min-w-0 flex flex-col">
          <div className="box min-w-0 flex flex-col">
            <div className="box-header flex flex-wrap items-center justify-between gap-2 overflow-visible">
              <div className="box-title min-w-0 flex-1">
                <span className="inline-flex items-start gap-2 sm:items-center">
                  <span
                    className="mt-0.5 inline-block h-8 w-0.5 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                  <span>
                    <span className="block sm:inline">Edit Onboarding (HRMS)</span>
                    {candidateName ? (
                      <span className="mt-0.5 block text-[0.85rem] font-normal text-slate-500 sm:ms-1 sm:mt-0 sm:inline dark:text-slate-400">
                        — {candidateName}
                      </span>
                    ) : null}
                  </span>
                </span>
                {placementId && (
                  <span
                    className="badge bg-light text-default ms-1 align-middle text-[0.7rem] tabular-nums sm:ms-2 sm:text-[0.75rem]"
                    title="Placement id"
                  >
                    {placementId.slice(0, 8)}…
                  </span>
                )}
              </div>
              <div
                className="flex flex-wrap items-center gap-2 shrink-0"
                role="toolbar"
                aria-label="Onboarding edit navigation"
              >
                <Link
                  href="/ats/offers-placement"
                  className="ti-btn ti-btn-light !mb-0 !w-auto !min-w-fit !py-1 !px-2 !text-[0.75rem]"
                >
                  <i className="ri-file-paper-2-line me-1 align-middle" aria-hidden />
                  Offers &amp; placement
                </Link>
                <Link
                  href="/ats/pre-boarding"
                  className="ti-btn ti-btn-light !mb-0 !w-auto !min-w-fit !py-1 !px-2 !text-[0.75rem]"
                >
                  <i className="ri-suitcase-line me-1 align-middle" aria-hidden />
                  Pre-boarding
                </Link>
                <Link
                  href="/ats/onboarding"
                  className="ti-btn ti-btn-primary-full !mb-0 !w-auto !min-w-fit !py-1 !px-2 !text-[0.75rem]"
                >
                  <i className="ri-arrow-left-line me-1 align-middle" aria-hidden />
                  Back to Onboarding
                </Link>
              </div>
            </div>
            <div className="box-body !p-0 flex min-h-0 flex-1 flex-col overflow-hidden">
              {loading ? (
                <div
                  className="flex flex-col items-center justify-center gap-4 px-6 py-12"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div className="flex w-full max-w-md flex-col gap-2">
                    <div className={`h-3 w-full ${pipelineStyles.skeleton}`} />
                    <div className={`h-3 w-[92%] ${pipelineStyles.skeleton}`} style={{ animationDelay: '0.08s' }} />
                    <div className={`h-3 w-[88%] ${pipelineStyles.skeleton}`} style={{ animationDelay: '0.16s' }} />
                    <div className={`h-3 w-[95%] ${pipelineStyles.skeleton}`} style={{ animationDelay: '0.24s' }} />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <i
                      className="ri-loader-4-line inline-block h-5 w-5 shrink-0 animate-spin text-primary"
                      aria-hidden
                    />
                    <span>Loading HRMS details&hellip;</span>
                  </div>
                </div>
              ) : error && !candidateId ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <i className="ri-error-warning-line mb-3 block text-4xl text-danger/80" aria-hidden />
                  <p className="mb-4 text-danger">{error}</p>
                  <Link href="/ats/onboarding" className="ti-btn ti-btn-primary">
                    Back to Onboarding
                  </Link>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
                    <div className="flex w-full min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:gap-6 xl:gap-8">
                      <aside
                        className="w-full shrink-0 rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/95 dark:shadow-black/30 lg:w-[15.5rem] xl:w-[17rem]"
                        aria-label="Onboarding candidate summary"
                      >
                        <div className="border-b border-slate-200/90 bg-slate-50/90 px-4 py-3.5 dark:border-white/10 dark:bg-slate-800/60">
                          <div className="flex flex-col items-center text-center">
                            <div
                              className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-[0.95rem] font-semibold uppercase tracking-wide text-primary dark:bg-primary/25 dark:text-primary/90"
                              aria-hidden
                            >
                              {initialsFromDisplayName(candidateName)}
                            </div>
                            <p className="mb-0 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                              {candidateName || 'Candidate'}
                            </p>
                            <p className="mb-3 mt-1 text-[0.7rem] leading-relaxed text-slate-600 dark:text-slate-400">
                              Candidate → Employee
                            </p>
                            <span className="inline-flex rounded-md border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100">
                              Onboarding
                            </span>
                          </div>
                        </div>
                        <div className="px-4 py-4">
                          <p className="mb-3 border-b border-slate-200/80 pb-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-white/10 dark:text-slate-400">
                            Summary
                          </p>
                          <dl className="space-y-3 text-[0.8125rem]">
                            <div>
                              <dt className="mb-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Role
                              </dt>
                              <dd className="leading-snug text-slate-900 dark:text-slate-100">{sidebarRoleLabel}</dd>
                            </div>
                            <div>
                              <dt className="mb-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Joining
                              </dt>
                              <dd className="tabular-nums leading-snug text-slate-900 dark:text-slate-100">{sidebarJoiningLabel}</dd>
                            </div>
                            <div>
                              <dt className="mb-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Agent
                              </dt>
                              <dd className="leading-snug text-slate-900 dark:text-slate-100">{sidebarAgentLabel}</dd>
                            </div>
                          </dl>
                        </div>
                      </aside>
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                        <div
                          className={`flex min-h-0 flex-1 flex-col overflow-hidden ${pipelineStyles.tableCard}`}
                        >
                        <div className="border-b border-slate-200/90 bg-gradient-to-r from-slate-50/95 to-slate-50/60 px-4 py-3.5 sm:px-6 dark:border-white/10 dark:from-slate-900/60 dark:to-slate-900/40">
                          <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <div className="min-w-0">
                              <h2 className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                                Employee &amp; role
                              </h2>
                              <p className="mb-0 mt-0.5 max-w-prose text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                Updates the candidate / employee record used across the HRMS.
                              </p>
                            </div>
                            <span
                              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-slate-200/90 bg-white/80 px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                              title="Source"
                            >
                              <i className="ri-user-settings-line text-[0.85rem] text-primary/80" aria-hidden />
                              HRMS
                            </span>
                          </div>
                        </div>
                        <form
                          onSubmit={handleSubmit}
                          className="flex min-h-0 flex-1 flex-col p-4 sm:p-6 lg:p-7"
                        >
                          <div className="flex min-h-0 w-full flex-1 flex-col">
                            {error && (
                              <div
                                className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
                                role="alert"
                              >
                                {error}
                              </div>
                            )}

                            <div className="min-h-0 flex-1 space-y-8">
                              <section aria-labelledby="hrms-section-org">
                                <div className="mb-4 flex items-baseline gap-2">
                                  <h3
                                    id="hrms-section-org"
                                    className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"
                                  >
                                    Organization
                                  </h3>
                                  <span
                                    className="hidden h-px min-w-[2rem] flex-1 bg-slate-200 dark:bg-white/10 sm:block"
                                    aria-hidden
                                  />
                                </div>
                                <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                                  <div className="flex min-h-0 min-w-0 flex-col gap-0">
                                    <label className="form-label mb-2" htmlFor="hrms-department">
                                      Department{' '}
                                      <span className="text-danger" aria-hidden="true">
                                        *
                                      </span>
                                    </label>
                                    <input
                                      id="hrms-department"
                                      type="text"
                                      className="form-control"
                                      value={form.department}
                                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                                      placeholder="e.g. Engineering, Sales"
                                      autoComplete="organization"
                                      aria-required="true"
                                    />
                                  </div>
                                  <div className="flex min-h-0 min-w-0 flex-col gap-0">
                                    <label className="form-label mb-2" htmlFor="hrms-joining-date">
                                      Joining date{' '}
                                      <span className="text-danger" aria-hidden="true">
                                        *
                                      </span>
                                    </label>
                                    <input
                                      id="hrms-joining-date"
                                      type="date"
                                      className="form-control"
                                      value={form.joiningDate}
                                      onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                                      aria-describedby="hrms-joining-hint"
                                      aria-required="true"
                                    />
                                    <p
                                      id="hrms-joining-hint"
                                      className="mb-0 mt-2 text-[0.8125rem] leading-snug text-slate-500 dark:text-slate-400"
                                    >
                                      Saved on placement; syncs to offer letter and employee. Changing the date emails the
                                      employee and agent.
                                    </p>
                                  </div>
                                </div>
                              </section>

                              <section
                                className="border-t border-slate-200/80 pt-8 dark:border-white/10"
                                aria-labelledby="hrms-section-role"
                              >
                                <div className="mb-4 flex items-baseline gap-2">
                                  <h3
                                    id="hrms-section-role"
                                    className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"
                                  >
                                    Role &amp; assignment
                                  </h3>
                                  <span
                                    className="hidden h-px min-w-[2rem] flex-1 bg-slate-200 dark:bg-white/10 sm:block"
                                    aria-hidden
                                  />
                                </div>
                                <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                                  <div className="flex min-h-0 min-w-0 flex-col md:col-span-2 lg:col-span-1">
                                    <label className="form-label mb-2" htmlFor="hrms-position">
                                      Position / job title{' '}
                                      <span className="text-danger" aria-hidden="true">
                                        *
                                      </span>
                                    </label>
                                    <select
                                      id="hrms-position"
                                      className="form-control"
                                      value={
                                        positionOptionsForSelect.some((o) => o.id === form.positionId)
                                          ? form.positionId
                                          : ''
                                      }
                                      onChange={(e) => setForm({ ...form, positionId: e.target.value })}
                                      aria-describedby="hrms-position-hint"
                                      aria-required="true"
                                    >
                                      <option value="">— Select Position —</option>
                                      {positionOptionsForSelect.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name}
                                        </option>
                                      ))}
                                    </select>
                                    <p
                                      id="hrms-position-hint"
                                      className="mb-0 mt-2 text-[0.8125rem] leading-snug text-slate-500 dark:text-slate-400"
                                    >
                                      Shows the role this candidate applied for (same field as designation), matched to HRMS
                                      positions when possible.{' '}
                                      <span className="font-medium text-slate-600 dark:text-slate-300">Training position</span>{' '}
                                      is excluded from matching.
                                    </p>
                                    {!loading && positions.length === 0 && (
                                      <div className="mt-2 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100">
                                        <span className="font-medium">No roster positions yet.</span>{' '}
                                        Use the applied title above or add rows in{' '}
                                        <Link
                                          href="/training/positions"
                                          className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                                        >
                                          Training → Positions
                                        </Link>
                                        .
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex min-h-0 min-w-0 flex-col md:col-span-2 lg:col-span-1">
                                    <label className="form-label mb-2" htmlFor="hrms-agent">
                                      Agent
                                    </label>
                                    <select
                                      id="hrms-agent"
                                      className="form-control"
                                      value={form.agentId}
                                      onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                                      aria-describedby="hrms-agent-hint"
                                    >
                                      <option value="">— Select —</option>
                                      {agentOptionsForSelect.map((a) => (
                                        <option key={a.id} value={a.id}>
                                          {a.name}
                                          {a.email ? ` · ${a.email}` : ''}
                                        </option>
                                      ))}
                                    </select>
                                    <p
                                      id="hrms-agent-hint"
                                      className="mb-0 mt-2 text-[0.8125rem] leading-snug text-slate-500 dark:text-slate-400"
                                    >
                                      Point of contact for this hire (optional).
                                    </p>
                                    {!loading && agents.length === 0 && (
                                      <div className="mt-2 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100">
                                        <span className="font-medium">No Agent-role users.</span> Assign the Agent role in
                                        Settings → Users so they appear here.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </section>
                            </div>

                            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-6 dark:border-white/10">
                              <button type="submit" className="ti-btn ti-btn-primary !min-w-[7rem]" disabled={submitting}>
                                {submitting ? (
                                  <i className="ri-loader-4-line animate-spin" aria-hidden />
                                ) : (
                                  <>
                                    <i className="ri-save-line me-1.5 align-middle text-[1rem]" aria-hidden />
                                    Save
                                  </>
                                )}
                              </button>
                              <Link href="/ats/onboarding" className="ti-btn ti-btn-light">
                                Cancel
                              </Link>
                              <p className="mb-0 w-full text-[0.75rem] text-slate-500 sm:ms-auto sm:w-auto dark:text-slate-400">
                                After save you return to the onboarding list.
                              </p>
                            </div>
                          </div>
                        </form>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {!loading && candidateId && (
              <div className="box-footer border-t border-defaultborder/60 !px-3 !py-2 dark:border-white/5 sm:!px-4">
                <p className="mb-0 text-xs text-gray-600 dark:text-gray-400">
                  Editing candidate record ·{' '}
                  <Link href="/ats/onboarding" className="text-primary hover:underline">
                    All joined employees
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  )
}
