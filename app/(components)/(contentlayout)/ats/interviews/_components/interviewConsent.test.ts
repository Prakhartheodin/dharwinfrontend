import { describe, expect, it } from "vitest";
import {
  candidateConsentBadge,
  latestCandidateConsent,
} from "./interviewConsent";
import type { MeetingParticipantConsent } from "@/shared/lib/api/meetings";

const base: MeetingParticipantConsent = {
  identity: "c1",
  role: "candidate",
  noticeVersion: "draft-2026-09-v1",
  recording: true,
  transcription: true,
  aiEvaluation: false,
  acceptedAt: "2026-09-01T10:00:00.000Z",
  withdrawnAt: null,
};

describe("latestCandidateConsent", () => {
  it("ignores withdrawn rows and non-candidates", () => {
    expect(
      latestCandidateConsent([
        { ...base, identity: "host", role: "interviewer" },
        { ...base, withdrawnAt: "2026-09-02T00:00:00.000Z" },
        { ...base, acceptedAt: "2026-09-03T10:00:00.000Z", recording: false },
      ])
    ).toMatchObject({ acceptedAt: "2026-09-03T10:00:00.000Z", recording: false });
  });
});

describe("candidateConsentBadge", () => {
  it("pending when no candidate consent", () => {
    expect(candidateConsentBadge([]).kind).toBe("pending");
  });

  it("recording_off when candidate declined recording", () => {
    expect(candidateConsentBadge([{ ...base, recording: false }]).kind).toBe("recording_off");
  });

  it("on_file when recording consented", () => {
    expect(candidateConsentBadge([base]).kind).toBe("on_file");
  });
});

