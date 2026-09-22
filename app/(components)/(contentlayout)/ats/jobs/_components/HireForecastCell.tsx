"use client"

import type { HireForecast } from "@/shared/lib/api/jobs"

const CONFIDENCE_CLASS: Record<HireForecast["confidence"], string> = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  low: "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30",
}

/**
 * Build the hover/accessible summary for a hire-forecast badge.
 * @param forecast Server-attached forecast payload
 */
function forecastTitle(forecast: HireForecast): string {
  return [
    forecast.rationale,
    `${forecast.applicants} applicant${forecast.applicants === 1 ? "" : "s"}`,
    `${forecast.strongFits} strong fit${forecast.strongFits === 1 ? "" : "s"}`,
    `${forecast.remainingVacancies} opening${forecast.remainingVacancies === 1 ? "" : "s"} left`,
  ]
    .filter(Boolean)
    .join(" · ")
}

/**
 * Jobs-table cell: days range (or Filled / Thin pipeline) with confidence color.
 */
export function HireForecastCell({ forecast }: { forecast?: HireForecast | null }) {
  if (!forecast) {
    return <span className="text-gray-400 dark:text-gray-500">—</span>
  }
  const cls = CONFIDENCE_CLASS[forecast.confidence] || CONFIDENCE_CLASS.low
  const title = forecastTitle(forecast)
  return (
    <span
      className={`badge border !rounded-md !px-2 !py-1 text-xs font-medium ${cls}`}
      title={title}
      aria-label={`Forecast time to hire: ${forecast.label}. ${title}`}
    >
      {forecast.label}
    </span>
  )
}

/**
 * Compact mobile-card chip for the same forecast payload.
 */
export function HireForecastChip({ forecast }: { forecast?: HireForecast | null }) {
  if (!forecast) return null
  const cls = CONFIDENCE_CLASS[forecast.confidence] || CONFIDENCE_CLASS.low
  const title = forecastTitle(forecast)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${cls}`}
      title={title}
      aria-label={`Forecast time to hire: ${forecast.label}. ${title}`}
    >
      <i className="ri-time-line text-[0.75rem]" aria-hidden />
      {forecast.label}
    </span>
  )
}
