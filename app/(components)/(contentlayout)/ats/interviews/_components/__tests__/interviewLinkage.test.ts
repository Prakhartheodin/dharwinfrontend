import { describe, it, expect } from 'vitest'
import {
  INTERVIEW_ROUND_TYPE_OPTIONS,
  applicationIdsByJobId,
  buildScheduleLinkageFields,
  formatScheduleRoundOptionLabel,
  formatRoundBadge,
  linkageActions,
  linkageBadge,
  offersLinkAction,
  parseInterviewLinkageError,
  preselectApplicationId,
  resolveLinkageConflict,
} from '../interviewLinkage'
import type { JobApplication } from '@/shared/lib/api/jobApplications'

const CAND = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const JOB_A = 'bbbbbbbbbbbbbbbbbbbbbbbb'
const JOB_B = 'cccccccccccccccccccccccc'
const APP_A = 'dddddddddddddddddddddddd'
const APP_B = 'eeeeeeeeeeeeeeeeeeeeeeee'

/** API JSON shape: toJSON strips `_id` and exposes `id`. */
function app(id: string, jobId: string, title: string, status: JobApplication['status'] = 'Interview'): JobApplication {
  return { id, job: { id: jobId, title }, candidate: { id: CAND }, status } as unknown as JobApplication
}

function axiosError(status: number, data: unknown) {
  return Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } })
}

describe('linkageBadge', () => {
  it.each(['verified', 'verified_exact_ids', 'verified_manual'])('%s is a verified badge', (status) => {
    expect(linkageBadge(status).kind).toBe('verified')
  })

  it('legacy_title_candidate asks for confirmation', () => {
    expect(linkageBadge('legacy_title_candidate').kind).toBe('legacy')
  })

  it.each([['unlinked'], [undefined], [null], [''], ['toString'], ['something_new']])(
    '%s is unlinked (missing status = unlinked, like backend normalizeLinkageStatus)',
    (status) => {
      expect(linkageBadge(status as string | null | undefined).kind).toBe('unlinked')
    }
  )

  it('uses Tailwind opacity steps that exist (multiples of 5)', () => {
    for (const s of ['verified', 'legacy_title_candidate', 'unlinked']) {
      for (const m of linkageBadge(s).className.matchAll(/\/(\d+)\b/g)) {
        expect(Number(m[1]) % 5).toBe(0)
      }
    }
  })
})

describe('linkageActions', () => {
  it('offers link and create for a candidate interview with a job id and no application', () => {
    expect(linkageActions({ candidateId: CAND, jobPosition: JOB_A })).toEqual({ canLink: true, canCreateApplication: true })
  })

  it('cannot create when jobPosition is a legacy title (backend needs a 24-hex job id)', () => {
    expect(linkageActions({ candidateId: CAND, jobPosition: 'Senior Engineer' })).toEqual({
      canLink: true,
      canCreateApplication: false,
    })
  })

  it('cannot create when the interview already has an application', () => {
    expect(linkageActions({ candidateId: CAND, jobPosition: JOB_A, applicationId: APP_A }).canCreateApplication).toBe(false)
  })

  it('offers nothing without a candidate', () => {
    expect(linkageActions({ candidateId: undefined, jobPosition: JOB_A })).toEqual({ canLink: false, canCreateApplication: false })
    expect(linkageActions({ candidateId: 'not-an-id', jobPosition: JOB_A })).toEqual({ canLink: false, canCreateApplication: false })
  })
})

describe('offersLinkAction', () => {
  it('shows the row action for unlinked and legacy interviews with a candidate', () => {
    expect(offersLinkAction({ linkageStatus: 'unlinked', candidateId: CAND })).toBe(true)
    expect(offersLinkAction({ linkageStatus: undefined, candidateId: CAND })).toBe(true)
    expect(offersLinkAction({ linkageStatus: 'legacy_title_candidate', candidateId: CAND, jobPosition: 'Designer' })).toBe(true)
  })

  it('hides it for verified interviews and interviews without a candidate', () => {
    expect(offersLinkAction({ linkageStatus: 'verified_manual', candidateId: CAND, applicationId: APP_A })).toBe(false)
    expect(offersLinkAction({ linkageStatus: 'unlinked', candidateId: '' })).toBe(false)
  })
})

describe('formatRoundBadge', () => {
  it('does not repeat the index when the label already is "Round N"', () => {
    expect(formatRoundBadge({ index: 4, label: 'Round 4' } as any)).toBe('Round 4')
    expect(formatRoundBadge({ index: 4, label: ' round  4 ' } as any)).toBe('Round 4')
  })
  it('keeps a real qualifier', () => {
    expect(formatRoundBadge({ index: 2, label: 'Tech screen' } as any)).toBe('Round 2 — Tech screen')
  })
  it('falls back to the type label', () => {
    expect(formatRoundBadge({ index: 1, type: 'hr' } as any)).toBe('Round 1 — HR')
  })
})

describe('formatScheduleRoundOptionLabel', () => {
  it('prefers the plan label and appends type for duplicate rubric types', () => {
    expect(formatScheduleRoundOptionLabel({ label: 'System design', roundType: 'technical', index: 2 })).toBe(
      'System design (Technical)'
    )
    expect(formatScheduleRoundOptionLabel({ label: 'Coding', roundType: 'technical', index: 3 })).toBe(
      'Coding (Technical)'
    )
  })

  it('falls back to Round N when the label is blank', () => {
    expect(formatScheduleRoundOptionLabel({ label: '  ', roundType: 'hr', index: 1 })).toBe('Round 1 (HR)')
  })
})

describe('buildScheduleLinkageFields', () => {
  it('sends applicationId, round and language when known', () => {
    expect(
      buildScheduleLinkageFields({
        candidateId: CAND,
        applicationId: APP_A,
        roundType: 'technical',
        roundLabel: '  System design ',
        interviewLanguage: 'en',
      })
    ).toEqual({ applicationId: APP_A, round: { type: 'technical', label: 'System design' }, interviewLanguage: 'en' })
  })

  it('never sends applicationId without a candidate (scheduling without a candidate keeps working)', () => {
    const fields = buildScheduleLinkageFields({ candidateId: '', applicationId: APP_A, interviewLanguage: 'en' })
    expect(fields).toEqual({ interviewLanguage: 'en' })
    expect('applicationId' in fields).toBe(false)
  })

  it('omits keys Joi would reject: empty applicationId, blank round, unknown type or language', () => {
    const fields = buildScheduleLinkageFields({
      candidateId: CAND,
      applicationId: '',
      roundType: '',
      roundLabel: '   ',
      interviewLanguage: '',
    })
    expect(fields).toEqual({})
    // 'group_discussion' is not a declared round type. 'panel' used to stand here, but it is
    // one of the nine the backend accepts — the schema that rejected it was the bug.
    expect(
      buildScheduleLinkageFields({
        candidateId: CAND,
        applicationId: 'x',
        roundType: 'group_discussion',
        interviewLanguage: 'fr',
      })
    ).toEqual({})
  })

  it('sends a label-only round', () => {
    expect(buildScheduleLinkageFields({ roundLabel: 'Round 2' })).toEqual({ round: { label: 'Round 2' } })
  })

  it('sends a plan row on its own, with no type to contradict it', () => {
    // The server fills type and label from the row only when the caller sent neither, so a
    // plan row must travel alone. A type alongside it would win and could name a different
    // round than the row the rubric is resolved from.
    expect(
      buildScheduleLinkageFields({ candidateId: CAND, applicationId: APP_A, roundPlanKey: 'round_2' })
    ).toEqual({ applicationId: APP_A, round: { planKey: 'round_2' } })
  })

  it('omits an off-plan round key rather than sending a blank one', () => {
    expect(buildScheduleLinkageFields({ roundPlanKey: '' })).toEqual({})
    expect(buildScheduleLinkageFields({ roundPlanKey: '   ' })).toEqual({})
  })

  it('sends templateId for an off-plan round and not for a planned row', () => {
    expect(
      buildScheduleLinkageFields({
        candidateId: CAND,
        applicationId: APP_A,
        roundPlanKey: '',
        roundTemplateId: APP_B,
      })
    ).toEqual({ applicationId: APP_A, round: { templateId: APP_B } })
    expect(
      buildScheduleLinkageFields({
        candidateId: CAND,
        applicationId: APP_A,
        roundPlanKey: 'round_1',
        roundTemplateId: APP_B,
      })
    ).toEqual({ applicationId: APP_A, round: { planKey: 'round_1' } })
  })

  it('offers exactly the round types the backend declares', () => {
    // Mirrors INTERVIEW_ROUND_TYPES in the backend's constants/interviewLinkage.js, in order.
    // This list had already gained 'panel' and 'hr' while the meeting Joi schema still
    // hardcoded seven, so the form offered two types every request would reject.
    expect(INTERVIEW_ROUND_TYPE_OPTIONS.map((o) => o.value)).toEqual([
      'screening',
      'technical',
      'panel',
      'hr',
      'behavioral',
      'hiring_manager',
      'culture',
      'final',
      'other',
    ])
  })
})

describe('parseInterviewLinkageError', () => {
  it('reads errorCode and details.applicationId from a 409 body', () => {
    const err = axiosError(409, {
      code: 409,
      message: 'Application already exists for this candidate and job',
      errorCode: 'application_exists',
      details: { applicationId: APP_B },
    })
    expect(parseInterviewLinkageError(err)).toEqual({
      errorCode: 'application_exists',
      applicationId: APP_B,
      message: 'Application already exists for this candidate and job',
    })
  })

  it('handles a 409 without details', () => {
    const err = axiosError(409, { message: 'Linkage revision conflict', errorCode: 'linkage_revision_conflict' })
    expect(parseInterviewLinkageError(err)).toEqual({
      errorCode: 'linkage_revision_conflict',
      applicationId: null,
      message: 'Linkage revision conflict',
    })
  })

  it('ignores other statuses, unknown codes and non-HTTP errors', () => {
    expect(parseInterviewLinkageError(axiosError(400, { errorCode: 'interview_not_linked' }))).toBeNull()
    expect(parseInterviewLinkageError(axiosError(409, { errorCode: 'CANDIDATE_RESIGNED' }))).toBeNull()
    expect(parseInterviewLinkageError(axiosError(409, {}))).toBeNull()
    expect(parseInterviewLinkageError(new Error('Network Error'))).toBeNull()
    expect(parseInterviewLinkageError(null)).toBeNull()
  })
})

describe('resolveLinkageConflict', () => {
  it('revision conflict without an application: refetch the linkage, keep the selection', () => {
    const r = resolveLinkageConflict({ errorCode: 'linkage_revision_conflict', applicationId: null, message: '' })
    expect(r).toMatchObject({ reloadLinkage: true, reloadApplications: false, preselectApplicationId: null })
    expect(r.notice).toBeTruthy()
  })

  it('revision conflict after create: the application exists, refetch both and select it', () => {
    expect(
      resolveLinkageConflict({ errorCode: 'linkage_revision_conflict', applicationId: APP_B, message: '' })
    ).toMatchObject({ reloadLinkage: true, reloadApplications: true, preselectApplicationId: APP_B })
  })

  it('application_exists: refetch applications and select the existing one to link', () => {
    expect(resolveLinkageConflict({ errorCode: 'application_exists', applicationId: APP_B, message: '' })).toMatchObject({
      reloadLinkage: false,
      reloadApplications: true,
      preselectApplicationId: APP_B,
    })
  })

  it('interview_already_linked: refetch the linkage', () => {
    expect(
      resolveLinkageConflict({ errorCode: 'interview_already_linked', applicationId: APP_A, message: '' })
    ).toMatchObject({ reloadLinkage: true, preselectApplicationId: APP_A })
  })
})

describe('applicationIdsByJobId', () => {
  it('maps each job to the candidate application id (id or _id)', () => {
    const legacy = { _id: APP_B, job: { _id: JOB_B, title: 'B' }, candidate: {}, status: 'Applied' } as unknown as JobApplication
    expect(applicationIdsByJobId([app(APP_A, JOB_A, 'A'), legacy])).toEqual({ [JOB_A]: APP_A, [JOB_B]: APP_B })
  })

  it('keeps the first application for a job, matching the job option dedupe', () => {
    expect(applicationIdsByJobId([app(APP_A, JOB_A, 'A'), app(APP_B, JOB_A, 'A')])).toEqual({ [JOB_A]: APP_A })
  })

  it('skips rows without a populated job', () => {
    const bare = { id: APP_A, job: JOB_A, candidate: {}, status: 'Applied' } as unknown as JobApplication
    expect(applicationIdsByJobId([bare])).toEqual({})
  })
})

describe('preselectApplicationId', () => {
  const apps = [app(APP_A, JOB_A, 'Senior Engineer'), app(APP_B, JOB_B, 'Designer', 'Rejected')]

  it('prefers the interview application id', () => {
    expect(preselectApplicationId(apps, { applicationId: APP_B, jobPosition: JOB_A })).toBe(APP_B)
  })

  it('falls back to the job id stored in jobPosition', () => {
    expect(preselectApplicationId(apps, { applicationId: null, jobPosition: JOB_B })).toBe(APP_B)
  })

  it('suggests a legacy title match only when exactly one application matches', () => {
    expect(preselectApplicationId(apps, { jobPosition: ' senior engineer ' })).toBe(APP_A)
    const dup = [...apps, app('ffffffffffffffffffffffff', 'fafafafafafafafafafafafa', 'Senior Engineer')]
    expect(preselectApplicationId(dup, { jobPosition: 'Senior Engineer' })).toBe('')
  })

  it('returns empty when nothing matches', () => {
    expect(preselectApplicationId(apps, { applicationId: 'ffffffffffffffffffffffff', jobPosition: '' })).toBe('')
    expect(preselectApplicationId([], { jobPosition: JOB_A })).toBe('')
  })
})
