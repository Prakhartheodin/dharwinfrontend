"use client";

import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import {
  getRequiredPermissionForPath,
  hasPermissionForPath,
  canAccessCourses,
  canAccessAttendance,
  canAccessMyProjects,
  canAccessMyTasks,
  COURSES_PERMISSION_PREFIX,
  ATTENDANCE_PERMISSION_PREFIX,
  PROJECT_PROJECTS_PREFIX,
  PROJECT_TASKS_PREFIX,
} from "@/shared/lib/route-permissions";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

interface PermissionGuardProps {
  children: ReactNode;
  /** Where to redirect when user has no permission; default dashboard with ?unauthorized=1 */
  redirectTo?: string;
}

/**
 * Protects routes by permission: if the current path requires a permission prefix
 * (see route-permissions.ts) and the user does not have it, redirects to redirectTo.
 * Renders children only when the user is allowed to access the current path.
 */
export function PermissionGuard({
  children,
  redirectTo,
}: PermissionGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const targetRedirect =
    redirectTo ?? `${ROUTES.defaultAfterLogin}?unauthorized=1`;

  // Load permissions and role names from user's roleIds
  useEffect(() => {
    const load = async () => {
      if (!user?.roleIds?.length) {
        setUserPermissions([]);
        setRoleNames([]);
        setPermissionsLoaded(true);
        return;
      }
      try {
        const res = await rolesApi.listRoles({ limit: 100 });
        const roles = (res.results ?? []) as Role[];
        const roleMap = new Map(roles.map((r) => [r.id, r]));
        const perms = new Set<string>();
        const names: string[] = [];
        (user.roleIds as string[]).forEach((id) => {
          const role = roleMap.get(id);
          role?.permissions?.forEach((p) => perms.add(p));
          if (role?.name) names.push(role.name);
        });
        setUserPermissions(Array.from(perms));
        setRoleNames(names);
      } catch {
        setUserPermissions([]);
        setRoleNames([]);
      } finally {
        setPermissionsLoaded(true);
      }
    };
    load();
  }, [user?.roleIds]);

  // Decide if current path is allowed
  useEffect(() => {
    if (!permissionsLoaded) {
      setAllowed(null);
      return;
    }
    const required = getRequiredPermissionForPath(pathname ?? "");
    if (required == null) {
      setAllowed(true);
      return;
    }
    // Courses: allow if user has candidate.courses:* OR has Candidate role
    if (required === COURSES_PERMISSION_PREFIX) {
      setAllowed(canAccessCourses(userPermissions, roleNames));
      return;
    }
    // Attendance: allow if user has training.attendance:* / students.read|manage OR has Student role
    if (required === ATTENDANCE_PERMISSION_PREFIX) {
      setAllowed(canAccessAttendance(userPermissions, roleNames));
      return;
    }
    // My Projects: allow if user has project.projects:* OR has Student role
    if (required === PROJECT_PROJECTS_PREFIX && (pathname ?? "").includes("/apps/projects/my-projects")) {
      setAllowed(canAccessMyProjects(userPermissions, roleNames));
      return;
    }
    // My Tasks: allow if user has project.tasks:* OR has Student/Candidate role
    if (required === PROJECT_TASKS_PREFIX && (pathname ?? "").includes("/task/my-tasks")) {
      setAllowed(canAccessMyTasks(userPermissions, roleNames));
      return;
    }
    // Candidates: allow if user has ats.candidates:* OR is a candidate (role 'user') editing own profile
    if (required === "ats.candidates:") {
      const hasCandidatesPermission = hasPermissionForPath(userPermissions, required);
      const isCandidate = user?.role === "user";
      const isOwnProfileEdit = (pathname ?? "").includes("/ats/candidates/edit");
      setAllowed(hasCandidatesPermission || (isCandidate && isOwnProfileEdit));
      return;
    }
    setAllowed(hasPermissionForPath(userPermissions, required));
  }, [permissionsLoaded, pathname, userPermissions, roleNames]);

  // Redirect when not allowed
  useEffect(() => {
    if (allowed === false) {
      router.replace(targetRedirect);
    }
  }, [allowed, targetRedirect, router]);

  if (!permissionsLoaded || allowed === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="ti-btn ti-btn-primary ti-btn-loading">Checking access...</div>
      </div>
    );
  }

  if (allowed === false) {
    return null;
  }

  return <>{children}</>;
}
