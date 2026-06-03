import { describe, expect, it } from 'vitest';
import {
  normalizeTimezone,
  utcInstantToWallClock,
  wallClockToUtc,
  getZoneOffsetLabel,
  formatZoneLabel,
} from '../timezone';

describe('timezone helpers', () => {
  it('normalizes legacy Asia/Calcutta to Asia/Kolkata', () => {
    expect(normalizeTimezone('Asia/Calcutta')).toBe('Asia/Kolkata');
  });

  it('round-trips wall clock through UTC for Asia/Kolkata', () => {
    const utc = wallClockToUtc('2026-05-20', '14:30', 'Asia/Kolkata');
    const wall = utcInstantToWallClock(utc, 'Asia/Kolkata');
    expect(wall).toEqual({ date: '2026-05-20', time: '14:30' });
  });

  it('renders UTC instant in the meeting zone', () => {
    const wall = utcInstantToWallClock('2026-05-20T09:00:00.000Z', 'America/New_York');
    expect(wall.date).toBe('2026-05-20');
    expect(wall.time).toMatch(/^\d{2}:\d{2}$/);
  });

  // Regression: instant-meeting bug where an IST 8:00 PM wall-clock was stored as
  // 20:00 UTC (via `${date}T${time}:00.000Z`) instead of 14:30 UTC, shifting the
  // invitation email by +05:30 to "1:30 AM next day". Must convert with the zone.
  it('stores an IST 20:00 wall-clock as 14:30 UTC, not 20:00 UTC', () => {
    const utc = wallClockToUtc('2026-06-01', '20:00', 'Asia/Kolkata').toISOString();
    expect(utc).toBe('2026-06-01T14:30:00.000Z');
    // The old append-Z behavior would have produced this wrong instant:
    expect(utc).not.toBe('2026-06-01T20:00:00.000Z');
  });
});

describe('zone offset helpers', () => {
  it('getZoneOffsetLabel returns a padded UTC offset for Asia/Kolkata', () => {
    expect(getZoneOffsetLabel('Asia/Kolkata')).toBe('UTC +05:30');
  });

  it('getZoneOffsetLabel returns UTC +00:00 for UTC', () => {
    expect(getZoneOffsetLabel('UTC')).toBe('UTC +00:00');
  });

  it('getZoneOffsetLabel normalizes the legacy Asia/Calcutta alias', () => {
    expect(getZoneOffsetLabel('Asia/Calcutta')).toBe('UTC +05:30');
  });

  it('getZoneOffsetLabel falls back to UTC +00:00 for an invalid zone', () => {
    expect(getZoneOffsetLabel('Not/AZone')).toBe('UTC +00:00');
  });

  it('formatZoneLabel combines zone name and offset', () => {
    expect(formatZoneLabel('Asia/Kolkata')).toBe('Asia/Kolkata · UTC +05:30');
  });
});
