"use client"

export const HIRE_FORECAST_INFO_PANEL_ID = "hire-forecast-info-panel"

const SIGNAL_FIELDS = [
  {
    icon: "ri-team-line",
    label: "Remaining openings",
    detail: "Vacancies minus hired. Extra openings add days; Filled when none remain.",
  },
  {
    icon: "ri-user-star-line",
    label: "Seniority",
    detail: "Entry / Mid / Senior / Executive sets the base remaining-days estimate.",
  },
  {
    icon: "ri-group-line",
    label: "Applicant volume",
    detail: "How many people applied per remaining opening. Thin inbound stretches the range.",
  },
  {
    icon: "ri-sparkling-2-line",
    label: "Skill match",
    detail: "Candidate skills vs this job’s required skills and levels. Strong fits pull days down.",
  },
  {
    icon: "ri-flow-chart",
    label: "Pipeline stage",
    detail: "Applied → Screening → Interview → Shortlisted → Offered. Offers covering openings are fastest.",
  },
  {
    icon: "ri-pulse-line",
    label: "Apply velocity",
    detail: "Applications in the last 7 days, plus how long the job has been open.",
  },
] as const

/**
 * Open the Time to hire explainer offcanvas (same Preline pattern as job preview).
 */
export function openHireForecastInfo(): void {
  window.setTimeout(() => {
    const HSOverlay = (window as unknown as { HSOverlay?: { open?: (id: string) => void } }).HSOverlay
    const HSStaticMethods = (window as unknown as { HSStaticMethods?: { autoInit?: () => void } }).HSStaticMethods
    HSStaticMethods?.autoInit?.()
    HSOverlay?.open?.(`#${HIRE_FORECAST_INFO_PANEL_ID}`)
  }, 50)
}

/**
 * Column header: Time to hire + AI pill + info control that opens the drawer.
 */
export function HireForecastColumnHeader() {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="tabletitle">Time to hire</span>
      <span className="inline-flex items-center rounded border border-primary/30 bg-primary/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
        AI
      </span>
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label="How Time to hire is calculated with AI"
        title="How AI calculates Time to hire"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          openHireForecastInfo()
        }}
      >
        <i className="ri-information-line text-sm" aria-hidden />
      </button>
    </div>
  )
}

/**
 * Right-side drawer explaining that Time to hire is AI-calculated from pipeline fields.
 */
export function HireForecastInfoDrawer() {
  return (
    <div
      id={HIRE_FORECAST_INFO_PANEL_ID}
      className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !w-full sm:!max-w-[28rem] flex h-full min-h-0 flex-col overflow-hidden"
      tabIndex={-1}
      role="dialog"
      aria-labelledby="hire-forecast-info-title"
    >
      <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5 shrink-0">
        <h6
          id="hire-forecast-info-title"
          className="ti-offcanvas-title text-base font-semibold flex items-center gap-2"
        >
          <i className="ri-sparkling-2-line text-primary text-base" aria-hidden />
          Time to hire
        </h6>
        <button
          type="button"
          className="ti-btn flex-shrink-0 p-1 transition-none text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-white/50 dark:hover:text-white/80 dark:hover:bg-black/40 rounded-md"
          data-hs-overlay={`#${HIRE_FORECAST_INFO_PANEL_ID}`}
          aria-label="Close Time to hire explainer"
        >
          <i className="ri-close-line text-lg" aria-hidden />
        </button>
      </div>
      <div className="ti-offcanvas-body !h-auto !max-h-none min-h-0 flex-1 overflow-y-auto !px-4 !pt-4 !pb-28 space-y-5">
        <div
          className="rounded-lg border border-primary/25 bg-gradient-to-r from-primary/10 to-primary/5 p-3.5"
          role="note"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <i className="ri-ai-generate text-base" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">Calculated with AI</p>
              <p className="mt-1 text-xs leading-relaxed text-defaulttextcolor/80">
                This column is not typed in by a recruiter. Each row is scored from that job’s
                pipeline, then an AI model writes the range and the hover rationale.
              </p>
            </div>
          </div>
        </div>

        <section aria-labelledby="hire-forecast-fields-heading">
          <h3
            id="hire-forecast-fields-heading"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-defaulttextcolor/60"
          >
            Fields AI uses
          </h3>
          <ul className="space-y-2">
            {SIGNAL_FIELDS.map((field) => (
              <li
                key={field.label}
                className="flex gap-2.5 rounded-lg border border-defaultborder/70 bg-white p-2.5 dark:border-white/10 dark:bg-black/20"
              >
                <i className={`${field.icon} mt-0.5 shrink-0 text-primary`} aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{field.label}</p>
                  <p className="mt-0.5 text-xs leading-snug text-defaulttextcolor/75">{field.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="hire-forecast-read-heading" className="pb-10">
          <h3
            id="hire-forecast-read-heading"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-defaulttextcolor/60"
          >
            How to read a cell
          </h3>
          <ul className="space-y-1.5 text-xs leading-relaxed text-defaulttextcolor/80">
            <li>
              <span className="font-medium text-gray-800 dark:text-white">7–14 days</span>
              {" — "}remaining time to fill what’s left, as a range (not a single-day promise).
            </li>
            <li>
              <span className="font-medium text-gray-800 dark:text-white">Thin pipeline</span>
              {" — "}no applicants yet; AI still shows a wide, low-confidence band on hover.
            </li>
            <li>
              <span className="font-medium text-gray-800 dark:text-white">Filled</span>
              {" — "}hired count already covers vacancies.
            </li>
            <li>Hover the badge for the AI rationale plus applicant / strong-fit / openings counts.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
