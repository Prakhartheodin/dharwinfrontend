import type { NotificationType } from "@/shared/lib/api/notifications";

export const notifTypeToIcon: Record<NotificationType | string, string> = {
  leave: "clock",
  task: "circle-check",
  offer: "gift",
  meeting: "video",
  meeting_reminder: "video",
  course: "book",
  certificate: "certificate",
  job_application: "briefcase",
  job_filled: "user-check",
  project: "folder",
  account: "user-check",
  recruiter: "user",
  assignment: "user-plus",
  sop: "checklist",
  support_ticket: "lifebuoy",
  dev_ticket: "bug",
  chat_message: "message-circle",
  joining_reminder: "calendar-event",
  placement_update: "trophy",
  onboarding_reminder: "user-plus",
  system: "settings",
  general: "bell",
  job_filled: "briefcase",
  smart_nudge: "bulb",
};

export const notifTypeToColor: Record<NotificationType | string, string> = {
  leave: "primary",
  task: "success",
  offer: "secondary",
  meeting: "primary",
  meeting_reminder: "primary",
  course: "pinkmain",
  certificate: "warning",
  job_application: "secondary",
  job_filled: "warning",
  project: "primary",
  account: "success",
  recruiter: "pinkmain",
  assignment: "primary",
  sop: "primary",
  support_ticket: "warning",
  dev_ticket: "warning",
  chat_message: "primary",
  joining_reminder: "success",
  placement_update: "success",
  onboarding_reminder: "primary",
  system: "secondary",
  general: "secondary",
  job_filled: "warning",
  smart_nudge: "pinkmain",
};

/**
 * True when this notification was produced by the smart-nudge (AI) layer.
 * @param type Notification `type` string
 */
export function isAiNudge(type?: string | null): boolean {
  return type === "smart_nudge";
}
