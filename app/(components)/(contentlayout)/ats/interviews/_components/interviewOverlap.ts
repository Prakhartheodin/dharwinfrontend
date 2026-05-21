import type { Meeting } from '@/shared/lib/api/meetings'

export interface OverlapInput {
  startUtc: Date | string
  durationMinutes: number
  candidateId?: string
  agentIds: string[]
  existingMeetings: Meeting[]
  excludeMeetingId?: string
}

export interface OverlapResult {
  candidateConflict?: Meeting
  agentConflicts: Meeting[]
}

const toMs = (v: Date | string): number => (v instanceof Date ? v.getTime() : new Date(v).getTime())

function meetingAgentIds(m: Meeting): string[] {
  const ids: string[] = []
  for (const a of m.agents ?? []) {
    if (a?.id) ids.push(String(a.id))
  }
  if (m.recruiter?.id) ids.push(String(m.recruiter.id))
  return ids
}

export function detectOverlap(input: OverlapInput): OverlapResult {
  const newStart = toMs(input.startUtc)
  const newEnd = newStart + Math.max(0, input.durationMinutes) * 60000
  const agentIdSet = new Set(input.agentIds.filter(Boolean).map(String))

  const result: OverlapResult = { agentConflicts: [] }
  if (Number.isNaN(newStart)) return result

  for (const m of input.existingMeetings) {
    if (m.status !== 'scheduled') continue
    if (input.excludeMeetingId && (m._id === input.excludeMeetingId || m.meetingId === input.excludeMeetingId)) {
      continue
    }
    const mStart = toMs(m.scheduledAt)
    if (Number.isNaN(mStart)) continue
    const mEnd = mStart + Math.max(0, m.durationMinutes || 60) * 60000
    const overlaps = newStart < mEnd && mStart < newEnd
    if (!overlaps) continue

    if (input.candidateId && m.candidate?.id && String(m.candidate.id) === String(input.candidateId)) {
      if (!result.candidateConflict) result.candidateConflict = m
    }
    if (agentIdSet.size > 0 && meetingAgentIds(m).some((id) => agentIdSet.has(id))) {
      result.agentConflicts.push(m)
    }
  }

  return result
}
