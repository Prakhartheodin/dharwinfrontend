/**
 * Display rules for training attendance calendars (align with backend caps).
 * Backend: ATTENDANCE_MAX_SESSION_HOURS, ATTENDANCE_MAX_HOURS_PER_CALENDAR_DAY (default 24).
 */

/** One punch session — cap at 12h (prevents forgotten punch-out from showing 17h+). */
export const MAX_ATTENDANCE_MS_PER_SESSION = 12 * 60 * 60 * 1000;

/** Sum of all punch sessions on one calendar day — cap at 14h (generous for multi-session days). */
export const MAX_ATTENDANCE_MS_PER_CALENDAR_DAY = 14 * 60 * 60 * 1000;

export function capSessionMs(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(ms, MAX_ATTENDANCE_MS_PER_SESSION);
}

export function capDayTotalMs(totalMs: number): number {
  if (!Number.isFinite(totalMs) || totalMs <= 0) return 0;
  return Math.min(totalMs, MAX_ATTENDANCE_MS_PER_CALENDAR_DAY);
}

/** Punched duration on Holiday/Leave rows should not add to "worked" hours for that day. */
export function countsTowardWorkedMs(status?: string): boolean {
  return status !== "Holiday" && status !== "Leave";
}

export type AttendanceRecordLike = {
  duration?: number | string | null;
  punchIn?: string | null;
  punchOut?: string | null;
  status?: string | null;
};

/**
 * Ms for one row for display/aggregation (cached API may omit server clamp).
 */
export function sessionDurationMsForDisplay(r: AttendanceRecordLike): number {
  const d = r.duration as unknown;
  const raw = d != null && d !== "" ? Number(d) : NaN;
  const stored = Number.isFinite(raw) && raw > 0 ? raw : null;
  let ms: number | null = stored;
  if ((ms == null || ms <= 0) && r.punchIn && r.punchOut) {
    const a = new Date(r.punchIn).getTime();
    const b = new Date(r.punchOut).getTime();
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) ms = b - a;
  }
  if (ms == null || ms <= 0 || !Number.isFinite(ms)) return 0;
  return capSessionMs(ms);
}
