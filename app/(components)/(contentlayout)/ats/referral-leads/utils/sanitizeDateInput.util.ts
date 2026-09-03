import { formatYmdLocal, parseYmdLocal } from "@/shared/lib/leave-date-range";

/** True when value is YYYY-MM-DD with a real calendar date (4-digit year, valid month/day). */
export function isValidYmdLocal(value: string): boolean {
  const trimmed = value.trim();
  const parsed = parseYmdLocal(trimmed);
  if (!parsed || Number.isNaN(parsed.getTime())) return false;
  return formatYmdLocal(parsed) === trimmed;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Days in a 1-based month; day 0 of the next month is the last day of this one. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Explain what is wrong with a dd/mm/yyyy entry, complete or half typed, or null when
 * nothing is wrong *yet*. Each segment is judged as soon as it is complete, so "31/04"
 * is caught on the month rather than waiting for a year that cannot rescue it.
 *
 * February is the reason this is not a lookup table: 29 is valid or not depending on a
 * year that has not been typed yet, so it is allowed through until the year settles it.
 */
export function describeDmyProblem(value: string): string | null {
  const digits = value.replace(/\D+/g, "").slice(0, 8);
  if (digits.length < 2) return null;

  const day = Number(digits.slice(0, 2));
  if (day === 0) return "A day cannot be 00. Enter a day between 01 and 31.";
  if (day > 31) return `There is no day ${day}. The highest day in any month is 31.`;
  if (digits.length < 4) return null;

  const month = Number(digits.slice(2, 4));
  if (month === 0) return "A month cannot be 00. Enter a month between 01 and 12.";
  if (month > 12) return `There is no month ${month}. The highest month is 12.`;

  const name = MONTH_NAMES[month - 1];
  if (digits.length < 8) {
    // Year still unknown: judge February by its leap-year maximum so a legitimate
    // 29/02 survives long enough for the year to confirm or deny it.
    const max = daysInMonth(2024, month);
    if (day <= max) return null;
    return month === 2 ? "February has at most 29 days." : `${name} has only ${max} days.`;
  }

  const year = Number(digits.slice(4, 8));
  if (year < 1000) return "Enter a 4-digit year.";
  const max = daysInMonth(year, month);
  return day <= max ? null : `${name} ${year} has only ${max} days.`;
}

/**
 * Punctuate a partially typed date as dd/mm/yyyy, so the separator appears the moment the
 * day and then the month are complete instead of leaving the user to type it.
 * `previous` is the value before this keystroke: without it a backspace over a trailing
 * separator would be re-added immediately and the slash could never be deleted.
 */
export function maskDmyInput(raw: string, previous?: string): string {
  if (previous && previous.endsWith("/") && previous.slice(0, -1) === raw) return raw;
  const digits = raw.replace(/\D+/g, "").slice(0, 8);
  if (digits.length < 2) return digits;
  let out = `${digits.slice(0, 2)}/`;
  if (digits.length === 2) return out;
  if (digits.length < 4) return out + digits.slice(2);
  out += `${digits.slice(2, 4)}/`;
  return digits.length === 4 ? out : out + digits.slice(4);
}

/**
 * Sanitize referral-lead custom date filter values into the YYYY-MM-DD the filters store.
 * Native `<input type="date">` was abandoned here: Chromium keeps its own edit buffer
 * while focused, so ref/DOM value reverts cannot block 5+ digit years during typing.
 * Both shapes are accepted: the field displays dd/mm/yyyy, but stored values and every
 * other caller speak YYYY-MM-DD, so this must not reject its own output on a round trip.
 */
export function sanitizeReferralLeadsDateInput(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  if (isValidYmdLocal(value)) return value;
  const parts = value.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (dd.length !== 2 || mm.length !== 2 || yyyy.length !== 4) return null;
  // isValidYmdLocal re-checks that these are digits and round-trips through the
  // calendar, so 31/02, month 13 and non-numeric junk all die there.
  const ymd = `${yyyy}-${mm}-${dd}`;
  return isValidYmdLocal(ymd) ? ymd : null;
}

export const REFERRAL_LEADS_INVALID_DATE_RANGE_MESSAGE = "From date must be on or before To date";

/** True when both ends are set and From is after To. */
export function isReferralLeadsDateRangeInvalid(from: string, to: string): boolean {
  if (!from.trim() || !to.trim()) return false;
  const fromDate = parseYmdLocal(from.trim());
  const toDate = parseYmdLocal(to.trim());
  if (!fromDate || !toDate) return false;
  return fromDate.getTime() > toDate.getTime();
}

export function getReferralLeadsDateRangeError(from: string, to: string): string | null {
  return isReferralLeadsDateRangeInvalid(from, to) ? REFERRAL_LEADS_INVALID_DATE_RANGE_MESSAGE : null;
}
