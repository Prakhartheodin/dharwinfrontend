import { describe, expect, it } from "vitest";
import {
  buildChatCallRoomPath,
  initialsOf,
  isTerminalOutgoingStatus,
  outgoingCallCopy,
  outgoingStatusFromCancelled,
  outgoingStatusFromDismiss,
  shouldClosePendingCallWindow,
} from "../callState";

describe("outgoing ring UI state mapping", () => {
  it("only `calling` is non-terminal", () => {
    expect(isTerminalOutgoingStatus("calling")).toBe(false);
    for (const s of ["declined", "cancelled", "no_answer", "failed"] as const) {
      expect(isTerminalOutgoingStatus(s)).toBe(true);
    }
    expect(isTerminalOutgoingStatus(null)).toBe(false);
  });

  it("maps call:dismiss reasons for the caller", () => {
    expect(outgoingStatusFromDismiss("declined")).toBe("declined");
    expect(outgoingStatusFromDismiss("no_answer")).toBe("no_answer");
    expect(outgoingStatusFromDismiss("cancelled")).toBe("cancelled");
    // Someone answered — call:start closes the overlay, not the dismiss.
    expect(outgoingStatusFromDismiss("accepted")).toBe("keep");
    expect(outgoingStatusFromDismiss("answered_elsewhere")).toBe("keep");
    expect(outgoingStatusFromDismiss("ended")).toBe("close");
    expect(outgoingStatusFromDismiss("something-new")).toBe("close");
  });

  it("maps call:cancelled reasons (timeout = no answer)", () => {
    expect(outgoingStatusFromCancelled("timeout")).toBe("no_answer");
    expect(outgoingStatusFromCancelled("no_answer")).toBe("no_answer");
    expect(outgoingStatusFromCancelled(undefined)).toBe("cancelled");
    expect(outgoingStatusFromCancelled("cancelled")).toBe("cancelled");
  });

  it("closes a pending call window on every terminal reason but not when answered", () => {
    for (const r of ["declined", "cancelled", "no_answer", "ended", "failed"]) {
      expect(shouldClosePendingCallWindow(r)).toBe(true);
    }
    expect(shouldClosePendingCallWindow("accepted")).toBe(false);
    expect(shouldClosePendingCallWindow("answered_elsewhere")).toBe(false);
  });
});

describe("outgoingCallCopy", () => {
  it("ringing copy names the callee", () => {
    expect(outgoingCallCopy({ status: "calling", isGroup: false, isVideo: false, name: "Asha" })).toEqual({
      headline: "Calling Asha…",
      statusLine: "Ringing · Voice call",
    });
  });

  it("terminal copy for direct and group calls", () => {
    expect(outgoingCallCopy({ status: "declined", isGroup: false, isVideo: true, name: "Asha" }).statusLine).toBe(
      "Asha declined the call."
    );
    expect(outgoingCallCopy({ status: "no_answer", isGroup: true, isVideo: false, name: "Design" }).statusLine).toBe(
      "No one answered the Design call."
    );
    expect(outgoingCallCopy({ status: "cancelled", isGroup: false, isVideo: false, name: "Asha" }).headline).toBe(
      "Call cancelled"
    );
  });

  it("failed copy surfaces the server error, with a fallback", () => {
    expect(
      outgoingCallCopy({ status: "failed", isGroup: false, isVideo: false, name: "Asha", error: "Not a member" }).statusLine
    ).toBe("Not a member");
    expect(outgoingCallCopy({ status: "failed", isGroup: false, isVideo: false, name: "Asha" }).statusLine).toMatch(
      /couldn't be placed/
    );
  });

  it("empty name falls back to a neutral word", () => {
    expect(outgoingCallCopy({ status: "calling", isGroup: false, isVideo: false, name: "  " }).headline).toBe(
      "Calling contact…"
    );
  });
});

describe("buildChatCallRoomPath", () => {
  it("encodes the room and marks audio calls video=0", () => {
    const path = buildChatCallRoomPath({ roomName: "chat-c1-k1", conversationId: "c1", callId: "k1", callType: "audio" });
    expect(path.startsWith("/meetings/room/chat-c1-k1?")).toBe(true);
    const q = new URLSearchParams(path.split("?")[1]);
    expect(q.get("from")).toBe("chat");
    expect(q.get("conv")).toBe("c1");
    expect(q.get("callId")).toBe("k1");
    expect(q.get("video")).toBe("0");
  });

  it("video calls get video=1", () => {
    const path = buildChatCallRoomPath({ roomName: "a b", conversationId: "c1", callId: "k1", callType: "video" });
    expect(path.startsWith("/meetings/room/a%20b?")).toBe(true);
    expect(new URLSearchParams(path.split("?")[1]).get("video")).toBe("1");
  });
});

describe("initialsOf", () => {
  it("builds up to two initials", () => {
    expect(initialsOf("asha rao")).toBe("AR");
    expect(initialsOf("Asha Devi Rao")).toBe("AR");
    expect(initialsOf("Asha")).toBe("A");
    expect(initialsOf("")).toBe("?");
    expect(initialsOf(undefined)).toBe("?");
  });
});
