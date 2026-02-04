"use client";

import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import {
  getRequiredPermissionForPath,
  hasPermissionForPath,
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
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const targetRedirect =
    redirectTo ?? `${ROUTES.defaultAfterLogin}?unauthorized=1`;

  // Load permissions from user's roleIds
  useEffect(() => {
    const load = async () => {
      if (!user?.roleIds?.length) {
        setUserPermissions([]);
        setPermissionsLoaded(true);
        return;
      }
      try {
        const res = await rolesApi.listRoles({ limit: 100 });
        const roles = (res.results ?? []) as Role[];
        const roleMap = new Map(roles.map((r) => [r.id, r]));
        const perms = new Set<string>();
        (user.roleIds as string[]).forEach((id) => {
          roleMap.get(id)?.permissions?.forEach((p) => perms.add(p));
        });
        setUserPermissions(Array.from(perms));
      } catch {
        setUserPermissions([]);
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
    setAllowed(hasPermissionForPath(userPermissions, required));
  }, [permissionsLoaded, pathname, userPermissions]);

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
