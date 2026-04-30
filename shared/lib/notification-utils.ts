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
  project: "folder",
  account: "user-check",
  recruiter: "user",
  assignment: "user-plus",
  sop: "checklist",
  general: "bell",
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
  project: "primary",
  account: "success",
  recruiter: "pinkmain",
  assignment: "primary",
  sop: "primary",
  general: "secondary",
};
