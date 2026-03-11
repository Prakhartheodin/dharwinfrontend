"use client";

import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import {
  getRequiredPermissionForPath,
  hasPermissionForPath,
} from "@/shared/lib/route-permissions";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";

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
  const { permissions: userPermissions, permissionsLoaded } = useAuth();

  const targetRedirect =
    redirectTo ?? `${ROUTES.defaultAfterLogin}?unauthorized=1`;

  const allowed = useMemo(() => {
    if (!permissionsLoaded) return null;
    const required = getRequiredPermissionForPath(pathname ?? "");
    if (required == null) return true;
    return hasPermissionForPath(userPermissions, required);
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
