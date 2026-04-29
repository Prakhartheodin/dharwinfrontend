/**
 * Local calendar date YYYY-MM-DD — fallback when letter date is empty on save (same clock as browser).
 * Prefer `letterForm.letterDate` from the Offer Letter Generator so teams can align with US/other zones.
 */
export function letterDateStampYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
