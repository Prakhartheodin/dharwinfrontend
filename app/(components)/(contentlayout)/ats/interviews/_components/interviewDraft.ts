const VERSION = 1
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export interface InterviewDraftData {
  title: string
  description: string
  candidateId: string
  jobId: string
  timezone: string
  scheduledAtIso: string | null
  durationMinutes: string
  maxParticipants: string
  allowGuestJoin: boolean
  requireApproval: boolean
  interviewType: string
  hosts: { nameOrRole: string; email: string }[]
  emailInvites: string[]
  agentIds: string[]
  notes: string
}

interface StoredDraft {
  version: number
  savedAt: string
  data: InterviewDraftData
}

const keyFor = (userId: string): string => `dharwin:interview-draft:v1:${userId || 'anon'}`

export function saveDraft(userId: string, data: InterviewDraftData): void {
  try {
    const payload: StoredDraft = { version: VERSION, savedAt: new Date().toISOString(), data }
    localStorage.setItem(keyFor(userId), JSON.stringify(payload))
  } catch {
    // no-op
  }
}

export function loadDraft(userId: string): InterviewDraftData | null {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDraft
    if (!parsed || parsed.version !== VERSION || !parsed.data) return null
    if (Date.now() - new Date(parsed.savedAt).getTime() > MAX_AGE_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

export function clearDraft(userId: string): void {
  try {
    localStorage.removeItem(keyFor(userId))
  } catch {
    // no-op
  }
}
