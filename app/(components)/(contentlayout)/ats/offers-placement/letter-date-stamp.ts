/**
 * Local calendar date YYYY-MM-DD — applied to offer `letterDate` whenever the letter is saved.
 * (Not UTC midnight; matches “the day it is saved” in the user’s timezone.)
 */
export function letterDateStampYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
