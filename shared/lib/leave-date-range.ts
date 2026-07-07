import type { Holiday } from "@/shared/lib/api/holidays";
import { getUtcCalendarDateKey } from "@/shared/lib/attendance-display";

const DEFAULT_WEEK_OFF = ["Saturday", "Sunday"] as const;

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
  const effective = weekOffDayNames.length > 0 ? weekOffDayNames : [...DEFAULT_WEEK_OFF];
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
    isWeekOff?: (date: Date) => boolean;
  } = {}
): ExpandLeaveDatesResult {
  const from = parseYmdLocal(fromYmd);
  const to = parseYmdLocal(toYmd);
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { dates: [], excludedWeekOff: 0, excludedHoliday: 0 };
  }

  const holidayKeys = options.holidayDateKeys ?? new Set<string>();
  const weekOffNames = options.weekOffDayNames ?? [];
  const isWeekOff =
    options.isWeekOff ??
    ((date: Date) => isWeekOffDayLocal(date, weekOffNames));

  const dates: string[] = [];
  let excludedWeekOff = 0;
  let excludedHoliday = 0;

  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = formatYmdLocal(cursor);
    if (isWeekOff(cursor)) {
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
