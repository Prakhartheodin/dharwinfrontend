import { describe, expect, it } from "vitest";
import {
  isCommunicationChatRoomEntry,
  shouldShowInterviewJoinConsent,
} from "@/shared/lib/interviewRoomEntry";

describe("shouldShowInterviewJoinConsent", () => {
  it("does not show for host", () => {
    expect(
      shouldShowInterviewJoinConsent({
        isChatCall: false,
        isHost: true,
        interviewConsentComplete: false,
      })
    ).toBe(false);
  });

  it("shows for non-host participants until complete", () => {
    expect(
      shouldShowInterviewJoinConsent({
        isChatCall: false,
        isHost: false,
        interviewConsentComplete: false,
      })
    ).toBe(true);
  });

  it("hides after consent complete", () => {
    expect(
      shouldShowInterviewJoinConsent({
        isChatCall: false,
        isHost: false,
        interviewConsentComplete: true,
      })
    ).toBe(false);
  });

  it("skips chat communication rooms", () => {
    expect(
      shouldShowInterviewJoinConsent({
        isChatCall: true,
        isHost: false,
        interviewConsentComplete: false,
      })
    ).toBe(false);
  });
});

describe("isCommunicationChatRoomEntry", () => {
  it("only skips consent for chat-* rooms with from=chat", () => {
    expect(isCommunicationChatRoomEntry(true, "chat-abc")).toBe(true);
    expect(isCommunicationChatRoomEntry(true, "meeting_abc")).toBe(false);
    expect(isCommunicationChatRoomEntry(false, "chat-abc")).toBe(false);
  });
});
