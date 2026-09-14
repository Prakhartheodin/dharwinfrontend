/**
 * "Highlight of Today" — today's ATS interviews and Communication meetings as one
 * chronological list.
 *
 * Two DIFFERENT collections behind two DIFFERENT endpoints and two DIFFERENT permission
 * families:
 *   - GET /meetings           Meeting          interviews.read   (meetingScope)
 *   - GET /internal-meetings  InternalMeeting  auth() + scope    (internalMeetingScope)
 *
 * They share no foreign key in either direction, so there is NO cross-source
 * deduplication here and none should be added: matching on candidate+title+time would
 * produce false positives, and a real duplicate is not expected between a candidate
 * interview and an internal team meeting. See the note on `mergeEvents`.
 *
 * Authorization is server-side. Dashboard list calls pass scope=mine so tenant-wide
 * interview/meeting access does not flood the widget with other people's events.
 *
 * Every calendar-day decision uses the VIEWER's timezone via wallClockDateKey/
 * localDateKey. Never toISOString().slice(0,10) (UTC, shifts the day east of UTC) and
 * never the meeting's own `timezone` field (the scheduler's zone, for display only).
 */
import type { Meeting } from "@/shared/lib/api/meetings";
import type { InternalMeeting } from "@/shared/lib/api/internal-meetings";
import { getViewerTimezone, localDateKey, wallClockDateKey } from "@/shared/lib/timezone";

export type EventSource = "interview" | "meeting";

/** Mirrors the shared `scheduled | ended | cancelled` enum both models use. */
export type EventStatus = "scheduled" | "ended" | "cancelled" | "unknown";

/**
 * The only shape the UI renders. Deliberately small — backend documents are not copied
 * into dashboard state, so a widget showing 8 rows holds 8 small objects, not 50 full
 * meeting documents with hosts, invites, retry counters and admitted identities.
 */
export type DashboardEvent = {
  id: string;
  source: EventSource;
  title: string;
  /** Who it is with — candidate for an interview, host for a meeting. May be null. */
  participant: string | null;
  /** Job position / meeting type. May be null. */
  secondaryInfo: string | null;
  /** ISO instant. */
  startAt: string;
  /** ISO instant, derived from durationMinutes. */
  endAt: string;
  status: EventStatus;
  /** Room URL for the join action, already resolved. Empty when unavailable. */
  joinUrl: string;
  /** Hosts, for personalising the join link. Empty when the row carries none. */
  hosts: Array<{ nameOrRole?: string; email: string }>;
};

/** Rows the widget shows at once. Anything beyond this is reached via View All. */
export const TODAY_EVENTS_DISPLAY_CAP = 8;

/**
 * Rows requested per source.
 *
 * Must stay >= TODAY_EVENTS_DISPLAY_CAP for `mergeEvents` to be globally correct: given
 * two chronologically sorted lists, the first k of their merge is guaranteed correct for
 * any k <= min(lenA, lenB). At 25 vs a display cap of 8 the 8 rows shown are provably
 * the earliest 8 of the day across BOTH sources, without fetching the whole day.
 */
export const TODAY_EVENTS_FETCH_LIMIT = 25;

/** Dashboard lists only meetings/interviews the viewer hosts or is invited to as participant. */
export const TODAY_EVENTS_LIST_SCOPE = "mine" as const;

const DEFAULT_DURATION_MINUTES = 60;

/** Join opens 10 minutes before start — same rule as the employee dashboard. */
const JOIN_OPENS_MINUTES_BEFORE = 10;

function normalizeStatus(raw: unknown): EventStatus {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "scheduled" || s === "ended" || s === "cancelled") return s;
  // Legacy rows predate the enum and carry '' or null; the model defaults to scheduled.
  if (s === "") return "scheduled";
  return "unknown";
}

/** Positive duration, or the schema default. Guards 0, negative and NaN legacy values. */
function safeDuration(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DURATION_MINUTES;
}

function endInstant(startAt: string, durationMinutes: number): string {
  return new Date(new Date(startAt).getTime() + durationMinutes * 60000).toISOString();
}

/** Trimmed non-empty string, else null. Never invents a value. */
function text(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s || null;
}

/**
 * Room URL for a row. Mirrors resolveMeetingShareUrl in shared/lib/join-room-url, but
 * takes `origin` explicitly so this module stays pure and testable without a DOM.
 */
export function resolveEventJoinUrl(
  row: { publicMeetingUrl?: string | null; meetingId?: string | null },
  origin: string
): string {
  const fromApi = (row.publicMeetingUrl || "").trim();
  if (fromApi) return fromApi;
  const room = (row.meetingId || "").trim();
  if (!room) return "";
  const path = `/join/room?room=${encodeURIComponent(room)}`;
  return origin ? `${origin}${path}` : path;
}

/**
 * ATS interview -> DashboardEvent. Returns null for a row with no usable start time so
 * one malformed legacy document cannot break the widget. Missing candidate/recruiter is
 * represented as null, never fabricated.
 */
export function normalizeInterview(m: Meeting, origin = ""): DashboardEvent | null {
  const start = new Date(m.scheduledAt ?? "");
  if (Number.isNaN(start.getTime())) return null;
  const startAt = start.toISOString();
  const duration = safeDuration(m.durationMinutes);
  return {
    id: `interview:${m.id ?? m._id ?? m.meetingId ?? startAt}`,
    source: "interview",
    title: text(m.title) ?? "Interview",
    participant: text(m.candidate?.name) ?? text(m.recruiter?.name),
    secondaryInfo: text(m.jobPosition) ?? text(m.interviewType),
    startAt,
    endAt: endInstant(startAt, duration),
    status: normalizeStatus(m.status),
    joinUrl: resolveEventJoinUrl(m, origin),
    hosts: Array.isArray(m.hosts) ? m.hosts : [],
  };
}

/** Communication meeting -> DashboardEvent. Same malformed-row contract as above. */
export function normalizeInternalMeeting(m: InternalMeeting, origin = ""): DashboardEvent | null {
  const start = new Date(m.scheduledAt ?? "");
  if (Number.isNaN(start.getTime())) return null;
  const startAt = start.toISOString();
  const duration = safeDuration(m.durationMinutes);
  const firstHost = Array.isArray(m.hosts) ? m.hosts[0] : undefined;
  return {
    id: `meeting:${m.id ?? m._id ?? m.meetingId ?? startAt}`,
    source: "meeting",
    title: text(m.title) ?? "Meeting",
    participant: text(firstHost?.nameOrRole) ?? text(firstHost?.email),
    secondaryInfo: text(m.meetingType) ?? text(m.recurrenceSummary),
    startAt,
    endAt: endInstant(startAt, duration),
    status: normalizeStatus(m.status),
    joinUrl: resolveEventJoinUrl(m, origin),
    hosts: Array.isArray(m.hosts) ? m.hosts : [],
  };
}

/**
 * Events whose start falls on the viewer's calendar today.
 *
 * The server already filtered to a UTC window built from this same local day, so this is
 * a second line of defence rather than the only filter — it also catches a row sitting
 * exactly on a boundary the window rounded differently.
 */
export function filterToViewerToday(
  events: DashboardEvent[],
  now: Date = new Date(),
  tz: string = getViewerTimezone()
): DashboardEvent[] {
  const todayKey = localDateKey(now);
  return events.filter((e) => wallClockDateKey(e.startAt, tz) === todayKey);
}

/**
 * Merge already-sorted lists into one chronological list.
 *
 * Ties broken by id so the order is deterministic when several events share a start
 * time — Mongo's natural order is not a tiebreak we can rely on, and an unstable
 * dashboard order reads as flickering data.
 *
 * No cross-source deduplication: Meeting and InternalMeeting share no foreign key, so
 * any matching would be a heuristic capable of hiding a real event.
 */
export function mergeEvents(...lists: DashboardEvent[][]): DashboardEvent[] {
  return lists
    .flat()
    .sort(
      (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime() || a.id.localeCompare(b.id)
    );
}

/** Cancelled and ended events are never joinable, whatever the clock says. */
export function isEventJoinable(e: DashboardEvent, now: Date = new Date()): boolean {
  if (e.status === "cancelled" || e.status === "ended") return false;
  if (!e.joinUrl) return false;
  const start = new Date(e.startAt).getTime();
  const end = new Date(e.endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  const t = now.getTime();
  return t >= start - JOIN_OPENS_MINUTES_BEFORE * 60000 && t <= end;
}

/** Minutes until start; negative once it has begun. */
export function minutesUntilStart(e: DashboardEvent, now: Date = new Date()): number {
  return Math.round((new Date(e.startAt).getTime() - now.getTime()) / 60000);
}

/**
 * The UTC instants bounding the viewer's local day, for dateFrom/dateTo.
 *
 * Built from local calendar parts, so a DST day is correctly 23 or 25 hours long and the
 * boundary never drifts. This pair is what makes the query bounded by TIME rather than
 * by row count.
 */
export function viewerDayWindow(now: Date = new Date()): { dateFrom: string; dateTo: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}
