import type { Holiday } from "@/shared/lib/api/holidays";
import { getUtcCalendarDateKey, uniqueSortedUtcCalendarDates } from "@/shared/lib/attendance-display";

export const DEFAULT_WEEK_OFF = ["Saturday", "Sunday"] as const;

/** Inclusive calendar days between YYYY-MM-DD bounds. Null if either date is invalid. */
export function inclusiveCalendarSpanDays(fromYmd: string, toYmd: string): number | null {
  const from = parseYmdLocal(fromYmd);
  const to = parseYmdLocal(toYmd);
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

export function addCalendarDaysYmd(ymd: string, days: number): string | null {
  const date = parseYmdLocal(ymd);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return formatYmdLocal(date);
}

/** Union of per-person week-off weekday names. Empty list → Sat/Sun (same as isWeekOffDayLocal). */
export function unionWeekOffDayNames(lists: Array<readonly string[] | undefined | null>): string[] {
  const names = new Set<string>();
  if (lists.length === 0) {
    for (const d of DEFAULT_WEEK_OFF) names.add(d);
    return [...names];
  }
  for (const list of lists) {
    const effective = list && list.length > 0 ? list : DEFAULT_WEEK_OFF;
    for (const d of effective) names.add(d);
  }
  return [...names];
}

export function parseYmdLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatYmdLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Expand active holidays (including multi-day endDate spans) into YYYY-MM-DD keys. */
export function buildHolidayDateKeySet(holidays: Holiday[]): Set<string> {
  const keys = new Set<string>();
  for (const holiday of holidays) {
    if (holiday.isActive === false) continue;
    const startKey = getUtcCalendarDateKey(holiday.date);
    if (!startKey) continue;
    const endKey = getUtcCalendarDateKey(holiday.endDate ?? holiday.date) || startKey;
    const start = parseYmdLocal(startKey);
    const end = parseYmdLocal(endKey);
    if (!start || !end) {
      keys.add(startKey);
      continue;
    }
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    while (cursor <= endDate) {
      keys.add(formatYmdLocal(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return keys;
}

export function getDayNameLocal(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function isWeekOffDayLocal(date: Date, weekOffDayNames: string[]): boolean {
  const dayName = getDayNameLocal(date);
  const effective = weekOffDayNames.length > 0 ? weekOffDayNames : DEFAULT_WEEK_OFF;
  return effective.includes(dayName);
}

export type ExpandLeaveDatesResult = {
  dates: string[];
  excludedWeekOff: number;
  excludedHoliday: number;
};

/**
 * Expand an inclusive local date range into leave dates, skipping week-offs and holidays.
 */
export function expandLeaveDatesInRange(
  fromYmd: string,
  toYmd: string,
  options: {
    weekOffDayNames?: string[];
    holidayDateKeys?: Set<string>;
  } = {}
): ExpandLeaveDatesResult {
  const from = parseYmdLocal(fromYmd);
  const to = parseYmdLocal(toYmd);
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { dates: [], excludedWeekOff: 0, excludedHoliday: 0 };
  }

  const holidayKeys = options.holidayDateKeys ?? new Set<string>();
  const weekOffSet = new Set(
    options.weekOffDayNames?.length ? options.weekOffDayNames : DEFAULT_WEEK_OFF
  );

  const dates: string[] = [];
  let excludedWeekOff = 0;
  let excludedHoliday = 0;

  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = formatYmdLocal(cursor);
    if (weekOffSet.has(getDayNameLocal(cursor))) {
      excludedWeekOff += 1;
    } else if (holidayKeys.has(key)) {
      excludedHoliday += 1;
    } else {
      dates.push(key);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { dates, excludedWeekOff, excludedHoliday };
}

const EN_DASH = "\u2013";

/** Card preview: first N calendar-continuous runs, then “+N more dates”. */
export const LEAVE_DATE_RUNS_CARD_PREVIEW = 3;

export type LeaveDateRun = { start: string; end: string; days: string[] };

/**
 * Group unique YYYY-MM-DD keys into calendar-continuous runs (+1 calendar day).
 * Week-off/holiday gaps in stored dates stay as separate runs (Fri+Mon is not a range).
 */
export function groupLeaveDateRuns(dates: string[]): LeaveDateRun[] {
  const keys = uniqueSortedUtcCalendarDates(dates);
  const runs: LeaveDateRun[] = [];
  for (const key of keys) {
    const last = runs[runs.length - 1];
    if (last && addCalendarDaysYmd(last.end, 1) === key) {
      last.end = key;
      last.days.push(key);
    } else {
      runs.push({ start: key, end: key, days: [key] });
    }
  }
  return runs;
}

function utcMonthDayYear(ymd: string): { month: string; day: number; year: number } | null {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const month = d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short" });
    return { month, day: d.getUTCDate(), year: d.getUTCFullYear() };
  } catch {
    return null;
  }
}

function formatLeaveDateRun(start: string, end: string, includeYear: boolean): string {
  const a = utcMonthDayYear(start);
  const b = utcMonthDayYear(end);
  if (!a || !b) return start === end ? start : `${start} ${EN_DASH} ${end}`;

  if (start === end) {
    return includeYear ? `${a.month} ${a.day}, ${a.year}` : `${a.month} ${a.day}`;
  }
  if (a.year !== b.year) {
    return `${a.month} ${a.day}, ${a.year} ${EN_DASH} ${b.month} ${b.day}, ${b.year}`;
  }
  const yearSuffix = includeYear ? `, ${a.year}` : "";
  if (a.month === b.month) {
    return `${a.month} ${a.day}${EN_DASH}${b.day}${yearSuffix}`;
  }
  return `${a.month} ${a.day} ${EN_DASH} ${b.month} ${b.day}${yearSuffix}`;
}

/** Compact leave dates: `Aug 10–14, 2026` / `Aug 10, Aug 12, 2026` / `Aug 28 – Sep 2, 2026`. */
export function formatLeaveDateRuns(dates: string[]): string {
  const runs = groupLeaveDateRuns(dates);
  if (runs.length === 0) return "—";

  const years = new Set<number>();
  for (const run of runs) {
    for (const day of run.days) {
      const parts = utcMonthDayYear(day);
      if (parts) years.add(parts.year);
    }
  }
  const allSameYear = years.size === 1;
  const joined = runs.map((run) => formatLeaveDateRun(run.start, run.end, !allSameYear)).join(", ");
  if (!allSameYear) return joined;
  const year = [...years][0];
  return `${joined}, ${year}`;
}

export function summarizeLeaveDateRuns(
  dates: string[],
  maxVisibleRuns = LEAVE_DATE_RUNS_CARD_PREVIEW
): { label: string; full: string; hiddenDayCount: number } {
  const full = formatLeaveDateRuns(dates);
  const runs = groupLeaveDateRuns(dates);
  if (runs.length <= maxVisibleRuns) {
    return { label: full, full, hiddenDayCount: 0 };
  }
  const visibleDays = runs.slice(0, maxVisibleRuns).flatMap((run) => run.days);
  const hiddenDayCount = runs.slice(maxVisibleRuns).reduce((n, run) => n + run.days.length, 0);
  return {
    label: `${formatLeaveDateRuns(visibleDays)}, +${hiddenDayCount} more dates`,
    full,
    hiddenDayCount,
  };
}
