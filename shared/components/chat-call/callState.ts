/**
 * Pure call-state helpers for the chat calling UI (GlobalIncomingCall / ChatSocketContext).
 * No React, no socket — unit-tested in __tests__/callState.test.ts.
 */

/** Caller-side overlay status. Only `calling` rings; everything else is terminal. */
export type OutgoingCallStatus = "calling" | "declined" | "cancelled" | "no_answer" | "failed";

/** Server `call:dismiss` reasons (sent to every participant's user room). */
export type CallDismissReason =
  | "accepted"
  | "declined"
  | "cancelled"
  | "no_answer"
  | "ended"
  | "answered_elsewhere";

/** Ring window for both sides. Server treats the caller's `call:cancel {reason:'timeout'}` as no_answer. */
export const RING_TIMEOUT_MS = 45 * 1000;

/** How long a terminal outgoing status stays on screen before the overlay closes itself. */
export const OUTGOING_TERMINAL_DISMISS_MS = 2600;

export function isTerminalOutgoingStatus(status: OutgoingCallStatus | null | undefined): boolean {
  return Boolean(status) && status !== "calling";
}

/**
 * What a `call:dismiss` means for the caller's overlay.
 * - a status → show that terminal state
 * - "close" → close the overlay silently
 * - "keep" → someone answered; `call:start` is on its way and closes the overlay itself
 */
export function outgoingStatusFromDismiss(
  reason: CallDismissReason | string | null | undefined
): OutgoingCallStatus | "close" | "keep" {
  switch (reason) {
    case "declined":
      return "declined";
    case "no_answer":
      return "no_answer";
    case "cancelled":
      return "cancelled";
    case "accepted":
    case "answered_elsewhere":
      return "keep";
    default:
      return "close";
  }
}

/** `call:cancelled` payload reason → caller status. The 45 s auto-timeout is a no-answer, not a cancel. */
export function outgoingStatusFromCancelled(reason: string | null | undefined): OutgoingCallStatus {
  return reason === "timeout" || reason === "no_answer" ? "no_answer" : "cancelled";
}

/**
 * Whether a popup opened for a call that has not started yet should be closed.
 * `accepted` / `answered_elsewhere` mean the call is going ahead (or this tab is not the one
 * that answered, in which case it has no pending window) — leave it alone.
 */
export function shouldClosePendingCallWindow(
  reason: CallDismissReason | OutgoingCallStatus | string | null | undefined
): boolean {
  return reason !== "accepted" && reason !== "answered_elsewhere" && reason !== "calling";
}

/** Headline + status line for the outgoing card. The status line is announced via aria-live. */
export function outgoingCallCopy(args: {
  status: OutgoingCallStatus;
  isGroup: boolean;
  isVideo: boolean;
  name: string;
  error?: string | null;
}): { headline: string; statusLine: string } {
  const { status, isGroup, isVideo, name, error } = args;
  const who = name.trim() || (isGroup ? "the group" : "contact");
  switch (status) {
    case "declined":
      return {
        headline: "Call declined",
        statusLine: isGroup ? `No one joined the ${who} call.` : `${who} declined the call.`,
      };
    case "no_answer":
      return {
        headline: "No answer",
        statusLine: isGroup ? `No one answered the ${who} call.` : `${who} didn't answer.`,
      };
    case "cancelled":
      return { headline: "Call cancelled", statusLine: "The call was cancelled." };
    case "failed":
      return {
        headline: "Call failed",
        statusLine: error?.trim() || "The call couldn't be placed. Try again.",
      };
    default:
      return {
        headline: `Calling ${who}…`,
        statusLine: isGroup
          ? `Ringing group ${isVideo ? "video" : "voice"} call…`
          : `Ringing · ${isVideo ? "Video" : "Voice"} call`,
      };
  }
}

/** Path of the LiveKit room page for a chat call. */
export function buildChatCallRoomPath(data: {
  roomName: string;
  conversationId: string;
  callId: string;
  callType: "audio" | "video";
}): string {
  const params = new URLSearchParams({ from: "chat", conv: data.conversationId, callId: data.callId });
  params.set("video", data.callType === "audio" ? "0" : "1");
  return `/meetings/room/${encodeURIComponent(data.roomName)}?${params}`;
}

/** Up to two initials for an avatar placeholder. */
export function initialsOf(name: string | null | undefined): string {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}
