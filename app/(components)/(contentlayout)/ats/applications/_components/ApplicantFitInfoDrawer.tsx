"use client";

export const APPLICANT_FIT_INFO_PANEL_ID = "applicant-fit-info-panel";

const SIGNAL_FIELDS = [
  {
    icon: "ri-file-text-line",
    label: "Job description",
    detail: "Role responsibilities, seniority, and any culture/values language written in the JD.",
  },
  {
    icon: "ri-price-tag-3-line",
    label: "Required skills",
    detail: "The job’s skill tags and required skill levels. Missing required skills drop Success.",
  },
  {
    icon: "ri-user-star-line",
    label: "Resume skills",
    detail: "Skills stored on the candidate (from resume parse or manual). Compared 1:1 to the job.",
  },
  {
    icon: "ri-briefcase-4-line",
    label: "Experience & role",
    detail: "Past roles and tenure (years). Company names are not sent to the model.",
  },
  {
    icon: "ri-graduation-cap-line",
    label: "Qualifications",
    detail: "Degree names on the profile, plus department and designation when present.",
  },
  {
    icon: "ri-chat-quote-line",
    label: "Bio & cover letter",
    detail: "Short bio and the cover letter on this application — mainly for Culture, not the %.",
  },
] as const;

/**
 * Open the Success / Culture explainer offcanvas (same Preline overlay as Time to hire).
 */
export function openApplicantFitInfo(): void {
  window.setTimeout(() => {
    const HSOverlay = (window as unknown as { HSOverlay?: { open?: (id: string) => void } }).HSOverlay;
    const HSStaticMethods = (window as unknown as { HSStaticMethods?: { autoInit?: () => void } }).HSStaticMethods;
    HSStaticMethods?.autoInit?.();
    HSOverlay?.open?.(`#${APPLICANT_FIT_INFO_PANEL_ID}`);
  }, 50);
}

/**
 * Column header: Success or Culture + AI pill + info control that opens the drawer.
 * @param props.kind Which applications-table AI column this header belongs to
 */
export function ApplicantFitColumnHeader({ kind }: { kind: "success" | "culture" }) {
  const label = kind === "success" ? "Success" : "Culture";
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span>{label}</span>
      <span className="inline-flex items-center rounded border border-primary/30 bg-primary/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
        AI
      </span>
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label={`How ${label} is calculated with AI`}
        title={`How AI calculates ${label}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openApplicantFitInfo();
        }}
      >
        <i className="ri-information-line text-sm" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Right-side drawer explaining Success % and Culture from JD + resume/profile fields.
 */
export function ApplicantFitInfoDrawer() {
  return (
    <div
      id={APPLICANT_FIT_INFO_PANEL_ID}
      className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !w-full sm:!max-w-[28rem] flex h-full min-h-0 flex-col overflow-hidden"
      tabIndex={-1}
      role="dialog"
      aria-labelledby="applicant-fit-info-title"
    >
      <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5 shrink-0">
        <h6
          id="applicant-fit-info-title"
          className="ti-offcanvas-title text-base font-semibold flex items-center gap-2"
        >
          <i className="ri-sparkling-2-line text-primary text-base" aria-hidden />
          Success & Culture
        </h6>
        <button
          type="button"
          className="ti-btn flex-shrink-0 p-1 transition-none text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-white/50 dark:hover:text-white/80 dark:hover:bg-black/40 rounded-md"
          data-hs-overlay={`#${APPLICANT_FIT_INFO_PANEL_ID}`}
          aria-label="Close Success and Culture explainer"
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
                Neither column is typed in by a recruiter. Each row is scored from this job’s JD
                plus the applicant’s resume skills and profile, then an AI model writes the % /
                culture label and the hover rationale. Names, emails, and phones are never sent.
              </p>
            </div>
          </div>
        </div>

        <section aria-labelledby="applicant-fit-fields-heading">
          <h3
            id="applicant-fit-fields-heading"
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

        <section aria-labelledby="applicant-fit-how-heading">
          <h3
            id="applicant-fit-how-heading"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-defaulttextcolor/60"
          >
            How each column is scored
          </h3>
          <ul className="space-y-2">
            <li className="rounded-lg border border-defaultborder/70 bg-white p-2.5 dark:border-white/10 dark:bg-black/20">
              <p className="text-sm font-medium text-gray-800 dark:text-white">Success %</p>
              <p className="mt-0.5 text-xs leading-snug text-defaulttextcolor/75">
                First a skill-overlap score (required job skills vs resume skills). AI then adjusts
                that % using the JD and profile, staying close to the skill match. 0% means no
                stored skills matched the job’s required tags.
              </p>
            </li>
            <li className="rounded-lg border border-defaultborder/70 bg-white p-2.5 dark:border-white/10 dark:bg-black/20">
              <p className="text-sm font-medium text-gray-800 dark:text-white">Culture</p>
              <p className="mt-0.5 text-xs leading-snug text-defaulttextcolor/75">
                AI-only. Fit / Not a fit / Unclear from JD culture language vs bio, experience
                roles, and cover letter. Shows a dash until the AI overlay lands.
              </p>
            </li>
          </ul>
        </section>

        <section aria-labelledby="applicant-fit-read-heading" className="pb-10">
          <h3
            id="applicant-fit-read-heading"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-defaulttextcolor/60"
          >
            How to read a cell
          </h3>
          <ul className="space-y-1.5 text-xs leading-relaxed text-defaulttextcolor/80">
            <li>
              <span className="font-medium text-gray-800 dark:text-white">80%+ / 60%+ / 40%+</span>
              {" — "}Strong / Good / Partial skill fit. Below 40% is Poor.
            </li>
            <li>
              <span className="font-medium text-gray-800 dark:text-white">Fit · Not a fit · Unclear</span>
              {" — "}culture call from the JD, not a second skill score.
            </li>
            <li>Hover the badge for the AI rationale (what drove that row).</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
