import { describe, expect, it } from "vitest";
import {
  canReadInterviewTranscript,
  canReadRecordingTranscript,
} from "../interview-access-permissions";

describe("interview-access-permissions", () => {
  it("recording transcript path accepts meetings matrix view without interview transcript grant", () => {
    expect(canReadInterviewTranscript(["communication.meetings:view"])).toBe(false);
    expect(canReadRecordingTranscript(["communication.meetings:view"])).toBe(true);
  });

  it("interview transcript grant does not imply recording transcript without meetings view", () => {
    expect(canReadInterviewTranscript(["interviews.transcript.read"])).toBe(true);
    expect(canReadRecordingTranscript(["interviews.transcript.read"])).toBe(false);
  });
});