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
  /** Conversation the note was RECORDED in. Send targets this, never the current selection. */
  conversationId?: string;
};

/** Minimum blob size before a recording is considered sendable (matches page.tsx). */
export const VOICE_NOTE_MIN_BYTES = 1000;

/** Hard cap on one note; the recorder auto-stops into preview at this point. */
export const VOICE_NOTE_MAX_MS = 5 * 60 * 1000;
/** Show the remaining-time hint in the last 30s before the cap. */
export const VOICE_NOTE_WARN_REMAINING_MS = 30 * 1000;

/**
 * A finished recording belongs to the conversation it started in. If the user switched chats
 * while recording, the async `onstop` must drop it rather than surface it in the new chat.
 */
export function voiceNoteBelongsTo(recordedIn: string | null | undefined, current: string | null | undefined): boolean {
  return !!recordedIn && String(recordedIn) === String(current ?? "");
}

const RECORDER_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

/** First container the browser can record, or "" to let MediaRecorder pick (Safari without mp4). */
export function pickRecorderMimeType(isTypeSupported: (mime: string) => boolean): string {
  for (const mime of RECORDER_MIME_CANDIDATES) {
    try {
      if (isTypeSupported(mime)) return mime;
    } catch {
      /* some browsers throw on unknown types */
    }
  }
  return "";
}

/** File extension matching what the recorder actually produced (recorder.mimeType, not what we asked for). */
export function voiceFileExtension(mime: string | null | undefined): string {
  const m = String(mime || "").toLowerCase();
  if (m.includes("ogg")) return ".ogg";
  if (m.includes("mp4") || m.includes("aac") || m.includes("m4a")) return ".m4a";
  return ".webm";
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
