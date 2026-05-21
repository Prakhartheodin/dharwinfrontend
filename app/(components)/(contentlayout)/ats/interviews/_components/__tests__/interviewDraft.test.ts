import { describe, it, expect, beforeEach } from 'vitest'
import { saveDraft, loadDraft, clearDraft, type InterviewDraftData } from '../interviewDraft'

const sample: InterviewDraftData = {
  title: 'Frontend Round',
  description: '',
  candidateId: 'c1',
  jobId: 'j1',
  timezone: 'Asia/Kolkata',
  scheduledAtIso: '2026-05-21T10:00:00.000Z',
  durationMinutes: '60',
  maxParticipants: '10',
  allowGuestJoin: true,
  requireApproval: false,
  interviewType: 'video',
  hosts: [{ nameOrRole: 'Host', email: 'host@example.com' }],
  emailInvites: [''],
  agentIds: ['a1'],
  notes: 'bring laptop',
}

beforeEach(() => localStorage.clear())

describe('interviewDraft', () => {
  it('round-trips a saved draft', () => {
    saveDraft('user1', sample)
    expect(loadDraft('user1')).toEqual(sample)
  })

  it('returns null when no draft exists', () => {
    expect(loadDraft('user1')).toBeNull()
  })

  it('isolates drafts per user', () => {
    saveDraft('user1', sample)
    expect(loadDraft('user2')).toBeNull()
  })

  it('clearDraft removes the draft', () => {
    saveDraft('user1', sample)
    clearDraft('user1')
    expect(loadDraft('user1')).toBeNull()
  })

  it('returns null for a draft older than 24h', () => {
    const stale = JSON.stringify({
      version: 1,
      savedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      data: sample,
    })
    localStorage.setItem('dharwin:interview-draft:v1:user1', stale)
    expect(loadDraft('user1')).toBeNull()
  })

  it('returns null for a version mismatch', () => {
    const wrongVersion = JSON.stringify({ version: 99, savedAt: new Date().toISOString(), data: sample })
    localStorage.setItem('dharwin:interview-draft:v1:user1', wrongVersion)
    expect(loadDraft('user1')).toBeNull()
  })

  it('returns null for unparseable JSON', () => {
    localStorage.setItem('dharwin:interview-draft:v1:user1', '{not json')
    expect(loadDraft('user1')).toBeNull()
  })
})
