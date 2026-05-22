/**
 * Frontend mirror of backend's `utils/notificationLink.js` resolver.
 * Maps a notification's type + relatedEntity + metadata to a route. The
 * server already auto-fills `notification.link` for fresh writes and on
 * read, so this resolver is mainly a defensive fallback for legacy SSE
 * payloads or partially-formed notifications.
 */
import type { Notification } from "@/shared/lib/api/notifications";

const stripId = (v: unknown): string => (v == null ? "" : String(v));

type RouteFn = (n: Notification) => string;

const meta = (n: Notification, key: string): unknown =>
  (n.metadata && typeof n.metadata === "object" ? (n.metadata as Record<string, unknown>)[key] : undefined);

/** Absolute URLs (legacy) → pathname+search for client-side router.push. */
export function normalizeNotificationLink(link: unknown): string | null {
  if (!link || typeof link !== "string") return null;
  const trimmed = link.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  try {
    const u = new URL(trimmed);
    const path = u.pathname || "/";
    return `${path}${u.search || ""}`;
  } catch {
    return null;
  }
}

const meetingRoute: RouteFn = (n) => {
  if (meta(n, "navTarget") === "interviews_list") return "/ats/interviews";
  if (meta(n, "navTarget") === "meetings_list") return "/communication/meetings";
  const id = stripId(n.relatedEntity?.id) || stripId(meta(n, "meetingId"));
  if (id) return `/join/room?room=${encodeURIComponent(id)}`;
  return meta(n, "meetingKind") === "internal" ? "/communication/meetings" : "/ats/interviews";
};

const ROUTE_MAP: Record<string, RouteFn> = {
  meeting: meetingRoute,
  meeting_reminder: meetingRoute,
  chat_message: (n) => {
    const id = stripId(n.relatedEntity?.id) || stripId(meta(n, "conversationId"));
    return id ? `/communication/chats?conv=${id}` : "/communication/chats";
  },
  task: (n) => {
    const id = stripId(n.relatedEntity?.id) || stripId(meta(n, "taskId"));
    return id ? `/task/my-tasks?task=${id}` : "/task/my-tasks";
  },
  job_application: (n) => {
    const jobId = stripId(meta(n, "jobId"));
    return jobId ? `/ats/jobs/${jobId}` : "/ats/my-applications";
  },
  offer: (n) => (meta(n, "section") === "pre-boarding" ? "/ats/pre-boarding" : "/ats/offers-placement"),
  placement_update: () => "/ats/offers-placement",
  joining_reminder: () => "/ats/onboarding",
  onboarding_reminder: () => "/ats/onboarding",
  leave: () => "/settings/attendance/leave-requests",
  certificate: (n) => {
    const id = stripId(meta(n, "certificateId"));
    return id ? `/training/certificates?id=${id}` : "/training/certificates";
  },
  course: (n) => {
    const id = stripId(meta(n, "courseId"));
    return id ? `/training/courses/${id}` : "/training/courses";
  },
  project: (n) => {
    const id = stripId(n.relatedEntity?.id) || stripId(meta(n, "projectId"));
    return id ? `/apps/projects/project-list?id=${id}` : "/apps/projects/project-list";
  },
  account: () => "/ats/my-profile",
  recruiter: (n) => {
    const id = stripId(n.relatedEntity?.id) || stripId(meta(n, "candidateId"));
    return id ? `/ats/candidates/${id}` : "/ats/candidates";
  },
  assignment: (n) => {
    const id = stripId(n.relatedEntity?.id) || stripId(meta(n, "candidateId"));
    return id ? `/ats/candidates/${id}` : "/settings/agents/";
  },
  sop: () => "/ats/onboarding",
  support_ticket: (n) => {
    const id = stripId(n.relatedEntity?.id) || stripId(meta(n, "ticketId"));
    return id ? `/support-tickets/${id}` : "/support-tickets";
  },
  system: () => "/notifications",
  general: () => "/notifications",
};

const FALLBACK = "/notifications";

/** Pick the best navigable route for a notification. Always returns a usable path. */
export function resolveNotificationRoute(n: Notification | null | undefined): string {
  if (!n) return FALLBACK;
  const normalized = normalizeNotificationLink(n.link);
  if (normalized) return normalized;
  const fn = ROUTE_MAP[n.type as string];
  if (fn) {
    try {
      const route = fn(n);
      if (route && route.startsWith("/")) return route;
    } catch (_) { /* fall through */ }
  }
  return FALLBACK;
}
