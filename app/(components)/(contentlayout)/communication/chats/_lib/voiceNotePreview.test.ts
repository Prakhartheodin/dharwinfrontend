import { describe, expect, it } from "vitest";
import {
  canSendVoicePreview,
  createVoicePreviewFromBlob,
  formatVoiceElapsed,
  revokeVoicePreviewUrl,
  shouldUploadOnVoiceStop,
  VOICE_NOTE_MIN_BYTES,
} from "./voiceNotePreview";

describe("shouldUploadOnVoiceStop", () => {
  it("never uploads on stop — preview holds the blob", () => {
    expect(shouldUploadOnVoiceStop()).toBe(false);
  });
});

describe("formatVoiceElapsed", () => {
  it("formats mm:ss", () => {
    expect(formatVoiceElapsed(0)).toBe("0:00");
    expect(formatVoiceElapsed(1500)).toBe("0:01");
    expect(formatVoiceElapsed(65_000)).toBe("1:05");
  });
});

describe("canSendVoicePreview", () => {
  it("allows send once in preview with a large enough blob", () => {
    const blob = new Blob([new Uint8Array(VOICE_NOTE_MIN_BYTES)]);
    expect(canSendVoicePreview({ phase: "preview", blob, sending: false })).toBe(true);
  });

  it("blocks send while sending, recording, idle, or too small", () => {
    const blob = new Blob([new Uint8Array(VOICE_NOTE_MIN_BYTES)]);
    expect(canSendVoicePreview({ phase: "preview", blob, sending: true })).toBe(false);
    expect(canSendVoicePreview({ phase: "recording", blob, sending: false })).toBe(false);
    expect(canSendVoicePreview({ phase: "idle", blob, sending: false })).toBe(false);
    expect(
      canSendVoicePreview({
        phase: "preview",
        blob: new Blob([new Uint8Array(10)]),
        sending: false,
      })
    ).toBe(false);
  });
});

describe("createVoicePreviewFromBlob / revokeVoicePreviewUrl", () => {
  it("creates a preview URL and discard revokes it", () => {
    const created: string[] = [];
    const revoked: string[] = [];
    const blob = new Blob([new Uint8Array(VOICE_NOTE_MIN_BYTES)], { type: "audio/webm" });
    const preview = createVoicePreviewFromBlob(blob, "audio/webm", 3200, () => {
      const url = `blob:test-${created.length}`;
      created.push(url);
      return url;
    });
    expect(preview).not.toBeNull();
    expect(preview!.objectUrl).toBe("blob:test-0");
    expect(preview!.durationMs).toBe(3200);

    revokeVoicePreviewUrl(preview!.objectUrl, (u) => revoked.push(u));
    expect(revoked).toEqual(["blob:test-0"]);
  });

  it("rejects tiny blobs (discard path — no object URL)", () => {
    const created: string[] = [];
    const preview = createVoicePreviewFromBlob(
      new Blob([new Uint8Array(10)]),
      "audio/webm",
      100,
      () => {
        created.push("x");
        return "x";
      }
    );
    expect(preview).toBeNull();
    expect(created).toEqual([]);
  });
});
