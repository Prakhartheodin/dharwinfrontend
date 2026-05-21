import { describe, it, expect } from 'vitest'
import { detectOverlap } from '../interviewOverlap'
import type { Meeting } from '@/shared/lib/api/meetings'

function meeting(over: Partial<Meeting>): Meeting {
  return {
    _id: over._id ?? 'm1',
    meetingId: over.meetingId ?? 'mid1',
    title: over.title ?? 'Interview',
    scheduledAt: over.scheduledAt ?? '2026-05-21T10:30:00.000Z',
    durationMinutes: over.durationMinutes ?? 60,
    maxParticipants: 10,
    allowGuestJoin: true,
    requireApproval: false,
    hosts: [],
    emailInvites: [],
    interviewType: 'Video',
    status: over.status ?? 'scheduled',
    candidate: over.candidate,
    recruiter: over.recruiter,
    agents: over.agents,
  } as Meeting
}

describe('detectOverlap', () => {
  const base = {
    startUtc: '2026-05-21T10:00:00.000Z',
    durationMinutes: 60,
    agentIds: [] as string[],
  }

  it('returns no conflicts when nothing overlaps', () => {
    const res = detectOverlap({
      ...base,
      candidateId: 'c1',
      existingMeetings: [meeting({ scheduledAt: '2026-05-21T11:15:00.000Z', candidate: { id: 'c1' } })],
    })
    expect(res.candidateConflict).toBeUndefined()
    expect(res.agentConflicts).toEqual([])
  })

  it('flags a candidate conflict on an overlapping range', () => {
    const clash = meeting({ _id: 'm2', scheduledAt: '2026-05-21T10:30:00.000Z', candidate: { id: 'c1' } })
    const res = detectOverlap({ ...base, candidateId: 'c1', existingMeetings: [clash] })
    expect(res.candidateConflict?._id).toBe('m2')
  })

  it('flags an agent conflict when an agent id is shared', () => {
    const clash = meeting({ _id: 'm3', scheduledAt: '2026-05-21T10:30:00.000Z', agents: [{ id: 'a1' }] })
    const res = detectOverlap({ ...base, agentIds: ['a1'], existingMeetings: [clash] })
    expect(res.agentConflicts.map((m) => m._id)).toEqual(['m3'])
  })

  it('treats the recruiter id as an agent id on the existing meeting', () => {
    const clash = meeting({ _id: 'm4', scheduledAt: '2026-05-21T10:30:00.000Z', recruiter: { id: 'a9' } })
    const res = detectOverlap({ ...base, agentIds: ['a9'], existingMeetings: [clash] })
    expect(res.agentConflicts.map((m) => m._id)).toEqual(['m4'])
  })

  it('does not flag touching-edge ranges as an overlap', () => {
    const touch = meeting({ _id: 'm5', scheduledAt: '2026-05-21T09:00:00.000Z', candidate: { id: 'c1' } })
    const res = detectOverlap({ ...base, candidateId: 'c1', existingMeetings: [touch] })
    expect(res.candidateConflict).toBeUndefined()
  })

  it('excludes the meeting being edited', () => {
    const self = meeting({ _id: 'm6', scheduledAt: '2026-05-21T10:30:00.000Z', candidate: { id: 'c1' } })
    const res = detectOverlap({
      ...base,
      candidateId: 'c1',
      existingMeetings: [self],
      excludeMeetingId: 'm6',
    })
    expect(res.candidateConflict).toBeUndefined()
  })

  it('ignores meetings that are not scheduled', () => {
    const ended = meeting({ _id: 'm7', scheduledAt: '2026-05-21T10:30:00.000Z', candidate: { id: 'c1' }, status: 'ended' })
    const res = detectOverlap({ ...base, candidateId: 'c1', existingMeetings: [ended] })
    expect(res.candidateConflict).toBeUndefined()
  })
})
