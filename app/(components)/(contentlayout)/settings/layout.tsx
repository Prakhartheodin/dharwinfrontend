"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "@/shared/lib/constants";
import {
  hasAnySettingsModulePermission,
  hasEmailReadAccess,
  hasJobsReadAccess,
  hasSettingsFeatureAccess,
  hasSettingsUsersManage,
  userCanListRoles,
} from "@/shared/lib/permissions";
import { canAssignCandidateAgent } from "@/shared/lib/candidate-permissions";
import { useAuth } from "@/shared/contexts/auth-context";

function getActiveTab(
  pathname: string
):
  | "roles"
  | "users"
  | "attendance"
  | "agents"
  | "candidate-sop"
  | "personal-information"
  | "email-templates"
  | "job-templates"
  | "email-templates-admin"
  | "bolna-voice-agent"
  | "company-email"
  | null {
  if (pathname.startsWith("/settings/roles")) return "roles";
  if (pathname.startsWith("/settings/users")) return "users";
  if (pathname.startsWith("/settings/attendance")) return "attendance";
  if (pathname.startsWith("/settings/agents")) return "agents";
  if (pathname.startsWith("/settings/company-email")) return "company-email";
  if (pathname.startsWith("/settings/bolna-voice-agent")) return "bolna-voice-agent";
  if (pathname.startsWith("/settings/candidates/sop")) return "candidate-sop";
  if (pathname.startsWith("/settings/email-templates-admin")) return "email-templates-admin";
  if (pathname.startsWith("/settings/email-templates")) return "email-templates";
  if (pathname.startsWith("/settings/job-templates")) return "job-templates";
  if (pathname.startsWith("/settings/personal-information")) return "personal-information";
  return null;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, roleNames, isAdministrator, isPlatformSuperUser, permissions, permissionsLoaded } = useAuth();
  const activeTab = getActiveTab(pathname ?? "");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [hasUsersAccess, setHasUsersAccess] = useState<boolean | null>(null);
  const [hasAttendanceAccess, setHasAttendanceAccess] = useState<boolean | null>(null);
  const [hasCandidateSopAccess, setHasCandidateSopAccess] = useState<boolean | null>(null);
  const [hasCompanyEmailHubAccess, setHasCompanyEmailHubAccess] = useState<boolean | null>(null);

  // Derive tab access from `/auth/my-permissions` (roleNames + permissions). Avoids GET /v1/roles
  // which requires roles.list and returns 403 for many users.
  useEffect(() => {
    try {
      if (isPlatformSuperUser) {
        setIsAdmin(true);
        setHasUsersAccess(true);
        setHasAttendanceAccess(true);
        setHasCandidateSopAccess(true);
        setHasCompanyEmailHubAccess(true);
        return;
      }
      if (!user || !user.roleIds || (user.roleIds as string[]).length === 0) {
        setIsAdmin(false);
        setHasUsersAccess(false);
        setHasAttendanceAccess(false);
        setHasCandidateSopAccess(false);
        setHasCompanyEmailHubAccess(false);
        return;
      }
      if (!permissionsLoaded) {
        return;
      }

      const names = (roleNames ?? []).map((n) => n.trim()).filter(Boolean);
      const roleNameSet = new Set(names);
      const permissionsArray = permissions ?? [];
      const perms = new Set(permissionsArray);

      const admin = roleNameSet.has("Administrator");
      setIsAdmin(admin);
      // Agents and Administrators can access Users; only Administrators can access User Roles
      setHasUsersAccess(admin || roleNameSet.has("Agent"));
      const hasAgentOrAdminRole = roleNameSet.has("Administrator") || roleNameSet.has("Agent");
      const hasStudentsManage = Array.from(perms).some((p) => p === "students.manage" || p.startsWith("students.manage"));
      const hasAttendanceManage = Array.from(perms).some(
        (p) =>
          p === "attendance.manage" ||
          p === "training.attendance:view,create,edit" ||
          (p.includes("training.attendance") && (p.includes("create") || p.includes("edit") || p.includes("view")))
      );
      const hasRelevantPermissions = admin || hasStudentsManage || hasAttendanceManage;
      setHasAttendanceAccess(hasAgentOrAdminRole && hasRelevantPermissions);
      const hasAtsCandidatesManage = Array.from(perms).some(
        (p) =>
          p.includes("ats.candidates") &&
          (p.includes("create") || p.includes("edit") || p.includes("delete"))
      );
      setHasCandidateSopAccess(admin || hasAtsCandidatesManage);
      setHasCompanyEmailHubAccess(canAssignCandidateAgent(permissionsArray, isPlatformSuperUser));
    } catch {
      setIsAdmin(false);
      setHasUsersAccess(false);
      setHasAttendanceAccess(false);
      setHasCandidateSopAccess(false);
      setHasCompanyEmailHubAccess(false);
    }
  }, [user, isPlatformSuperUser, permissionsLoaded, permissions, roleNames]);

  // Redirect: when `settings.*` matrix permissions exist, enforce those; else legacy rules.
  useEffect(() => {
    if (
      isAdmin === null ||
      hasUsersAccess === null ||
      hasAttendanceAccess === null ||
      hasCandidateSopAccess === null ||
      hasCompanyEmailHubAccess === null
    )
      return;
    const raw = permissions ?? [];
    const matrixMode = !isPlatformSuperUser && hasAnySettingsModulePermission(raw);
    if (activeTab === "roles") {
      const can = matrixMode
        ? userCanListRoles(raw)
        : isAdmin || userCanListRoles(raw);
      if (!can) router.replace(ROUTES.settingsPersonalInfo);
    } else if (activeTab === "users") {
      const can = matrixMode
        ? hasSettingsFeatureAccess(raw, "users")
        : hasUsersAccess || hasSettingsFeatureAccess(raw, "users");
      if (!can) router.replace(ROUTES.settingsPersonalInfo);
    } else if (activeTab === "attendance") {
      const can = matrixMode
        ? hasSettingsFeatureAccess(raw, "attendance")
        : hasAttendanceAccess || hasSettingsFeatureAccess(raw, "attendance");
      if (!can) router.replace(ROUTES.settingsPersonalInfo);
    } else if (activeTab === "agents") {
      const can = matrixMode
        ? hasSettingsFeatureAccess(raw, "agents")
        : isAdmin || hasSettingsFeatureAccess(raw, "agents");
      if (!can) router.replace(ROUTES.settingsPersonalInfo);
    } else if (activeTab === "candidate-sop") {
      const can = matrixMode
        ? hasSettingsFeatureAccess(raw, "candidate-sop")
        : hasCandidateSopAccess || hasSettingsFeatureAccess(raw, "candidate-sop");
      if (!can) router.replace(ROUTES.settingsPersonalInfo);
    } else if (activeTab === "email-templates") {
      const can = matrixMode
        ? hasSettingsFeatureAccess(raw, "email-templates")
        : hasEmailReadAccess(raw) || hasSettingsFeatureAccess(raw, "email-templates");
      if (!can) router.replace(ROUTES.settingsPersonalInfo);
    } else if (activeTab === "job-templates") {
      const can =
        hasJobsReadAccess(raw) ||
        hasSettingsFeatureAccess(raw, "job-templates");
      if (!can) router.replace(ROUTES.settingsPersonalInfo);
    } else if (activeTab === "email-templates-admin") {
      const can = matrixMode
        ? hasSettingsFeatureAccess(raw, "email-templates-admin")
        : isAdministrator || hasSettingsFeatureAccess(raw, "email-templates-admin");
      if (!can) router.replace(ROUTES.settingsPersonalInfo);
    } else if (activeTab === "bolna-voice-agent") {
      const can = matrixMode
        ? hasSettingsFeatureAccess(raw, "bolna-voice-agent")
        : isPlatformSuperUser ||
          isAdministrator ||
          (permissionsLoaded && hasSettingsUsersManage(permissions)) ||
          hasSettingsFeatureAccess(raw, "bolna-voice-agent");
      if (!can) router.replace(ROUTES.settingsPersonalInfo);
    } else if (activeTab === "company-email") {
      const can = matrixMode
        ? hasSettingsFeatureAccess(raw, "company-email")
        : hasCompanyEmailHubAccess || hasSettingsFeatureAccess(raw, "company-email");
      if (!can) router.replace(ROUTES.settingsPersonalInfo);
    }
  }, [
    isAdmin,
    hasUsersAccess,
    hasAttendanceAccess,
    hasCandidateSopAccess,
    hasCompanyEmailHubAccess,
    activeTab,
    router,
    roleNames,
    isAdministrator,
    isPlatformSuperUser,
    permissions,
    permissionsLoaded,
  ]);

  const tabClass = (
    tab:
      | "roles"
      | "users"
      | "attendance"
      | "agents"
      | "candidate-sop"
      | "personal-information"
      | "email-templates"
      | "job-templates"
      | "email-templates-admin"
      | "bolna-voice-agent"
      | "company-email"
  ) =>
    `m-1 block w-full py-2 px-3 flex-grow text-[0.75rem] font-medium rounded-md hover:text-primary ${
      activeTab === tab
        ? "bg-primary/10 text-primary"
        : "text-defaulttextcolor dark:text-defaulttextcolor/70"
    }`;

  const rawPerms = permissions ?? [];
  /** When the token includes any `settings.*` string, tab strip follows the role matrix, not heuristics. */
  const settingsMatrixMode = !isPlatformSuperUser && hasAnySettingsModulePermission(rawPerms);
  const showRolesTab = settingsMatrixMode
    ? userCanListRoles(rawPerms)
    : isAdmin === true || userCanListRoles(rawPerms);
  const showUsersTab = settingsMatrixMode
    ? hasSettingsFeatureAccess(rawPerms, "users")
    : hasUsersAccess === true || hasSettingsFeatureAccess(rawPerms, "users");
  const showAttendanceTab = settingsMatrixMode
    ? hasSettingsFeatureAccess(rawPerms, "attendance")
    : hasAttendanceAccess === true || hasSettingsFeatureAccess(rawPerms, "attendance");
  const showAgentsTab = settingsMatrixMode
    ? hasSettingsFeatureAccess(rawPerms, "agents")
    : isAdmin === true || hasSettingsFeatureAccess(rawPerms, "agents");
  const showCompanyEmailTab = settingsMatrixMode
    ? hasSettingsFeatureAccess(rawPerms, "company-email")
    : hasCompanyEmailHubAccess === true || hasSettingsFeatureAccess(rawPerms, "company-email");
  const showCandidateSopTab = settingsMatrixMode
    ? hasSettingsFeatureAccess(rawPerms, "candidate-sop")
    : hasCandidateSopAccess === true || hasSettingsFeatureAccess(rawPerms, "candidate-sop");
  const showEmailTemplatesTab = settingsMatrixMode
    ? hasSettingsFeatureAccess(rawPerms, "email-templates")
    : hasEmailReadAccess(rawPerms) || hasSettingsFeatureAccess(rawPerms, "email-templates");
  /** Same idea as ATS Jobs: `jobs.read` / `ats.jobs:*` — not only `settings.job-templates` (matrix roles often lack that grant). */
  const showJobTemplatesTab =
    hasJobsReadAccess(rawPerms) || hasSettingsFeatureAccess(rawPerms, "job-templates");
  const showEmailTemplatesAdminTab = settingsMatrixMode
    ? hasSettingsFeatureAccess(rawPerms, "email-templates-admin")
    : isAdministrator || hasSettingsFeatureAccess(rawPerms, "email-templates-admin");

  return (
    <div className="container w-full max-w-full mx-auto">
      <div className="grid grid-cols-12 gap-6 mb-[3rem]">
        <div className="xl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-header sm:flex block !justify-start">
              <nav
                aria-label="Settings tabs"
                className="md:flex block !justify-start whitespace-nowrap"
                role="tablist"
              >
                {showRolesTab && (
                  <Link
                    href={ROUTES.settingsRoles}
                    className={tabClass("roles")}
                    aria-current={activeTab === "roles" ? "page" : undefined}
                  >
                    User Roles
                  </Link>
                )}
                {showUsersTab && (
                  <Link
                    href={ROUTES.settingsUsers}
                    className={tabClass("users")}
                    aria-current={activeTab === "users" ? "page" : undefined}
                  >
                    Users
                  </Link>
                )}
                {showAttendanceTab && (
                  <Link
                    href={ROUTES.settingsAttendance}
                    className={tabClass("attendance")}
                    aria-current={activeTab === "attendance" ? "page" : undefined}
                  >
                    Attendance
                  </Link>
                )}
                {showAgentsTab && (
                  <Link
                    href={ROUTES.settingsAgents}
                    className={tabClass("agents")}
                    aria-current={activeTab === "agents" ? "page" : undefined}
                  >
                    Agents
                  </Link>
                )}
                {showCompanyEmailTab && (
                  <Link
                    href={ROUTES.settingsCompanyEmail}
                    className={tabClass("company-email")}
                    aria-current={activeTab === "company-email" ? "page" : undefined}
                  >
                    Company work email
                  </Link>
                )}
                {showCandidateSopTab && (
                  <Link
                    href={ROUTES.settingsCandidateSop}
                    className={tabClass("candidate-sop")}
                    aria-current={activeTab === "candidate-sop" ? "page" : undefined}
                  >
                    Employee SOP
                  </Link>
                )}
                {showEmailTemplatesTab && (
                  <Link
                    href={ROUTES.settingsEmailTemplates}
                    className={tabClass("email-templates")}
                    aria-current={activeTab === "email-templates" ? "page" : undefined}
                    title="Your own templates and signature for Communication → Email"
                  >
                    My email templates
                  </Link>
                )}
                {showJobTemplatesTab && (
                  <Link
                    href={ROUTES.settingsJobTemplates}
                    className={tabClass("job-templates")}
                    aria-current={activeTab === "job-templates" ? "page" : undefined}
                    title="Saved job descriptions for ATS → Create job → Load from template"
                  >
                    My jobs template
                  </Link>
                )}
                {showEmailTemplatesAdminTab && (
                  <Link
                    href={ROUTES.settingsEmailTemplatesAdmin}
                    className={tabClass("email-templates-admin")}
                    aria-current={activeTab === "email-templates-admin" ? "page" : undefined}
                    title="Administrator: edit templates and signatures for any agent"
                  >
                    All agents&apos; email templates (admin)
                  </Link>
                )}
                <Link
                  href={ROUTES.settingsPersonalInfo}
                  className={tabClass("personal-information")}
                  aria-current={activeTab === "personal-information" ? "page" : undefined}
                >
                  Personal Information
                </Link>
              </nav>
            </div>
            <div>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
