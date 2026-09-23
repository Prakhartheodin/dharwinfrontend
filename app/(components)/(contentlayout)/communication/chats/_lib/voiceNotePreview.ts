/**
 * Voice-note preview pipeline helpers.
 * Stop must NOT upload; Send uploads exactly once; Discard drops the blob.
 */

export type VoiceNotePhase = "idle" | "recording" | "preview" | "sending";

export type VoiceNotePreview = {
  blob: Blob;
  objectUrl: string;
  mime: string;
  durationMs: number;
};

/** Minimum blob size before a recording is considered sendable (matches page.tsx). */
export const VOICE_NOTE_MIN_BYTES = 1000;

/** Stop holds the blob for preview — it must never trigger upload by itself. */
export function shouldUploadOnVoiceStop(): false {
  return false;
}

export function formatVoiceElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function canSendVoicePreview(args: {
  phase: VoiceNotePhase;
  blob: Blob | null | undefined;
  sending: boolean;
}): boolean {
  if (args.sending || args.phase !== "preview") return false;
  const size = args.blob?.size ?? 0;
  return size >= VOICE_NOTE_MIN_BYTES;
}

export function createVoicePreviewFromBlob(
  blob: Blob,
  mime: string,
  durationMs: number,
  createObjectUrl: (b: Blob) => string = (b) => URL.createObjectURL(b)
): VoiceNotePreview | null {
  if (!blob || blob.size < VOICE_NOTE_MIN_BYTES) return null;
  return {
    blob,
    objectUrl: createObjectUrl(blob),
    mime: mime || blob.type || "audio/webm",
    durationMs: Math.max(0, durationMs),
  };
}

export function revokeVoicePreviewUrl(
  objectUrl: string | null | undefined,
  revoke: (url: string) => void = (u) => URL.revokeObjectURL(u)
): void {
  if (objectUrl) revoke(objectUrl);
}
