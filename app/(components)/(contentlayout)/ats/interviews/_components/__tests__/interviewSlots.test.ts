import { describe, expect, it } from 'vitest';
import { to12Hour, buildDaySlots } from '../interviewSlots';

describe('to12Hour', () => {
  it('converts midnight to 12:00 AM', () => {
    expect(to12Hour('00:00')).toBe('12:00 AM');
  });
  it('converts noon to 12:00 PM', () => {
    expect(to12Hour('12:00')).toBe('12:00 PM');
  });
  it('converts an afternoon time', () => {
    expect(to12Hour('13:45')).toBe('01:45 PM');
  });
});

describe('buildDaySlots', () => {
  it('returns 48 quarter-hour slots for a half day', () => {
    const am = buildDaySlots('2026-12-31', 'Asia/Kolkata', 'AM');
    expect(am).toHaveLength(48);
    expect(am[0].value).toBe('00:00');
    expect(am[47].value).toBe('11:45');
    const pm = buildDaySlots('2026-12-31', 'Asia/Kolkata', 'PM');
    expect(pm[0].value).toBe('12:00');
    expect(pm[47].value).toBe('23:45');
  });

  it('disables slots in the past for the given date and zone', () => {
    const now = new Date('2026-05-21T12:00:00.000Z');
    const am = buildDaySlots('2026-05-21', 'UTC', 'AM', now);
    expect(am.find((s) => s.value === '00:00')?.disabled).toBe(true);
    const pm = buildDaySlots('2026-05-21', 'UTC', 'PM', now);
    expect(pm.find((s) => s.value === '23:45')?.disabled).toBe(false);
  });

  it('treats all slots as enabled when no date is given', () => {
    const slots = buildDaySlots('', 'UTC', 'AM');
    expect(slots.every((s) => !s.disabled)).toBe(true);
  });
});
