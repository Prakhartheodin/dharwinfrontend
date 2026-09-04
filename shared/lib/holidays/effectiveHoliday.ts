import type { Holiday } from "@/shared/lib/api/holidays";

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function localDayOf(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return startOfLocalDay(d);
}

/** Last calendar day of the holiday (endDate inclusive, else start date). */
function holidayEndDay(holiday: Holiday): number | null {
  const start = localDayOf(holiday.date);
  if (start == null) return null;
  const end = holiday.endDate ? localDayOf(holiday.endDate) ?? start : start;
  return Math.max(start, end);
}

function holidayStartDay(holiday: Holiday): number | null {
  return localDayOf(holiday.date);
}

/**
 * Effective active = stored isActive AND the holiday has not ended yet (local calendar).
 * Uses endDate when present.
 */
export function effectiveIsActive(holiday: Holiday, refDate: Date = new Date()): boolean {
  if (!holiday.isActive) return false;
  const today = startOfLocalDay(refDate);
  const end = holidayEndDay(holiday);
  if (end == null) return false;
  return end >= today;
}

/**
 * Upcoming holidays nearest-first at top; past holidays at bottom, most-recent past first.
 */
export function sortHolidaysByRelevance(holidays: Holiday[], refDate: Date = new Date()): Holiday[] {
  const today = startOfLocalDay(refDate);

  const upcoming: Holiday[] = [];
  const past: Holiday[] = [];

  for (const h of holidays) {
    const end = holidayEndDay(h);
    if (end == null) continue;
    if (end >= today) {
      upcoming.push(h);
    } else {
      past.push(h);
    }
  }

  upcoming.sort((a, b) => (holidayStartDay(a) ?? 0) - (holidayStartDay(b) ?? 0));
  past.sort((a, b) => (holidayEndDay(b) ?? 0) - (holidayEndDay(a) ?? 0));

  return [...upcoming, ...past];
}
