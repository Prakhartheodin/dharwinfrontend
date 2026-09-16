/**
 * How full a job's openings are, for display only. The backend guard in job.service.js is the
 * enforcement; this just makes the state legible before anyone tries to hire.
 *
 * A job with no declared `vacancies` is uncapped (older postings predate the field), so it renders
 * as a bare count with no denominator and no warning.
 */
export interface VacancyFill {
  /** "2 / 1" when capped, "2" when not. */
  label: string;
  /** " · 2/1 filled", appended to the job status tile. Empty when uncapped. */
  statusSuffix: string;
  overCapacity: boolean;
  /** Tailwind text colour for the count, paired light/dark like FUNNEL_TONES. */
  toneClass: string;
}

const OK_TONE = "text-emerald-600 dark:text-emerald-300";
const OVER_TONE = "text-amber-600 dark:text-amber-300";

export function describeVacancyFill(
  hiredCount: number,
  vacancies: number | null | undefined
): VacancyFill {
  const hired = Number(hiredCount) || 0;
  const cap = vacancies == null ? NaN : Number(vacancies);
  const capped = Number.isFinite(cap) && cap > 0;

  if (!capped) {
    return { label: String(hired), statusSuffix: "", overCapacity: false, toneClass: OK_TONE };
  }

  const overCapacity = hired > cap;
  return {
    label: `${hired} / ${cap}`,
    statusSuffix: ` · ${hired}/${cap} filled`,
    overCapacity,
    toneClass: overCapacity ? OVER_TONE : OK_TONE,
  };
}
