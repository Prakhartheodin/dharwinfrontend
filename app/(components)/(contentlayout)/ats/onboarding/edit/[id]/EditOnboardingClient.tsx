"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import pipelineStyles from '../../../ats-pipeline-list.module.css'
import { useRouter, useParams } from 'next/navigation'
import { getPlacementById } from '@/shared/lib/api/placements'
import {
  getCandidate,
  updateCandidate,
  getCandidateFilterAgents,
  assignAgentToStudent,
} from '@/shared/lib/api/employees'
import { getAllPositions } from '@/shared/lib/api/positions'
import { useFeaturePermissions } from '@/shared/hooks/use-feature-permissions'

const isValidMongoId = (id: unknown): id is string =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)

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
  const [form, setForm] = useState({ department: '', designation: '', positionId: '', agentId: '' })
  const [agents, setAgents] = useState<{ id: string; name: string; email?: string }[]>([])
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([])
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [candidateName, setCandidateName] = useState('')

  useEffect(() => {
    if (!placementId || placementId === '_') {
      setError(rawId && rawId !== '_' ? 'Invalid placement ID' : null)
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const placement = await getPlacementById(placementId)
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
        const c = await getCandidate(String(cid))
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
        const posId = typeof pos === 'object' && pos && (pos as { id?: string; _id?: string }).id != null
          ? ((pos as { id?: string; _id?: string }).id ?? (pos as { _id?: string })._id ?? '')
          : typeof pos === 'string' ? pos : ''
        setForm({
          department: c.department ?? '',
          designation: c.designation ?? '',
          positionId: posId ?? '',
          agentId: assignedId || rmId || '',
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
    getAllPositions()
      .then((list) => setPositions(list.map((p) => ({ id: p.id || p._id || '', name: p.name }))))
      .catch(() => {})
  }, [placementId, rawId])

  /** Include current value if it is not in the roster (legacy or API drift). */
  const agentOptionsForSelect = useMemo(() => {
    if (form.agentId && !agents.some((a) => a.id === form.agentId)) {
      return [{ id: form.agentId, name: 'Saved assignment', email: '' }, ...agents]
    }
    return agents
  }, [agents, form.agentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!candidateId) return
    setSubmitting(true)
    setError(null)
    try {
      await updateCandidate(candidateId, {
        department: form.department || undefined,
        designation: form.designation || undefined,
        position: form.positionId || undefined,
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
                  <div className="grid flex-1 grid-cols-1 gap-5 p-4 sm:gap-6 sm:p-6 lg:grid-cols-12 lg:gap-8 lg:p-8">
                    <div className="min-w-0 lg:col-span-7 xl:col-span-8">
                      <div className={`overflow-hidden ${pipelineStyles.tableCard}`}>
                        <div className="border-b border-slate-200/90 bg-slate-50/90 px-4 py-3 sm:px-5 dark:border-white/10 dark:bg-slate-900/50">
                          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            Employee &amp; role
                          </h2>
                          <p className="mb-0 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            These fields map to the candidate / employee record and are shared with the rest of the HRMS.
                          </p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 sm:p-5 lg:p-6">
                          {error && (
                            <div
                              className="mb-5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
                              role="alert"
                            >
                              {error}
                            </div>
                          )}
                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6">
                            <div className="min-w-0">
                              <label className="form-label" htmlFor="hrms-department">
                                Department
                              </label>
                              <input
                                id="hrms-department"
                                type="text"
                                className="form-control"
                                value={form.department}
                                onChange={(e) => setForm({ ...form, department: e.target.value })}
                                placeholder="e.g. Engineering, Sales"
                                autoComplete="organization"
                              />
                            </div>
                            <div className="min-w-0">
                              <label className="form-label" htmlFor="hrms-designation">
                                Designation
                              </label>
                              <input
                                id="hrms-designation"
                                type="text"
                                className="form-control"
                                value={form.designation}
                                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                                placeholder="e.g. Senior Engineer, Manager"
                              />
                            </div>
                            <div className="min-w-0 md:col-span-2">
                              <label className="form-label" htmlFor="hrms-position">
                                Position
                              </label>
                              <select
                                id="hrms-position"
                                className="form-control"
                                value={form.positionId}
                                onChange={(e) => setForm({ ...form, positionId: e.target.value })}
                              >
                                <option value="">— Select Position —</option>
                                {positions.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                              {!loading && positions.length === 0 && (
                                <div className="mt-2 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100">
                                  <span className="font-medium">No positions in the system.</span>{' '}
                                  Add them under{' '}
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
                            <div className="min-w-0 md:col-span-2">
                              <label className="form-label" htmlFor="hrms-agent">
                                Agent
                              </label>
                              <select
                                id="hrms-agent"
                                className="form-control"
                                value={form.agentId}
                                onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                              >
                                <option value="">— Select —</option>
                                {agentOptionsForSelect.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name}
                                    {a.email ? ` · ${a.email}` : ''}
                                  </option>
                                ))}
                              </select>
                              {!loading && agents.length === 0 && (
                                <div className="mt-2 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100">
                                  <span className="font-medium">No Agent-role users found.</span> Add users with the{' '}
                                  <strong>Agent</strong> role (e.g. Settings → Users), or create the &quot;Agent&quot; role
                                  in your database. The list comes from users who have the Agent role.
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-5 dark:border-white/10">
                            <button type="submit" className="ti-btn ti-btn-primary" disabled={submitting}>
                              {submitting ? (
                                <i className="ri-loader-4-line animate-spin" aria-hidden />
                              ) : (
                                'Save'
                              )}
                            </button>
                            <Link href="/ats/onboarding" className="ti-btn ti-btn-light">
                              Cancel
                            </Link>
                          </div>
                        </form>
                      </div>
                    </div>
                    <aside className="min-w-0 lg:col-span-5 xl:col-span-4">
                      <div className="rounded-lg border border-slate-200/90 bg-slate-50/60 p-4 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                        <p className="mb-0">
                          <i className="ri-information-line me-1.5 align-middle text-slate-400" aria-hidden />
                          After saving, you return to the onboarding list. Role and reporting data stay on the candidate
                          record.
                        </p>
                      </div>
                    </aside>
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
