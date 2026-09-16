import { describe, expect, it } from "vitest";
import type { Meeting } from "@/shared/lib/api/meetings";
import { wallClockToUtc } from "@/shared/lib/timezone";
import {
  canJoinInterview,
  filterUpcomingInterviews,
  formatInterviewDateBlock,
  formatInterviewModeLabel,
  formatInterviewTime,
  resolveInterviewDetailHref,
  resolveInterviewJoinHref,
  resolveInterviewPanelState,
  sortUpcomingInterviews,
} from "@/shared/lib/dashboard/candidateInterviews";

const NOW = new Date("2026-08-18T10:00:00.000Z");
const IST = "Asia/Kolkata";

function baseMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    meetingId: "meeting_test_1",
    title: "Technical round",
    scheduledAt: "2026-08-20T11:00:00.000Z",
    timezone: IST,
    durationMinutes: 60,
    maxParticipants: 10,
    allowGuestJoin: false,
    requireApproval: false,
    hosts: [],
    emailInvites: [],
    interviewType: "Video",
    status: "scheduled",
    interviewResult: "pending",
    publicMeetingUrl: "https://example.com/join/room?room=meeting_test_1",
    ...overrides,
  };
}

describe("candidateInterviews", () => {
  it("includes one upcoming scheduled interview", () => {
    const rows = filterUpcomingInterviews([baseMeeting()], NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Technical round");
  });

  it("sorts multiple upcoming interviews chronologically", () => {
    const later = baseMeeting({
      meetingId: "meeting_later",
      scheduledAt: "2026-08-25T11:00:00.000Z",
    });
    const sooner = baseMeeting({
      meetingId: "meeting_sooner",
      scheduledAt: "2026-08-19T09:00:00.000Z",
    });
    const sorted = sortUpcomingInterviews(filterUpcomingInterviews([later, sooner], NOW));
    expect(sorted.map((m) => m.meetingId)).toEqual(["meeting_sooner", "meeting_later"]);
  });

  it("excludes past interviews", () => {
    const past = baseMeeting({
      meetingId: "meeting_past",
      scheduledAt: "2026-08-17T09:00:00.000Z",
    });
    expect(filterUpcomingInterviews([past], NOW)).toHaveLength(0);
  });

  it("excludes cancelled and completed interviews", () => {
    const cancelled = baseMeeting({ status: "cancelled" });
    const ended = baseMeeting({ status: "ended" });
    const completed = baseMeeting({ status: "completed" });
    expect(filterUpcomingInterviews([cancelled, ended, completed], NOW)).toHaveLength(0);
  });

  it("excludes rejected interview results", () => {
    const rejected = baseMeeting({ interviewResult: "rejected" });
    expect(filterUpcomingInterviews([rejected], NOW)).toHaveLength(0);
  });

  it("returns empty state when no rows qualify", () => {
    expect(filterUpcomingInterviews([], NOW)).toEqual([]);
  });

  it("builds interview detail navigation to join room", () => {
    const href = resolveInterviewDetailHref(baseMeeting(), {
      name: "Alex Candidate",
      email: "alex@example.com",
    });
    expect(href).toContain("/join/room?room=");
    expect(href).toContain("meeting_test_1");
    expect(href).toContain("name=Alex");
    expect(href).toContain("email=alex%40example.com");
  });

  it("shows awaiting confirmation when approval is required", () => {
    expect(formatInterviewModeLabel("Video", true)).toContain("Awaiting confirmation");
    expect(formatInterviewModeLabel("Video", false)).toBe("Video call");
  });

  describe("timezone-aware display", () => {
    it("shows tomorrow 12:00 PM IST as 12:00 PM, not 5:30 AM", () => {
      const scheduledAt = wallClockToUtc("2026-08-26", "12:00", IST).toISOString();
      expect(scheduledAt).toBe("2026-08-26T06:30:00.000Z");

      const time = formatInterviewTime(scheduledAt, IST, "en-US");
      expect(time).toMatch(/12:00/);
      expect(time).not.toMatch(/5:30/);
      expect(time).not.toMatch(/6:30/);

      const dateBlock = formatInterviewDateBlock(scheduledAt, IST, "en-US");
      expect(dateBlock.day).toBe("26");
      expect(dateBlock.month).toBe("AUG");
    });

    it("does not shift wall-clock time when viewer offset differs from meeting zone", () => {
      const scheduledAt = wallClockToUtc("2026-08-26", "14:30", "America/New_York").toISOString();
      const time = formatInterviewTime(scheduledAt, "America/New_York", "en-US");
      expect(time).toMatch(/2:30/);
      expect(time).not.toMatch(/5:30/);
    });
  });

  describe("join window", () => {
    const tomorrowNoonIst = wallClockToUtc("2026-08-26", "12:00", IST).toISOString();

    it("tomorrow interview is not joinable far in advance", () => {
      const now = new Date("2026-08-25T10:00:00.000Z");
      const meeting = baseMeeting({ scheduledAt: tomorrowNoonIst });
      expect(canJoinInterview(meeting, now)).toBe(false);
      expect(resolveInterviewJoinHref(meeting, { name: "Alex", email: "alex@example.com" }, now)).toBe("");
    });

    it("is joinable inside the 10-minute pre-start window", () => {
      const now = new Date("2026-08-26T06:20:00.000Z");
      const meeting = baseMeeting({ scheduledAt: tomorrowNoonIst });
      expect(canJoinInterview(meeting, now)).toBe(true);
      const href = resolveInterviewJoinHref(meeting, { name: "Alex", email: "alex@example.com" }, now);
      expect(href).toContain("meeting_test_1");
    });

    it("completed / ended meetings are not joinable", () => {
      const pastStart = "2026-08-17T09:00:00.000Z";
      const now = new Date("2026-08-17T11:00:00.000Z");
      const meeting = baseMeeting({ scheduledAt: pastStart, durationMinutes: 30 });
      expect(canJoinInterview(meeting, now)).toBe(false);
      expect(resolveInterviewJoinHref(meeting, undefined, now)).toBe("");
    });

    it("meeting URL exists but outside window is still not joinable", () => {
      const now = new Date("2026-08-25T06:00:00.000Z");
      const meeting = baseMeeting({
        scheduledAt: tomorrowNoonIst,
        publicMeetingUrl: "https://example.com/join/room?room=meeting_test_1",
      });
      expect(resolveInterviewDetailHref(meeting)).toContain("meeting_test_1");
      expect(canJoinInterview(meeting, now)).toBe(false);
      expect(resolveInterviewJoinHref(meeting, undefined, now)).toBe("");
    });
  });

  describe("resolveInterviewPanelState", () => {
    it("returns no_schedule when interviews array is empty", () => {
      expect(resolveInterviewPanelState([], NOW).kind).toBe("no_schedule");
    });

    it("returns link_pending when scheduled but no meeting URL", () => {
      const state = resolveInterviewPanelState(
        [baseMeeting({ publicMeetingUrl: "", meetingId: "" })],
        NOW,
      );
      expect(state.kind).toBe("link_pending");
    });

    it("returns missed after the meeting window ends", () => {
      const past = baseMeeting({
        scheduledAt: "2026-08-17T09:00:00.000Z",
        durationMinutes: 30,
        status: "scheduled",
      });
      const state = resolveInterviewPanelState([past], new Date("2026-08-17T11:00:00.000Z"));
      expect(state.kind).toBe("missed");
    });

    it("returns cancelled for cancelled meetings", () => {
      const state = resolveInterviewPanelState(
        [baseMeeting({ status: "cancelled" })],
        NOW,
      );
      expect(state.kind).toBe("cancelled");
    });
  });
});
