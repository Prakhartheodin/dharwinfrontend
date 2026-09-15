import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TranscriptView, {
  msToTime,
  recordingTranscriptEmptyMessage,
  speakerLabel,
} from "@/shared/components/meeting/TranscriptView";
import type { TranscriptUtterance } from "@/shared/lib/api/meetings";

describe("TranscriptView helpers", () => {
  it("formats mm:ss offsets", () => {
    expect(msToTime(65000)).toBe("1:05");
    expect(msToTime(0)).toBe("0:00");
  });

  it("labels v1 utterances", () => {
    const u: TranscriptUtterance = { text: "hi", startMs: 0, endMs: 1, speakerName: "Alex" };
    expect(speakerLabel(u, 0)).toBe("Alex");
  });

  it("recordingTranscriptEmptyMessage covers pending and none", () => {
    expect(
      recordingTranscriptEmptyMessage({
        id: "r1",
        meetingId: "m1",
        status: "completed",
        aiProcessingStatus: "transcribing",
        aiProcessingError: null,
      })
    ).toMatch(/still being processed/i);
    expect(
      recordingTranscriptEmptyMessage({
        id: "r1",
        meetingId: "m1",
        status: "completed",
        aiProcessingStatus: "none",
        aiProcessingError: null,
      })
    ).toMatch(/may not have run/i);
  });

  it("shows empty recording transcript message instead of blank body", () => {
    render(
      <TranscriptView
        mode={{
          kind: "recording",
          data: {
            recording: {
              id: "r1",
              meetingId: "m1",
              status: "completed",
              aiProcessingStatus: "none",
              aiProcessingError: null,
            },
            meetingTitle: "Instant Interview",
            segments: [],
            totalSegments: 0,
            source: "v2",
          },
        }}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(/may not have run/i);
  });
});
