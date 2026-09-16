/**
 * How full a job's openings are, for display only. The backend guard in job.service.js is the
 * enforcement; this just makes the state legible before anyone tries to hire.
 *
 * A job with no declared `vacancies` is uncapped (older postings predate the field), so it renders
 * as a bare count with no denominator and no warning.
 */
/** Upper bound, mirroring the Joi cap on the job routes so the form explains it instead of 400ing. */
const MAX_VACANCIES = 10000;

export type VacanciesValidation = { ok: true; value: number } | { ok: false; message: string };

/**
 * Validate the Vacancies field on the create and edit job forms. One rule, both forms.
 *
 * Vacancies is required: a blank field used to fall through as `undefined` and save, which is how
 * jobs ended up with no declared count and therefore no hiring cap at all.
 *
 * The zero/negative message names the alternative rather than just refusing. "0 openings" reads
 * like a way to pause hiring, but capacity is not that switch — a job stops accepting people by
 * moving to Closed. Saying so is the difference between a rule and a dead end.
 */
export function validateVacanciesInput(raw: string | number | null | undefined): VacanciesValidation {
  const text = typeof raw === "string" ? raw.trim() : raw == null ? "" : String(raw);
  if (!text) {
    return {
      ok: false,
      message:
        "Enter how many people you are hiring for this role. Vacancies is required, and must be at least 1.",
    };
  }
  const value = Number(text);
  if (!Number.isInteger(value) || value < 1) {
    return {
      ok: false,
      message:
        "Vacancies must be a whole number of 1 or more. To stop hiring for this role, set the job's status to Closed instead.",
    };
  }
  if (value > MAX_VACANCIES) {
    return { ok: false, message: `Vacancies must be ${MAX_VACANCIES.toLocaleString()} or fewer.` };
  }
  return { ok: true, value };
}

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
