"use client";

import { apiClient } from "@/shared/lib/api/client";

export type WeeklyWindow = { day: number; start: string; end: string };
export type TimeWindow = { start: string; end: string };
export type AvailabilityOverride = { date: string; blocked: boolean; windows: TimeWindow[] };

export type InterviewerAvailability = {
  timezone: string;
  bufferMinutes: number;
  weekly: WeeklyWindow[];
  overrides: AvailabilityOverride[];
};

type PersonRef = { _id?: string; id?: string; name?: string; email?: string; fullName?: string };

export type InterviewHold = {
  _id: string;
  start: string;
  durationMinutes: number;
  candidateTimezone?: string;
  status: string;
  expiresAt?: string;
  source?: string;
  candidate?: PersonRef | null;
  job?: { _id?: string; title?: string } | null;
  interviewer?: PersonRef | null;
  /** Populated shapes some endpoints return instead of the flattened fields above. */
  candidateId?: PersonRef | string | null;
  jobId?: { _id?: string; title?: string } | string | null;
  interviewerId?: PersonRef | string | null;
};

export type BookingState = "open" | "pending" | "scheduled" | "closed";
export type BookingSlot = { slot_id: string; start: string; end: string };
export type PublicBooking = {
  candidateName?: string;
  jobTitle?: string;
  state: BookingState;
  hold?: { start: string; durationMinutes?: number; status?: string; expiresAt?: string } | null;
  slots: BookingSlot[];
};

const unwrap = <T,>(d: unknown): T => {
  const o = d as { data?: T } | T;
  return (o && typeof o === "object" && "data" in (o as object) ? (o as { data: T }).data : o) as T;
};

export async function getMyAvailability(): Promise<InterviewerAvailability | null> {
  const res = await apiClient.get("/interview-scheduling/availability/me");
  return unwrap<InterviewerAvailability | null>(res.data);
}

export async function saveMyAvailability(body: InterviewerAvailability): Promise<InterviewerAvailability> {
  const res = await apiClient.put("/interview-scheduling/availability/me", body);
  return unwrap<InterviewerAvailability>(res.data);
}

export async function getUserAvailability(userId: string): Promise<InterviewerAvailability | null> {
  const res = await apiClient.get(`/interview-scheduling/availability/${userId}`);
  return unwrap<InterviewerAvailability | null>(res.data);
}

export async function saveUserAvailability(
  userId: string,
  body: InterviewerAvailability
): Promise<InterviewerAvailability> {
  const res = await apiClient.put(`/interview-scheduling/availability/${userId}`, body);
  return unwrap<InterviewerAvailability>(res.data);
}

export async function listInterviewHolds(params?: { status?: string; jobId?: string }): Promise<InterviewHold[]> {
  const res = await apiClient.get("/interview-scheduling/holds", { params });
  const d = unwrap<InterviewHold[] | { results?: InterviewHold[] }>(res.data);
  return Array.isArray(d) ? d : d?.results ?? [];
}

export async function approveInterviewHold(id: string): Promise<unknown> {
  const res = await apiClient.post(`/interview-scheduling/holds/${id}/approve`);
  return res.data;
}

export async function rejectInterviewHold(id: string, reason: string): Promise<unknown> {
  const res = await apiClient.post(`/interview-scheduling/holds/${id}/reject`, { reason });
  return res.data;
}

export async function getPublicBooking(token: string, tz: string): Promise<PublicBooking> {
  const res = await apiClient.get(`/public/interview-booking/${encodeURIComponent(token)}`, { params: { tz } });
  return unwrap<PublicBooking>(res.data);
}

export async function confirmPublicBooking(token: string, slotId: string, tz: string): Promise<PublicBooking> {
  const res = await apiClient.post(`/public/interview-booking/${encodeURIComponent(token)}`, { slot_id: slotId, tz });
  return unwrap<PublicBooking>(res.data);
}

/** Normalise flattened or populated hold refs into display strings. */
export function holdDisplay(h: InterviewHold) {
  const ref = (a?: PersonRef | string | null, b?: PersonRef | string | null): PersonRef =>
    (a && typeof a === "object" ? a : b && typeof b === "object" ? b : {}) as PersonRef;
  const c = ref(h.candidate, h.candidateId);
  const i = ref(h.interviewer, h.interviewerId);
  const j = (h.job && typeof h.job === "object" ? h.job : h.jobId && typeof h.jobId === "object" ? h.jobId : {}) as {
    title?: string;
  };
  return {
    candidateName: c.name || c.fullName || c.email || "Candidate",
    candidateEmail: c.email || "",
    interviewerName: i.name || i.email || "Interviewer",
    jobTitle: j.title || "",
  };
}

/** IANA zones from the runtime, falling back to a short list on older engines. */
export function listTimezones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (fn) return fn("timeZone");
  } catch {
    /* fall through */
  }
  return ["UTC", "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London"];
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
