/**
 * Joining date display for ATS tables (Offers & Placement, Onboarding, etc.).
 * Uses `en-US` short month + calendar-day parsing for `YYYY-MM-DD` so the shown
 * day matches HR intent in every timezone (unlike `new Date("2026-05-27")` alone).
 */
export const JOINING_DATE_DISPLAY_OPTS = {
  month: 'short' as const,
  day: 'numeric' as const,
  year: 'numeric' as const,
}

export function formatJoiningDateDisplay(value: string | Date): string {
  if (typeof value === 'string') {
    const ymd = value.trim().slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      const y = Number(ymd.slice(0, 4))
      const mo = Number(ymd.slice(5, 7)) - 1
      const day = Number(ymd.slice(8, 10))
      const dt = new Date(y, mo, day)
      if (Number.isNaN(dt.getTime())) return ''
      return dt.toLocaleDateString('en-US', JOINING_DATE_DISPLAY_OPTS)
    }
  }
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', JOINING_DATE_DISPLAY_OPTS)
}

export function joiningDatePresent(value: string | Date | null | undefined): boolean {
  if (value == null) return false
  if (typeof value === 'string' && value.trim() === '') return false
  if (value instanceof Date) return !Number.isNaN(value.getTime())
  return formatJoiningDateDisplay(value) !== ''
}
