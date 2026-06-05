/**
 * Pure reconciliation between the 5s recording-status poll and the button's
 * optimistic local state. Extracted from recording-button.tsx so the flicker /
 * timer-reset edge cases are unit-testable without a DOM.
 *
 * Two backend realities this must absorb without flipping the UI:
 *   1. The PUBLIC status endpoint returns only `{ isRecording }` — no `recordings[]`.
 *      So the timer anchor can only come from local state on that path.
 *   2. Backend reports `isRecording` from EGRESS_ACTIVE only. During EGRESS_STARTING
 *      (and on transient egress errors, where the public endpoint degrades to false)
 *      it briefly reports false even though the host just started recording.
 */

/** Egress startup can take this long to reach EGRESS_ACTIVE — ignore backend "false" until then. */
export const START_GRACE_MS = 20000;
/** Require this many consecutive backend "not recording" polls before flipping the button off. */
export const STOP_CONFIRM_POLLS = 2;

/** Parse API / LiveKit startedAt to epoch ms (handles ns bigint-as-string, ISO, ms). */
export function parseRecordingStartedAtMs(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1e15 ? Math.floor(raw / 1e6) : Math.floor(raw);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (/^\d+$/.test(s)) {
      if (s.length > 15) {
        try {
          return Number(BigInt(s) / 1000000n);
        } catch {
          return null;
        }
      }
      const ms = Number(s);
      return Number.isFinite(ms) ? Math.floor(ms) : null;
    }
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export interface RecordingStatusLike {
  isRecording: boolean;
  recordings?: Array<{ egressId: string; startedAt?: string | null }>;
}

export interface RecordingUiState {
  isRecording: boolean;
  egressId: string | null;
  /** Timer anchor in epoch ms; null when not recording. */
  startTime: number | null;
  /** Consecutive polls that reported not-recording while we believed we were. */
  missCount: number;
}

export const IDLE_RECORDING_STATE: RecordingUiState = {
  isRecording: false,
  egressId: null,
  startTime: null,
  missCount: 0,
};

/**
 * Decide next UI state from previous state + one poll response.
 * Never contradicts the user's optimistic start during the egress-startup grace
 * window, and never drops the timer anchor while we still believe we're recording.
 */
export function reconcileRecordingState(
  prev: RecordingUiState,
  data: RecordingStatusLike,
  now: number
): RecordingUiState {
  const recs = data.recordings;

  // Authenticated path: full detail available — trust it and refresh the anchor.
  if (recs && recs.length > 0) {
    const startedMs = parseRecordingStartedAtMs(recs[0].startedAt);
    const anchor =
      startedMs != null && Number.isFinite(startedMs)
        ? startedMs
        : prev.startTime ?? now;
    return { isRecording: true, egressId: recs[0].egressId, startTime: anchor, missCount: 0 };
  }

  // Public path: recording is on but no detail — keep the local anchor so the timer runs.
  if (data.isRecording) {
    return {
      isRecording: true,
      egressId: prev.egressId,
      startTime: prev.startTime ?? now,
      missCount: 0,
    };
  }

  // Backend reports not-recording with no listed egress.
  // If we never thought we were recording, stay idle.
  if (!prev.isRecording) return IDLE_RECORDING_STATE;

  // We believe we ARE recording — guard against transient false (startup / flaky poll).
  const withinGrace = prev.startTime != null && now - prev.startTime < START_GRACE_MS;
  const misses = prev.missCount + 1;
  if (withinGrace || misses < STOP_CONFIRM_POLLS) {
    return { ...prev, missCount: misses };
  }

  // Confirmed stopped (grace passed AND enough consecutive misses).
  return IDLE_RECORDING_STATE;
}
