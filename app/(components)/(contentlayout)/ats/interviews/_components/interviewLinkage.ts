import type {
  CreateMeetingPayload,
  InterviewLanguage,
  InterviewLinkageErrorCode,
  InterviewRound,
  InterviewRoundType,
} from '@/shared/lib/api/meetings'
import type { JobApplication } from '@/shared/lib/api/jobApplications'
import { isMongoObjectId } from '@/shared/lib/api/employees'
import { jobApplicationRecordId } from '@/shared/lib/ats/offer-application-eligibility'

/** D4 enum, in backend order (src/constants/interviewLinkage.js). */
export const INTERVIEW_ROUND_TYPE_OPTIONS: ReadonlyArray<{ value: InterviewRoundType; label: string }> = [
  { value: 'screening', label: 'Screening' },
  { value: 'technical', label: 'Technical' },
  { value: 'panel', label: 'Panel' },
  { value: 'hr', label: 'HR' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'hiring_manager', label: 'Hiring manager' },
  { value: 'culture', label: 'Culture' },
  { value: 'final', label: 'Final' },
  { value: 'other', label: 'Other' },
]

/** Backend SUPPORTED_INTERVIEW_LANGUAGES is `['en']` today. */
export const INTERVIEW_LANGUAGE_OPTIONS: ReadonlyArray<{ value: InterviewLanguage; label: string }> = [
  { value: 'en', label: 'English' },
]

export type LinkageBadgeKind = 'verified' | 'legacy' | 'unlinked'

export interface LinkageBadge {
  kind: LinkageBadgeKind
  label: string
  title: string
  className: string
}

/** Linkage status → list badge. A missing or unknown status is `unlinked`, as backend normalizeLinkageStatus reads it. */
export function linkageBadge(status: string | null | undefined): LinkageBadge {
  switch (status) {
    case 'verified':
    case 'verified_exact_ids':
    case 'verified_manual':
      return {
        kind: 'verified',
        label: 'Linked',
        title:
          status === 'verified_manual'
            ? 'Linked to its job application by a recruiter'
            : status === 'verified_exact_ids'
              ? 'Linked to its job application by candidate and job ids'
              : 'Linked to its job application when scheduled',
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      }
    case 'legacy_title_candidate':
      return {
        kind: 'legacy',
        label: 'Confirm link',
        title: 'Matched to an application by job title only — confirm it with Link application',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      }
    default:
      return {
        kind: 'unlinked',
        label: 'Not linked',
        title: 'Not linked to a job application',
        className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30',
      }
  }
}

export interface LinkageActions {
  /** PATCH /meetings/:id/linkage needs a candidate whose applications can be listed. */
  canLink: boolean
  /** POST /meetings/:id/application needs a candidate, a 24-hex job id in jobPosition, and no application yet. */
  canCreateApplication: boolean
}

export function linkageActions(input: {
  candidateId?: string | null
  jobPosition?: string | null
  applicationId?: string | null
}): LinkageActions {
  const canLink = isMongoObjectId(input.candidateId)
  return {
    canLink,
    canCreateApplication: canLink && !input.applicationId && isMongoObjectId(input.jobPosition),
  }
}

/** Row-level "Link application" action: not yet verified, and a candidate to link. */
export function offersLinkAction(row: {
  linkageStatus?: string | null
  candidateId?: string | null
  jobPosition?: string | null
  applicationId?: string | null
}): boolean {
  return linkageBadge(row.linkageStatus).kind !== 'verified' && linkageActions(row).canLink
}

/**
 * Sentinel for "an extra round, outside the job's plan" in the schedule form's Round select.
 *
 * Defined once and imported by both the form and the payload build. A plan row key can never
 * collide with it: keys are generated as `round_<n>`.
 */
export const OFF_PLAN_ROUND = '__off_plan__'

/**
 * Label for one row in the Schedule Interview round dropdown.
 * Prefers the recruiter-defined name; appends the rubric type so two Technical rows stay distinct.
 */
export function formatScheduleRoundOptionLabel(input: {
  label?: string | null
  roundType?: InterviewRoundType | null
  index?: number
}): string {
  const name = String(input.label ?? '').trim() || (input.index != null && input.index > 0 ? `Round ${input.index}` : 'Round')
  const typeLabel = input.roundType
    ? INTERVIEW_ROUND_TYPE_OPTIONS.find((o) => o.value === input.roundType)?.label ?? input.roundType
    : ''
  return typeLabel ? `${name} (${typeLabel})` : name
}

/**
 * Linkage keys for POST /meetings. Only values the create schema accepts are included: Joi takes
 * `applicationId` as a 24-hex string only (never '' or null) and `round.type` from the D4 enum only.
 */
export function buildScheduleLinkageFields(input: {
  candidateId?: string
  applicationId?: string
  roundType?: string
  roundLabel?: string
  /** A row of the application's round plan. Omitted for an off-plan round. */
  roundPlanKey?: string
  interviewLanguage?: string
}): Pick<CreateMeetingPayload, 'applicationId' | 'round' | 'interviewLanguage'> {
  const fields: Pick<CreateMeetingPayload, 'applicationId' | 'round' | 'interviewLanguage'> = {}
  // An application belongs to a candidate; without one the backend would 400 on a mismatch.
  if (isMongoObjectId(input.candidateId) && isMongoObjectId(input.applicationId)) {
    fields.applicationId = input.applicationId.trim()
  }
  const round: InterviewRound = {}
  const type = INTERVIEW_ROUND_TYPE_OPTIONS.find((o) => o.value === input.roundType)?.value
  if (type) round.type = type
  const label = (input.roundLabel ?? '').trim()
  if (label) round.label = label
  // Only sent when it is a real key. The backend fills in the next unfilled row itself
  // when none arrives, so an empty string here would be worse than absent.
  const planKey = (input.roundPlanKey ?? '').trim()
  if (planKey) round.planKey = planKey
  if (round.type || round.label || round.planKey) fields.round = round
  const language = INTERVIEW_LANGUAGE_OPTIONS.find((o) => o.value === input.interviewLanguage)?.value
  if (language) fields.interviewLanguage = language
  return fields
}

const LINKAGE_ERROR_CODES: ReadonlySet<string> = new Set<InterviewLinkageErrorCode>([
  'interview_not_linked',
  'linkage_revision_conflict',
  'interview_already_linked',
  'application_exists',
])

export interface LinkageErrorInfo {
  errorCode: InterviewLinkageErrorCode
  /** `details.applicationId` when the backend names an existing or just-created application. */
  applicationId: string | null
  message: string
}

/** Reads the C4 409 contract off an axios error; null for anything else. */
export function parseInterviewLinkageError(err: unknown): LinkageErrorInfo | null {
  const response = (err as { response?: { status?: number; data?: unknown } } | null)?.response
  if (!response || response.status !== 409) return null
  const data = (response.data ?? {}) as { errorCode?: unknown; message?: unknown; details?: { applicationId?: unknown } }
  if (typeof data.errorCode !== 'string' || !LINKAGE_ERROR_CODES.has(data.errorCode)) return null
  const applicationId = data.details?.applicationId
  return {
    errorCode: data.errorCode as InterviewLinkageErrorCode,
    applicationId: typeof applicationId === 'string' && applicationId ? applicationId : null,
    message: typeof data.message === 'string' ? data.message : '',
  }
}

export interface LinkageConflictResolution {
  notice: string
  /** Refetch GET /meetings/:id/linkage — the stored revision or link is stale. */
  reloadLinkage: boolean
  /** Refetch the candidate's applications — one exists that the loaded list may not show. */
  reloadApplications: boolean
  preselectApplicationId: string | null
}

/** What the link dialog does after a 409. Never retries on its own: the recruiter reviews the fresh state first. */
export function resolveLinkageConflict(info: LinkageErrorInfo): LinkageConflictResolution {
  switch (info.errorCode) {
    case 'linkage_revision_conflict':
      return info.applicationId
        ? {
            notice:
              'The application was created, but this interview changed at the same time. It is selected below — review and link it.',
            reloadLinkage: true,
            reloadApplications: true,
            preselectApplicationId: info.applicationId,
          }
        : {
            notice: "This interview's link was changed by someone else. The current state is loaded — review and try again.",
            reloadLinkage: true,
            reloadApplications: false,
            preselectApplicationId: null,
          }
    case 'application_exists':
      return {
        notice: 'An application for this candidate and job already exists. It is selected below — link it instead.',
        reloadLinkage: false,
        reloadApplications: true,
        preselectApplicationId: info.applicationId,
      }
    case 'interview_already_linked':
      return {
        notice: 'This interview is already linked to an application. The current link is loaded.',
        reloadLinkage: true,
        reloadApplications: false,
        preselectApplicationId: info.applicationId,
      }
    default:
      return {
        notice: 'This interview is not linked to a job application.',
        reloadLinkage: true,
        reloadApplications: false,
        preselectApplicationId: null,
      }
  }
}

function jobIdOf(app: JobApplication): string {
  const job = app.job
  if (!job || typeof job !== 'object') return ''
  const raw = job._id ?? job.id
  return raw != null ? String(raw) : ''
}

/**
 * jobId → applicationId for one candidate's applications. Job + candidate is unique, so the job the
 * schedule form selects identifies the application; the first row wins, like the job option dedupe.
 */
export function applicationIdsByJobId(apps: JobApplication[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const app of apps) {
    const jobId = jobIdOf(app)
    const appId = jobApplicationRecordId(app)
    if (!jobId || !appId || Object.prototype.hasOwnProperty.call(map, jobId)) continue
    map[jobId] = appId
  }
  return map
}

/**
 * Initial choice in the link dialog: the interview's own application, else the job id in jobPosition,
 * else a legacy title that matches exactly one application. It is only a suggestion — nothing links
 * until the recruiter confirms.
 */
export function preselectApplicationId(
  apps: JobApplication[],
  hint: { applicationId?: string | null; jobPosition?: string | null }
): string {
  if (hint.applicationId && apps.some((a) => jobApplicationRecordId(a) === hint.applicationId)) {
    return hint.applicationId
  }
  const pos = (hint.jobPosition ?? '').trim()
  if (!pos) return ''
  // Computed before the guard: isMongoObjectId narrows `pos` to never in its false branch.
  const title = pos.toLowerCase()
  if (isMongoObjectId(pos)) {
    const byJob = apps.find((a) => jobIdOf(a) === pos)
    return byJob ? jobApplicationRecordId(byJob) : ''
  }
  const byTitle = apps.filter((a) => (a.job?.title ?? '').trim().toLowerCase() === title)
  return byTitle.length === 1 ? jobApplicationRecordId(byTitle[0]) : ''
}

/**
 * A round's short display name for a table cell or a badge.
 *
 * The round-history endpoint returns a server-built `roundName` and that is what the
 * history panel renders. This exists because the interviews LIST returns raw meetings
 * with no `roundName`. Keep the two consistent: "Round N — qualifier".
 */
export function formatRoundBadge(round?: InterviewRound | null): string | null {
  if (!round) return null
  const index = Number(round.index)
  const hasIndex = Number.isFinite(index) && index > 0
  const label = String(round.label || '').trim()
  const typeLabel = round.type
    ? INTERVIEW_ROUND_TYPE_OPTIONS.find((o) => o.value === round.type)?.label || round.type
    : ''
  const qualifier = label || typeLabel

  // A plan row's label is often the literal "Round N", which produced "Round 4 — Round 4".
  const qualifierIsIndex =
    qualifier.replace(/\s+/g, ' ').trim().toLowerCase() === `round ${index}`
  if (hasIndex && qualifier && !qualifierIsIndex) return `Round ${index} — ${qualifier}`
  if (hasIndex) return `Round ${index}`
  if (qualifier) return qualifier
  return null
}
