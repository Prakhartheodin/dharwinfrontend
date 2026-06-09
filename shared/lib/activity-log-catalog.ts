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
  "referralLeads.export",
  "referral.attribution.override",
  "referral.claim",
  "referral.link.issued",
  "referral.job.applied",
  "referral.candidate.activated",
  "referral.hire.joined",
  "ticket.create",
  "ticket.statusChange",
  "ticket.priorityChange",
  "ticket.assign",
  "ticket.comment",
  "ticket.delete",
  "orgUnit.create",
  "orgUnit.update",
  "orgUnit.reparent",
  "orgUnit.headAssign",
  "orgUnit.headClear",
  "orgUnit.reorder",
  "orgUnit.deactivate",
  "orgUnit.reactivate",
  "orgUnit.delete",
  "department.create",
  "department.update",
  "department.deactivate",
  "department.reactivate",
  "department.delete",
  "orgStructure.export",
  "employee.departmentAssign",
  "org.mutate.denied",
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
  "Referral",
  "SupportTicket",
  "OrgUnit",
  "Department",
  "OrgStructure",
  "Employee",
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
  "referralLeads.export": { title: "Referral leads exported", description: "Referral leads were exported to a file." },
  "referral.attribution.override": { title: "Referral attribution overridden", description: "A referral's sales-agent attribution was manually changed." },
  "referral.claim": { title: "Referral claimed", description: "A referrer claimed attribution for a candidate." },
  "referral.link.issued": { title: "Referral link issued", description: "A signed referral link was minted." },
  "referral.job.applied": { title: "Referral job applied", description: "A referred candidate moved to applied for a job." },
  "referral.candidate.activated": { title: "Referral candidate activated", description: "A referred candidate's account became active." },
  "referral.hire.joined": { title: "Referral hire joined", description: "A referred candidate's placement was marked joined." },
  "ticket.create": { title: "Ticket created", description: "A support ticket was created." },
  "ticket.statusChange": { title: "Ticket status changed", description: "A support ticket's status changed." },
  "ticket.priorityChange": { title: "Ticket priority changed", description: "A support ticket's priority changed." },
  "ticket.assign": { title: "Ticket assigned", description: "A support ticket was assigned." },
  "ticket.comment": { title: "Ticket comment added", description: "A comment was added to a support ticket." },
  "ticket.delete": { title: "Ticket deleted", description: "A support ticket was removed." },
  "orgUnit.create": { title: "Org unit created", description: "A new organization chart unit was added." },
  "orgUnit.update": { title: "Org unit updated", description: "Organization unit settings were changed." },
  "orgUnit.reparent": { title: "Org unit moved", description: "An organization unit was reparented in the hierarchy." },
  "orgUnit.headAssign": { title: "Org head assigned", description: "A leadership head was assigned to an org unit." },
  "orgUnit.headClear": { title: "Org head cleared", description: "The leadership head was removed from an org unit." },
  "orgUnit.reorder": { title: "Org units reordered", description: "Sibling org units were reordered." },
  "orgUnit.deactivate": { title: "Org unit deactivated", description: "An organization unit was deactivated." },
  "orgUnit.reactivate": { title: "Org unit reactivated", description: "An organization unit was reactivated." },
  "orgUnit.delete": { title: "Org unit deleted", description: "An organization unit was permanently deleted." },
  "department.create": { title: "Department created", description: "A new department catalog entry was added." },
  "department.update": { title: "Department updated", description: "Department details were changed." },
  "department.deactivate": { title: "Department deactivated", description: "A department was deactivated." },
  "department.reactivate": { title: "Department reactivated", description: "A department was reactivated." },
  "department.delete": { title: "Department deleted", description: "A department was permanently deleted." },
  "orgStructure.export": { title: "Org structure exported", description: "Organization structure data was downloaded." },
  "orgScenario.create": { title: "Org scenario created", description: "A sandbox reorg scenario was created." },
  "orgScenario.apply": { title: "Org scenario applied", description: "A sandbox scenario was applied to live structure." },
  "orgScenario.approve": { title: "Org scenario approved", description: "A sandbox scenario was marked approved." },
  "orgSlot.create": { title: "Vacant slot created", description: "A vacant org slot was added to the chart." },
  "orgSlot.update": { title: "Vacant slot updated", description: "A vacant org slot was updated." },
  "employee.departmentAssign": {
    title: "Employee department assigned",
    description: "An employee was assigned to a different department.",
  },
  "org.mutate.denied": {
    title: "Org change denied",
    description: "An unauthorized organization mutation or export was blocked.",
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
  Referral: { title: "Referral", description: "Referral link / attribution record." },
  SupportTicket: { title: "Support ticket", description: "Support ticket record." },
  OrgUnit: { title: "Org unit", description: "Organization chart unit (CEO, manager, supervisor, department node)." },
  Department: { title: "Department", description: "Department catalog record." },
  OrgStructure: { title: "Org structure", description: "Organization structure export or aggregate surface." },
  OrgScenario: { title: "Org scenario", description: "Sandbox reorganization scenario." },
  OrgSlot: { title: "Org slot", description: "Vacant position slot on the org chart." },
  Employee: { title: "Employee", description: "Employee / people record." },
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

function idMetaLine(beforeKey: string, afterKey: string, m: Record<string, unknown>): string | null {
  const b = m[beforeKey];
  const a = m[afterKey];
  if (b == null && a == null) return null;
  if (String(b ?? "null") === String(a ?? "null")) return null;
  return `${beforeKey.replace(/Before$/, "")}: ${String(b ?? "null")} → ${String(a ?? "null")}`;
}

export function getOrgUnitActivityEntitySummary(log: {
  action?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}): { headline: string; detailLines: string[] } | null {
  if (log.entityType !== "OrgUnit") return null;
  const m =
    log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};
  const action = log.action ?? "";
  const detailLines: string[] = [];
  const reparent = idMetaLine("parentIdBefore", "parentIdAfter", m);
  if (reparent) detailLines.push(reparent);
  const head = idMetaLine("headEmployeeIdBefore", "headEmployeeIdAfter", m);
  if (head) detailLines.push(head);
  if (typeof m.affectedUnitCount === "number") {
    detailLines.push(`Affected units: ${m.affectedUnitCount}`);
  }
  if (m.statusBefore != null && m.statusAfter != null) {
    detailLines.push(`Status: ${String(m.statusBefore)} → ${String(m.statusAfter)}`);
  }
  if (Array.isArray(m.fieldsUpdated) && m.fieldsUpdated.length) {
    detailLines.push(`Fields: ${(m.fieldsUpdated as string[]).join(", ")}`);
  }
  if (action === "orgUnit.create") return { headline: "Org unit created", detailLines };
  if (action === "orgUnit.reparent") return { headline: "Org unit reparented", detailLines };
  if (action === "orgUnit.headAssign" || action === "orgUnit.headClear") {
    return { headline: action === "orgUnit.headClear" ? "Org head cleared" : "Org head assigned", detailLines };
  }
  return detailLines.length ? { headline: "Org unit change", detailLines } : { headline: "Org unit", detailLines: [] };
}

export function getDepartmentActivityEntitySummary(log: {
  action?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}): { headline: string; detailLines: string[] } | null {
  if (log.entityType !== "Department") return null;
  const m =
    log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};
  const detailLines: string[] = [];
  if (Array.isArray(m.fieldsUpdated) && m.fieldsUpdated.length) {
    detailLines.push(`Fields: ${(m.fieldsUpdated as string[]).join(", ")}`);
  }
  if (m.statusBefore != null && m.statusAfter != null) {
    detailLines.push(`Status: ${String(m.statusBefore)} → ${String(m.statusAfter)}`);
  }
  const action = log.action ?? "";
  if (action.startsWith("department.")) {
    return { headline: getActionDisplay(action).title, detailLines };
  }
  return { headline: "Department", detailLines };
}

export function getOrgStructureActivityEntitySummary(log: {
  action?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}): { headline: string; detailLines: string[] } | null {
  if (log.entityType !== "OrgStructure" || log.action !== "orgStructure.export") return null;
  const m =
    log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};
  const detailLines: string[] = [];
  if (typeof m.format === "string") detailLines.push(`Format: ${m.format}`);
  if (typeof m.rowCount === "number") detailLines.push(`Rows: ${m.rowCount}`);
  if (typeof m.employeeCount === "number") detailLines.push(`Employees: ${m.employeeCount}`);
  if (typeof m.outcome === "string") detailLines.push(`Outcome: ${m.outcome}`);
  return { headline: "Structure export", detailLines };
}

export function getEmployeeOrgActivityEntitySummary(log: {
  action?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}): { headline: string; detailLines: string[] } | null {
  if (log.entityType !== "Employee" || log.action !== "employee.departmentAssign") return null;
  const m =
    log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};
  const line = idMetaLine("departmentIdBefore", "departmentIdAfter", m);
  return { headline: "Department assignment", detailLines: line ? [line] : [] };
}

export function getOrgMutateDeniedEntitySummary(log: {
  action?: string | null;
  metadata?: Record<string, unknown> | null;
}): { headline: string; detailLines: string[] } | null {
  if (log.action !== "org.mutate.denied") return null;
  const m =
    log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};
  const detailLines: string[] = [];
  if (typeof m.permission === "string") detailLines.push(`Permission: ${m.permission}`);
  if (typeof m.route === "string") detailLines.push(`Route: ${m.route}`);
  return { headline: "Denied org mutation", detailLines };
}
