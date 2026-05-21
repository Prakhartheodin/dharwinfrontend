import { wallClockToUtc } from '@/shared/lib/timezone';

export interface TimeSlot {
  /** "HH:mm" 24-hour wall-clock value (the form value). */
  value: string;
  /** "hh:mm AM/PM" display label. */
  label: string;
  /** True when this slot is in the past for the given date + zone. */
  disabled: boolean;
}

/** Convert an "HH:mm" 24-hour string to a "hh:mm AM/PM" label. */
export function to12Hour(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${mStr} ${period}`;
}

/**
 * Build the 15-minute slots for one half-day.
 * @param dateStr wall-clock date "yyyy-MM-dd" in `tz`, or "" when no date chosen
 * @param tz IANA timezone
 * @param period 'AM' (00:00–11:45) or 'PM' (12:00–23:45)
 * @param now reference instant for past-slot detection (default: real now)
 */
export function buildDaySlots(
  dateStr: string,
  tz: string,
  period: 'AM' | 'PM',
  now: Date = new Date()
): TimeSlot[] {
  const startHour = period === 'AM' ? 0 : 12;
  const slots: TimeSlot[] = [];
  for (let h = startHour; h < startHour + 12; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      let disabled = false;
      if (dateStr) {
        const instant = wallClockToUtc(dateStr, value, tz);
        disabled = instant.getTime() <= now.getTime();
      }
      slots.push({ value, label: to12Hour(value), disabled });
    }
  }
  return slots;
}
