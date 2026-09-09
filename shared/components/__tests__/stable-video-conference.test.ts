import { describe, expect, it } from "vitest";
import {
  formatBadgeCount,
  getBadgeSizeClasses,
} from "../../lib/format-badge-count";
import {
  MEETING_CHAT_BUTTON_SLOT_ID,
  MEETING_CHAT_UNREAD_BADGE_THRESHOLD,
  MEETING_CONTROL_BAR_CONTROLS,
} from "../livekit/stable-video-conference";

describe("StableVideoConference meeting chat", () => {
  it("uses an injected chat slot instead of ControlBar chat prop", () => {
    expect(MEETING_CONTROL_BAR_CONTROLS.chat).toBe(false);
    expect(MEETING_CHAT_BUTTON_SLOT_ID).toBe("chat-button-slot");
  });

  it("shows the count badge from a single unread message", () => {
    expect(MEETING_CHAT_UNREAD_BADGE_THRESHOLD).toBe(1);
    expect(formatBadgeCount(1)).toBe("1");
  });

  it("uses compact badge sizing aligned with the header bell", () => {
    expect(getBadgeSizeClasses(formatBadgeCount(1))).toContain("rounded-full");
    expect(getBadgeSizeClasses(formatBadgeCount(12))).toContain("min-w-[18px]");
  });
});
