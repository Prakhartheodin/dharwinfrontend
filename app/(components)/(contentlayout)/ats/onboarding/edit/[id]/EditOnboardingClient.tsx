"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { getPlacementById } from '@/shared/lib/api/placements'
import { getCandidate, updateCandidate } from '@/shared/lib/api/candidates'
import { listUsers } from '@/shared/lib/api/users'
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
  const [form, setForm] = useState({ department: '', designation: '', positionId: '', reportingManagerId: '' })
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([])
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
        const rm = c.reportingManager
        const rmId = typeof rm === 'object' && rm && '_id' in rm ? (rm as { _id: string })._id : (typeof rm === 'string' ? rm : '')
        const pos = c.position
        const posId = typeof pos === 'object' && pos && (pos as { id?: string; _id?: string }).id != null
          ? ((pos as { id?: string; _id?: string }).id ?? (pos as { _id?: string })._id ?? '')
          : typeof pos === 'string' ? pos : ''
        setForm({
          department: c.department ?? '',
          designation: c.designation ?? '',
          positionId: posId ?? '',
          reportingManagerId: rmId ?? '',
        })
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load placement')
      } finally {
        setLoading(false)
      }
    }
    load()
    listUsers({ role: 'recruiter', limit: 200 })
      .then((r) => {
        const users = (r as { results?: { id?: string; _id?: string; name?: string; email?: string }[] }).results ?? []
        setManagers(users.map((u) => ({ id: u._id || u.id || '', name: u.name || u.email || 'Unknown' })))
      })
      .catch(() => {})
    getAllPositions()
      .then((list) => setPositions(list.map((p) => ({ id: p.id || p._id || '', name: p.name }))))
      .catch(() => {})
  }, [placementId, rawId])

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
        reportingManager: form.reportingManagerId || undefined,
      })
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
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 p-6 rounded-lg border border-danger/20 bg-danger/5 text-danger">
            You do not have permission to edit onboarding.
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title="Edit HRMS" />
      <Pageheader currentpage="Edit HRMS" activepage="Onboarding" mainpage={`Edit HRMS – ${candidateName}`} />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box">
            <div className="box-header flex flex-wrap items-center justify-between gap-2">
              <h5 className="box-title">Edit Onboarding (HRMS) – {candidateName}</h5>
              <Link href="/ats/onboarding" className="ti-btn ti-btn-sm ti-btn-light">
                <i className="ri-arrow-left-line me-1"></i>Back to Onboarding
              </Link>
            </div>
            <div className="box-body">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
                  <span className="ml-3 text-sm text-gray-500">Loading...</span>
                </div>
              ) : error && !candidateId ? (
                <div className="py-8 text-center">
                  <p className="text-danger mb-4">{error}</p>
                  <Link href="/ats/onboarding" className="ti-btn ti-btn-primary">Back to Onboarding</Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                  {error && <div className="p-3 rounded bg-danger/10 text-danger text-sm">{error}</div>}
                  <div>
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      placeholder="e.g. Engineering, Sales"
                    />
                  </div>
                  <div>
                    <label className="form-label">Designation</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.designation}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                      placeholder="e.g. Senior Engineer, Manager"
                    />
                  </div>
                  <div>
                    <label className="form-label">Position</label>
                    <select
                      className="form-control"
                      value={form.positionId}
                      onChange={(e) => setForm({ ...form, positionId: e.target.value })}
                    >
                      <option value="">— Select Position —</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {!loading && positions.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No positions. Add positions in Training → Positions.</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Reporting Manager</label>
                    <select
                      className="form-control"
                      value={form.reportingManagerId}
                      onChange={(e) => setForm({ ...form, reportingManagerId: e.target.value })}
                    >
                      <option value="">— Select —</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    {!loading && managers.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No managers found. Run <code>npm run seed:managers</code> in backend to add mock managers.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="ti-btn ti-btn-primary" disabled={submitting}>
                      {submitting ? <i className="ri-loader-4-line animate-spin"></i> : 'Save'}
                    </button>
                    <Link href="/ats/onboarding" className="ti-btn ti-btn-light">Cancel</Link>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}
