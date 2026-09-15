import { describe, expect, it } from "vitest";
import { msToTime, speakerLabel } from "@/shared/components/meeting/TranscriptView";
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
});
