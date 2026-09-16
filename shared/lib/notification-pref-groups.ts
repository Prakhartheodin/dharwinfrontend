import type { NotificationPreferences } from "@/shared/lib/api/users";

export type NotificationPrefKey = keyof NotificationPreferences;

/** Grouped notification toggles — keys must match `NotificationPreferences`. */
export const NOTIFICATION_PREF_GROUPS: {
  id: string;
  title: string;
  summary: string;
  icon: string;
  items: { key?: NotificationPrefKey; inAppKey: NotificationPrefKey; label: string; description?: string }[];
}[] = [
  {
    id: "work",
    title: "Work & attendance",
    summary: "HR, leave, and tasks",
    icon: "ri-time-line",
    items: [
      { key: "leaveUpdates", inAppKey: "leaveUpdatesInApp", label: "Leave & attendance updates", description: "Absences, approvals, and attendance changes" },
      { key: "taskAssignments", inAppKey: "taskAssignmentsInApp", label: "Task assignments", description: "When new work is assigned to you" },
      { inAppKey: "chatMessagesInApp", label: "Chat messages", description: "New direct and group chat messages" },
      { inAppKey: "projectUpdatesInApp", label: "Project assignments", description: "When you are added to a project" },
    ],
  },
  {
    id: "hiring",
    title: "Applications & offers",
    summary: "Recruiting and recruiter touchpoints",
    icon: "ri-briefcase-4-line",
    items: [
      { key: "applicationUpdates", inAppKey: "applicationUpdatesInApp", label: "Job application updates", description: "Status changes on roles you applied to" },
      { key: "offerUpdates", inAppKey: "offerUpdatesInApp", label: "Offer updates", description: "Offers, negotiations, and outcomes" },
      { key: "recruiterUpdates", inAppKey: "recruiterUpdatesInApp", label: "Recruiter assignments", description: "When a recruiter is linked to you" },
      { key: "placementUpdates", inAppKey: "placementUpdatesInApp", label: "Placement updates", description: "Joining dates and placement confirmations" },
      { inAppKey: "assignmentUpdatesInApp", label: "Assignee changes", description: "When you are set as the assigned agent" },
    ],
  },
  {
    id: "learning",
    title: "Meetings & learning",
    summary: "Calendar, reminders, and programmes",
    icon: "ri-calendar-event-line",
    items: [
      { key: "meetingInvitations", inAppKey: "meetingInvitationsInApp", label: "Meeting invitations", description: "Invites and schedule updates" },
      { key: "meetingReminders", inAppKey: "meetingRemindersInApp", label: "Meeting reminders", description: "Alerts before your sessions" },
      { key: "certificates", inAppKey: "certificatesInApp", label: "Certificates", description: "Issued credentials and completions" },
      { key: "courseUpdates", inAppKey: "courseUpdatesInApp", label: "Course / training updates", description: "Modules, deadlines, and programme news" },
      { inAppKey: "sopAssignmentsInApp", label: "Onboarding SOP reminders", description: "Open onboarding steps assigned to you" },
      {
        key: "smartNudges",
        inAppKey: "smartNudgesInApp",
        label: "Smart nudges (AI)",
        description: "AI-generated reminders for delays and missed interviews",
      },
    ],
  },
  {
    id: "support",
    title: "Support",
    summary: "Help desk and ticket updates",
    icon: "ri-customer-service-2-line",
    items: [
      { key: "supportTicketUpdates", inAppKey: "supportTicketUpdatesInApp", label: "Support ticket updates", description: "Status changes on tickets you raised" },
    ],
  },
];

export const ALL_NOTIFICATION_PREF_KEYS = NOTIFICATION_PREF_GROUPS.flatMap((g) =>
  g.items.flatMap((i) => (i.key ? [i.key, i.inAppKey] : [i.inAppKey]))
);

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  leaveUpdates: true,
  leaveUpdatesInApp: true,
  taskAssignments: true,
  taskAssignmentsInApp: true,
  applicationUpdates: true,
  applicationUpdatesInApp: true,
  offerUpdates: true,
  offerUpdatesInApp: true,
  meetingInvitations: true,
  meetingInvitationsInApp: true,
  meetingReminders: true,
  meetingRemindersInApp: true,
  certificates: true,
  certificatesInApp: true,
  courseUpdates: true,
  courseUpdatesInApp: true,
  recruiterUpdates: true,
  recruiterUpdatesInApp: true,
  supportTicketUpdates: true,
  supportTicketUpdatesInApp: true,
  placementUpdates: true,
  placementUpdatesInApp: true,
  chatMessagesInApp: true,
  assignmentUpdatesInApp: true,
  projectUpdatesInApp: true,
  sopAssignmentsInApp: true,
  smartNudges: true,
  smartNudgesInApp: true,
};
