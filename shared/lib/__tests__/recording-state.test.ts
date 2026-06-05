import { describe, it, expect } from "vitest";
import {
  reconcileRecordingState,
  IDLE_RECORDING_STATE,
  START_GRACE_MS,
  STOP_CONFIRM_POLLS,
  type RecordingUiState,
} from "../../components/livekit/recording-state";

const T0 = 1_700_000_000_000;
const recording = (overrides: Partial<RecordingUiState> = {}): RecordingUiState => ({
  isRecording: true,
  egressId: "EG_abc",
  startTime: T0,
  missCount: 0,
  ...overrides,
});

describe("reconcileRecordingState", () => {
  // Bug 1: "keeps starting and stopping itself" — egress still EGRESS_STARTING,
  // backend reports isRecording=false right after the host clicked start.
  it("ignores a transient backend false during the startup grace window", () => {
    const prev = recording();
    const next = reconcileRecordingState(prev, { isRecording: false }, T0 + 3000);
    expect(next.isRecording).toBe(true); // button must NOT flip to "Record"
    expect(next.startTime).toBe(T0);
    expect(next.missCount).toBe(1);
  });

  // Bug 2: public status endpoint omits recordings[] — timer anchor must survive.
  it("keeps the local timer anchor on the public path (isRecording, no recordings[])", () => {
    const prev = recording({ startTime: T0 });
    const next = reconcileRecordingState(prev, { isRecording: true }, T0 + 5000);
    expect(next.isRecording).toBe(true);
    expect(next.startTime).toBe(T0); // NOT nulled → timer keeps counting
  });

  it("seeds an anchor from `now` if public path reports recording before one exists", () => {
    const prev: RecordingUiState = { ...IDLE_RECORDING_STATE, isRecording: true };
    const next = reconcileRecordingState(prev, { isRecording: true }, T0);
    expect(next.startTime).toBe(T0);
  });

  it("uses the backend startedAt when recordings[] is present (authenticated path)", () => {
    const prev = recording({ startTime: null, egressId: null });
    const started = new Date(T0).toISOString();
    const next = reconcileRecordingState(
      prev,
      { isRecording: true, recordings: [{ egressId: "EG_xyz", startedAt: started }] },
      T0 + 9000
    );
    expect(next.egressId).toBe("EG_xyz");
    expect(next.startTime).toBe(T0);
    expect(next.missCount).toBe(0);
  });

  it("falls back to prev anchor when recordings[] has an unparseable startedAt", () => {
    const prev = recording({ startTime: T0 });
    const next = reconcileRecordingState(
      prev,
      { isRecording: true, recordings: [{ egressId: "EG_xyz", startedAt: "not-a-date" }] },
      T0 + 1000
    );
    expect(next.startTime).toBe(T0);
  });

  it("does not resurrect recording when we never started (idle stays idle)", () => {
    const next = reconcileRecordingState(IDLE_RECORDING_STATE, { isRecording: false }, T0);
    expect(next).toEqual(IDLE_RECORDING_STATE);
  });

  it("confirms a real stop only after grace passed AND enough consecutive misses", () => {
    const afterGrace = T0 + START_GRACE_MS + 1000;
    let state = recording({ missCount: STOP_CONFIRM_POLLS - 1 });
    state = reconcileRecordingState(state, { isRecording: false }, afterGrace);
    expect(state.isRecording).toBe(false);
    expect(state).toEqual(IDLE_RECORDING_STATE);
  });

  it("a single post-grace miss is not enough to flip off (debounce flaky poll)", () => {
    const afterGrace = T0 + START_GRACE_MS + 1000;
    const next = reconcileRecordingState(recording({ missCount: 0 }), { isRecording: false }, afterGrace);
    expect(next.isRecording).toBe(true);
    expect(next.missCount).toBe(1);
  });
});
