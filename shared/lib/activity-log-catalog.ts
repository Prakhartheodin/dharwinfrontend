/**
 * Mirrors backend ActivityActions / EntityTypes for filter dropdowns.
 * Keep in sync with uat.dharwin.backend/src/config/activityLog.js
 */
export const ACTIVITY_LOG_ACTIONS: string[] = [
  "role.create",
  "role.update",
  "role.delete",
  "user.create",
  "user.update",
  "user.delete",
  "user.disable",
  "user.login",
  "user.logout",
  "impersonation.start",
  "impersonation.end",
  "supportCamera.invite",
  "category.create",
  "category.update",
  "category.delete",
  "student.update",
  "student.delete",
  "mentor.update",
  "mentor.delete",
  "student.course.start",
  "student.course.complete",
  "student.quiz.attempt",
  "certificate.issued",
  "attendance.punchIn",
  "attendance.punchOut",
  "attendance.punchOutByAdmin",
  "attendance.autoPunchOut",
  "candidate.create",
  "candidate.update",
  "candidate.delete",
  "candidate.onboardingShare",
  "job.create",
  "job.update",
  "job.delete",
  "job.share",
  "jobApplication.create",
  "jobApplication.update",
  "jobApplication.delete",
  "settings.bolnaCandidateAgent.update",
];

export const ACTIVITY_LOG_ENTITY_TYPES: string[] = [
  "Role",
  "User",
  "Impersonation",
  "Category",
  "Student",
  "Mentor",
  "StudentCourseProgress",
  "StudentQuizAttempt",
  "Certificate",
  "Attendance",
  "Candidate",
  "Job",
  "JobApplication",
  "BolnaCandidateAgentSettings",
];

export type ActivityLogLabel = { title: string; description: string };

/** Human-readable action labels for admins (tooltip shows description + raw key). */
export const ACTION_LABELS: Record<string, ActivityLogLabel> = {
  "role.create": { title: "Role created", description: "A new user role was added." },
  "role.update": { title: "Role updated", description: "Role permissions or details were changed." },
  "role.delete": { title: "Role deleted", description: "A role was removed." },
  "user.create": { title: "User created", description: "A new user account was created." },
  "user.update": { title: "User updated", description: "User profile or settings were changed." },
  "user.delete": { title: "User deleted", description: "A user account was removed." },
  "user.disable": { title: "User disabled", description: "A user was deactivated or disabled." },
  "user.login": { title: "User signed in", description: "A user completed a successful sign-in (e.g. email and password)." },
  "user.logout": { title: "User signed out", description: "A user ended their session (refresh token revoked)." },
  "impersonation.start": { title: "Impersonation started", description: "An admin began acting as another user." },
  "impersonation.end": { title: "Impersonation ended", description: "Impersonation session stopped." },
  "supportCamera.invite": {
    title: "Support camera invite",
    description: "A platform super user created a consent-based live camera session link for a user.",
  },
  "category.create": { title: "Category created", description: "A training category was added." },
  "category.update": { title: "Category updated", description: "A training category was modified." },
  "category.delete": { title: "Category deleted", description: "A training category was removed." },
  "student.update": { title: "Student updated", description: "A trainee/student record was changed." },
  "student.delete": { title: "Student deleted", description: "A student record was removed." },
  "mentor.update": { title: "Mentor updated", description: "A mentor profile was changed." },
  "mentor.delete": { title: "Mentor deleted", description: "A mentor was removed." },
  "student.course.start": { title: "Course started", description: "A student began a course module." },
  "student.course.complete": { title: "Course progress updated", description: "Course/module completion recorded." },
  "student.quiz.attempt": { title: "Quiz attempt", description: "A student submitted or attempted a quiz." },
  "certificate.issued": { title: "Certificate issued", description: "A certificate was generated for a student." },
  "attendance.punchIn": { title: "Attendance punch in", description: "Clock-in recorded." },
  "attendance.punchOut": { title: "Attendance punch out", description: "Clock-out recorded." },
  "attendance.punchOutByAdmin": { title: "Punch out by admin", description: "An administrator clocked someone out." },
  "attendance.autoPunchOut": { title: "Auto punch out", description: "System automatic clock-out." },
  "candidate.create": { title: "Employee created", description: "A new ATS employee record was added." },
  "candidate.update": { title: "Employee updated", description: "Employee profile or pipeline data changed." },
  "candidate.delete": { title: "Employee deleted", description: "An employee record was removed." },
  "candidate.onboardingShare": {
    title: "Onboarding form shared",
    description: "An onboarding invitation link was sent by email.",
  },
  "job.create": { title: "Job created", description: "A job posting was added." },
  "job.update": { title: "Job updated", description: "Job details were changed." },
  "job.delete": { title: "Job deleted", description: "A job posting was removed." },
  "job.share": { title: "Job shared", description: "A job link was sent by email." },
  "jobApplication.create": { title: "Application created", description: "Someone applied to a job." },
  "jobApplication.update": { title: "Application updated", description: "Application status or data changed." },
  "jobApplication.delete": { title: "Application deleted", description: "A job application was removed." },
  "settings.bolnaCandidateAgent.update": {
    title: "Calling agent settings updated",
    description: "Bolna employee calling agent integration settings changed.",
  },
};

export const ENTITY_TYPE_LABELS: Record<string, ActivityLogLabel> = {
  Role: { title: "Role", description: "RBAC role definition." },
  User: { title: "User", description: "Platform user account." },
  Impersonation: { title: "Impersonation", description: "Admin acting-as-user session." },
  Category: { title: "Category", description: "Training curriculum category." },
  Student: { title: "Student", description: "Training student / trainee." },
  Mentor: { title: "Mentor", description: "Training mentor." },
  StudentCourseProgress: { title: "Course progress", description: "Student enrollment in a module." },
  StudentQuizAttempt: { title: "Quiz attempt", description: "Student quiz submission." },
  Certificate: { title: "Certificate", description: "Issued certificate." },
  Attendance: { title: "Attendance", description: "Punch or attendance record." },
  Candidate: { title: "Employee (ATS)", description: "ATS employee / people record." },
  Job: { title: "Job", description: "Job posting." },
  JobApplication: { title: "Job application", description: "Application to a job." },
  BolnaCandidateAgentSettings: {
    title: "Calling agent settings",
    description: "Voice employee-calling agent configuration.",
  },
};

export function getActionDisplay(action: string): ActivityLogLabel {
  return ACTION_LABELS[action] ?? { title: action, description: `Technical action: ${action}` };
}

/** Row-level action label (e.g. user.delete + persisted targetUserName after hard delete). */
export function getActivityActionDisplayForRow(log: {
  action?: string | null;
  metadata?: Record<string, unknown> | null;
}): ActivityLogLabel {
  const base = getActionDisplay(log.action ?? "");
  const m =
    log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};
  const tn = typeof m.targetUserName === "string" ? m.targetUserName.trim() : "";
  if (log.action === "user.delete" && tn) {
    return { title: `${tn} — ${base.title}`, description: base.description };
  }
  if (log.action === "user.login" && tn) {
    return { title: `${tn} — ${base.title}`, description: base.description };
  }
  if (log.action === "user.logout" && tn) {
    return { title: `${tn} — ${base.title}`, description: base.description };
  }
  return base;
}

export function getEntityTypeDisplay(entityType: string | null | undefined): ActivityLogLabel {
  const t = entityType ?? "";
  return ENTITY_TYPE_LABELS[t] ?? { title: t || "—", description: t ? `Entity type: ${t}` : "No entity type" };
}

function readRecipients(metadata: Record<string, unknown>): string[] {
  const recipients = metadata.recipients;
  if (Array.isArray(recipients)) {
    return recipients.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  }
  const recipient = metadata.recipient;
  if (typeof recipient === "string" && recipient.trim()) {
    return [recipient.trim()];
  }
  return [];
}

function recipientsLine(metadata: Record<string, unknown>): string | null {
  const recipients = readRecipients(metadata);
  if (recipients.length === 0) return null;
  if (recipients.length <= 3) return `Recipients: ${recipients.join(", ")}`;
  return `Recipients: ${recipients.slice(0, 3).join(", ")} +${recipients.length - 3} more`;
}

/** Rich Entity column for Role rows (platform audit); uses activity log metadata from the API. */
export function getRoleActivityEntitySummary(log: {
  action?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}): { headline: string; detailLines: string[] } | null {
  if (log.entityType !== "Role") return null;
  const m =
    log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};
  const roleLabel =
    (typeof m.roleName === "string" && m.roleName.trim()) ||
    (typeof m.name === "string" && m.name.trim()) ||
    null;
  const action = log.action ?? "";

  if (action === "role.create") {
    return {
      headline: roleLabel ? `Created “${roleLabel}”` : "Role created",
      detailLines: [],
    };
  }
  if (action === "role.delete") {
    return {
      headline: roleLabel ? `Deleted “${roleLabel}”` : "Role deleted",
      detailLines: [],
    };
  }
  if (action === "role.update") {
    const detailLines: string[] = [];
    if (m.nameBefore != null && m.nameAfter != null && String(m.nameBefore) !== String(m.nameAfter)) {
      detailLines.push(`Renamed: ${String(m.nameBefore)} → ${String(m.nameAfter)}`);
    }
    if (Array.isArray(m.fieldsUpdated) && m.fieldsUpdated.length) {
      detailLines.push(`Fields changed: ${(m.fieldsUpdated as string[]).join(", ")}`);
    }
    if (m.statusBefore != null && m.statusAfter != null && String(m.statusBefore) !== String(m.statusAfter)) {
      detailLines.push(`Status: ${String(m.statusBefore)} → ${String(m.statusAfter)}`);
    }
    if (m.permissionsUpdated === true) {
      const b = m.permissionCountBefore;
      const a = m.permissionCountAfter;
      if (typeof b === "number" && typeof a === "number") {
        detailLines.push(`Permissions: ${b} → ${a} entries`);
      } else {
        detailLines.push("Permissions updated");
      }
    }
    if (detailLines.length === 0) {
      if (m.permissionsChanged === true) detailLines.push("Permissions changed");
      if (m.status !== undefined) detailLines.push(`Status: ${String(m.status)}`);
    }
    const hasRoleMemberSnapshot =
      (typeof m.roleMemberCount === "number" && Number.isFinite(m.roleMemberCount)) ||
      (Array.isArray(m.roleMemberDisplayNames) && m.roleMemberDisplayNames.length > 0) ||
      m.roleMemberNamesTruncated === true;
    if (hasRoleMemberSnapshot) {
      const memberNames = Array.isArray(m.roleMemberDisplayNames)
        ? (m.roleMemberDisplayNames as unknown[]).filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          )
        : [];
      const memberTotal =
        typeof m.roleMemberCount === "number" && Number.isFinite(m.roleMemberCount)
          ? m.roleMemberCount
          : memberNames.length;
      if (memberNames.length > 0) {
        const list = memberNames.join(", ");
        const truncated = m.roleMemberNamesTruncated === true && memberTotal > memberNames.length;
        detailLines.push(
          truncated
            ? `Users with this role (${memberTotal}, showing ${memberNames.length}): ${list}`
            : `Users with this role (${memberTotal}): ${list}`
        );
      } else if (memberTotal === 0) {
        detailLines.push("No users assigned this role at the time of this update.");
      } else if (memberTotal > 0) {
        detailLines.push(
          `${memberTotal} user(s) had this role; display names could not be resolved for the snapshot.`
        );
      }
    }
    return {
      headline: roleLabel ? `Updated “${roleLabel}”` : "Role updated",
      detailLines,
    };
  }

  return roleLabel ? { headline: roleLabel, detailLines: [] } : null;
}

/** Entity column for User rows (and support-camera target user). */
export function getUserActivityEntitySummary(log: {
  action?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}): { headline: string; detailLines: string[] } | null {
  if (log.entityType !== "User") return null;
  const m =
    log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};
  const label =
    typeof m.targetUserName === "string" && m.targetUserName.trim() ? m.targetUserName.trim() : null;
  if (!label) return null;

  const action = log.action ?? "";
  const detailLines: string[] = [];
  if (m.field != null && m.newValue !== undefined) {
    detailLines.push(`${String(m.field)} → ${String(m.newValue)}`);
  }
  if (typeof m.roomName === "string" && m.roomName.trim()) {
    detailLines.push(`Room: ${m.roomName.trim()}`);
  }

  if (action === "user.create") {
    return { headline: `User · ${label}`, detailLines };
  }
  if (action === "user.delete") {
    return { headline: `Deleted user · ${label}`, detailLines };
  }
  if (action === "user.disable") {
    return { headline: `Disabled / restricted · ${label}`, detailLines };
  }
  if (action === "user.update") {
    return { headline: `Updated user · ${label}`, detailLines };
  }
  if (action === "supportCamera.invite") {
    return { headline: `Camera invite · ${label}`, detailLines };
  }
  return { headline: label, detailLines };
}

export function getImpersonationEntitySummary(log: {
  action?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}): { headline: string; detailLines: string[] } | null {
  if (log.entityType !== "Impersonation") return null;
  const m =
    log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};
  const label =
    typeof m.targetUserName === "string" && m.targetUserName.trim() ? m.targetUserName.trim() : null;
  if (!label) return null;
  const action = log.action ?? "";
  if (action === "impersonation.start") {
    return { headline: `Login as · ${label}`, detailLines: [] };
  }
  if (action === "impersonation.end") {
    return { headline: `End login as · ${label}`, detailLines: [] };
  }
  return { headline: label, detailLines: [] };
}

export function getCandidateActivityEntitySummary(log: {
  action?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}): { headline: string; detailLines: string[] } | null {
  if (log.entityType !== "Candidate") return null;
  const action = log.action ?? "";
  const m =
    log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};

  if (action === "candidate.onboardingShare") {
    const detailLines: string[] = [];
    const recipients = recipientsLine(m);
    if (typeof m.inviteMode === "string" && m.inviteMode.trim()) {
      detailLines.push(`Mode: ${m.inviteMode}`);
    }
    if (typeof m.invitationCount === "number") {
      detailLines.push(`Invitation count: ${m.invitationCount}`);
    }
    if (recipients) {
      detailLines.push(recipients);
    }
    return {
      headline: "Candidate onboarding form",
      detailLines,
    };
  }

  const candidateName =
    typeof m.fullName === "string" && m.fullName.trim() ? m.fullName.trim() : null;
  return candidateName ? { headline: candidateName, detailLines: [] } : null;
}

export function getJobActivityEntitySummary(log: {
  action?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}): { headline: string; detailLines: string[] } | null {
  if (log.entityType !== "Job") return null;
  const action = log.action ?? "";
  const m =
    log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};
  const jobTitle =
    typeof m.jobTitle === "string" && m.jobTitle.trim()
      ? m.jobTitle.trim()
      : typeof m.title === "string" && m.title.trim()
        ? m.title.trim()
        : null;

  if (action === "job.share") {
    const detailLines: string[] = [];
    const recipients = recipientsLine(m);
    if (typeof m.deliveryMethod === "string" && m.deliveryMethod.trim()) {
      detailLines.push(`Via: ${m.deliveryMethod}`);
    }
    if (recipients) {
      detailLines.push(recipients);
    }
    return {
      headline: jobTitle ? `Shared “${jobTitle}”` : "Job shared",
      detailLines,
    };
  }

  return jobTitle ? { headline: jobTitle, detailLines: [] } : null;
}
