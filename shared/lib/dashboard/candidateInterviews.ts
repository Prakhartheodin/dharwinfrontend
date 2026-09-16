import type { Meeting } from "@/shared/lib/api/meetings";
import {
  canJoinMeeting,
  meetingEndsAtMs,
} from "@/shared/lib/dashboard/employeeDashboard";

/** Join window opens this many minutes before scheduledAt (must match canJoinMeeting). */
export const MEETING_JOIN_LEAD_MINUTES = 10;
export const MEETING_JOIN_LEAD_MS = MEETING_JOIN_LEAD_MINUTES * 60 * 1000;
import {
  appendJoinIdentityToUrl,
  resolveMeetingShareUrl,
} from "@/shared/lib/join-room-url";
import { normalizeTimezone } from "@/shared/lib/timezone";

const TERMINAL_STATUSES = new Set(["ended", "completed", "cancelled"]);

export type CandidateInterviewRow = Meeting & {
  jobTitle?: string;
  companyName?: string;
};

export type CandidateInterviewMeeting = Pick<
  Meeting,
  | "scheduledAt"
  | "durationMinutes"
  | "timezone"
  | "status"
  | "meetingId"
  | "publicMeetingUrl"
  | "interviewType"
  | "requireApproval"
  | "round"
  | "interviewCompletedAt"
  | "notes"
  | "title"
  | "interviewResult"
> & { id?: string };

export type InterviewPanelState =
  | { kind: "no_schedule" }
  | { kind: "cancelled"; meeting: CandidateInterviewMeeting }
  | { kind: "link_pending"; meeting: CandidateInterviewMeeting }
  | { kind: "scheduled"; meeting: CandidateInterviewMeeting; joinHref?: string }
  | { kind: "live"; meeting: CandidateInterviewMeeting; joinHref: string }
  | { kind: "completed"; meeting: CandidateInterviewMeeting }
  | { kind: "missed"; meeting: CandidateInterviewMeeting };

function pickPrimaryInterview(meetings: CandidateInterviewMeeting[]): CandidateInterviewMeeting | null {
  if (!meetings.length) return null;
  const nonCancelled = meetings.filter((m) => (m.status || "").toLowerCase() !== "cancelled");
  const pool = nonCancelled.length ? nonCancelled : meetings;
  return [...pool].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  )[0];
}

/** Derive panel UI state for the primary interview on an application. */
export function resolveInterviewPanelState(
  meetings: CandidateInterviewMeeting[] | null | undefined,
  now: Date = new Date(),
  user?: { name?: string | null; email?: string | null } | null,
): InterviewPanelState {
  const primary = pickPrimaryInterview(meetings || []);
  if (!primary) return { kind: "no_schedule" };

  const status = (primary.status || "").toLowerCase();
  if (status === "cancelled") return { kind: "cancelled", meeting: primary };

  const start = new Date(primary.scheduledAt).getTime();
  const end = meetingEndsAtMs(primary.scheduledAt, primary.durationMinutes);
  const t = now.getTime();
  const hasUrl = Boolean(primary.publicMeetingUrl?.trim() || primary.meetingId?.trim());

  if (status === "ended" || primary.interviewCompletedAt) {
    return { kind: "completed", meeting: primary };
  }

  if (!Number.isNaN(end) && t > end) {
    return { kind: "missed", meeting: primary };
  }

  const row = primary as CandidateInterviewRow;
  const joinHref = resolveInterviewJoinHref(row, user, now);
  const inLiveWindow = !Number.isNaN(start) && !Number.isNaN(end) && t >= start && t <= end;

  if (inLiveWindow) {
    if (!hasUrl) return { kind: "link_pending", meeting: primary };
    return { kind: "live", meeting: primary, joinHref: joinHref || "" };
  }

  if (!hasUrl) return { kind: "link_pending", meeting: primary };

  if (canJoinInterview(primary, now) && joinHref) {
    return { kind: "scheduled", meeting: primary, joinHref };
  }

  return { kind: "scheduled", meeting: primary };
}

/** Exclude completed, cancelled, rejected, and meetings whose window has ended. */
export function filterUpcomingInterviews(
  meetings: CandidateInterviewRow[],
  now: Date = new Date(),
): CandidateInterviewRow[] {
  const nowMs = now.getTime();
  return meetings.filter((m) => {
    const status = (m.status || "").toLowerCase();
    if (TERMINAL_STATUSES.has(status)) return false;
    if (m.interviewResult === "rejected") return false;
    const end = meetingEndsAtMs(m.scheduledAt, m.durationMinutes);
    if (Number.isNaN(end) || end < nowMs) return false;
    return status === "scheduled" || status === "in progress" || status === "inprogress";
  });
}

/** Nearest upcoming first. */
export function sortUpcomingInterviews(meetings: CandidateInterviewRow[]): CandidateInterviewRow[] {
  return [...meetings].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
}

/** Format date parts in the meeting's IANA zone (matches ATS Interviews table). */
export function formatInterviewDateBlock(
  iso: string,
  timezone?: string | null,
  locale = "en-US",
): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "—", day: "—" };
  const tz = normalizeTimezone(timezone || "UTC");
  return {
    month: d.toLocaleDateString(locale, { month: "short", timeZone: tz }).toUpperCase(),
    day: d.toLocaleDateString(locale, { day: "numeric", timeZone: tz }),
  };
}

/** Format wall-clock time in the meeting's IANA zone — not the viewer's local offset. */
export function formatInterviewTime(
  iso: string,
  timezone?: string | null,
  locale = "en-US",
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const tz = normalizeTimezone(timezone || "UTC");
  return d.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

export function formatInterviewModeLabel(
  interviewType?: string,
  requireApproval?: boolean,
): string {
  const type = (interviewType || "Video").trim();
  const mode =
    type === "In-Person"
      ? "In person"
      : type === "Phone"
        ? "Phone call"
        : "Video call";
  if (requireApproval) return `${mode} · Awaiting confirmation`;
  return mode;
}

export function resolveInterviewJobLine(meeting: CandidateInterviewRow): string {
  const title = (meeting.jobTitle || meeting.jobPosition || "").trim();
  const company = (meeting.companyName || "").trim();
  if (title && company) return `${title} · ${company}`;
  return title || company || "Interview";
}

export function resolveInterviewDetailHref(
  meeting: CandidateInterviewRow,
  user?: { name?: string | null; email?: string | null } | null,
): string {
  const base = resolveMeetingShareUrl(meeting);
  if (!base) return "";
  return appendJoinIdentityToUrl(base, user?.name, user?.email);
}

/** Join opens 10 minutes before start and closes when the meeting ends (employee dashboard rule). */
export function canJoinInterview(
  meeting: Pick<CandidateInterviewRow, "scheduledAt" | "durationMinutes">,
  now: Date = new Date(),
): boolean {
  return canJoinMeeting(meeting.scheduledAt, meeting.durationMinutes, now);
}

/** Join-room URL only when inside the join window; empty otherwise. */
export function resolveInterviewJoinHref(
  meeting: CandidateInterviewRow,
  user?: { name?: string | null; email?: string | null } | null,
  now: Date = new Date(),
): string {
  if (!canJoinInterview(meeting, now)) return "";
  return resolveInterviewDetailHref(meeting, user);
}
