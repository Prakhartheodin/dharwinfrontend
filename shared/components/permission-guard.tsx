"use client";

import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { isPublicLayoutPath } from "@/shared/lib/public-layout-paths";
import {
  getRequiredPermissionForPath,
  hasPermissionForPath,
} from "@/shared/lib/route-permissions";
import { isDesignatedSuperadminPath } from "@/shared/lib/designated-superadmin-paths";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";

interface PermissionGuardProps {
  children: ReactNode;
  /** Where to redirect when user has no permission; default dashboard with ?unauthorized=1 */
  redirectTo?: string;
  /**
   * When provided, renders the layout chrome (nav, header, sidebar, etc.) even during
   * permission check. The chrome receives the main content area: loading state or children.
   * This ensures users with permission always see the nav bar.
   */
  renderChrome?: (content: ReactNode) => ReactNode;
}

/**
 * Protects routes by permission: if the current path requires a permission prefix
 * (see route-permissions.ts) and the user does not have it, redirects to redirectTo.
 * Renders children only when the user is allowed to access the current path.
 * When renderChrome is provided, the nav bar and layout remain visible during the check.
 */
export function PermissionGuard({
  children,
  redirectTo,
  renderChrome,
}: PermissionGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    permissions: userPermissions,
    permissionsLoaded,
    isAdministrator,
    isPlatformSuperUser,
    isDesignatedSuperadmin,
  } = useAuth();

  const targetRedirect =
    redirectTo ?? `${ROUTES.defaultAfterLogin}?unauthorized=1`;

  const allowed = useMemo(() => {
    if (!permissionsLoaded) return null;
    if (isPublicLayoutPath(pathname ?? "")) return true;
    const n = (pathname ?? "").replace(/\/$/, "") || "/";
    // Standard activity logs: admins, platform super, role permission, or designated operator email.
    if (n === "/logs/logs-activity") {
      return (
        isDesignatedSuperadmin ||
        isAdministrator ||
        isPlatformSuperUser ||
        hasPermissionForPath(userPermissions, "logs.activity:")
      );
    }
    if (isDesignatedSuperadminPath(pathname ?? "")) {
      return isDesignatedSuperadmin;
    }
    if (isAdministrator || isPlatformSuperUser) return true;
    const required = getRequiredPermissionForPath(pathname ?? "");
    if (required == null) return true;
    return hasPermissionForPath(userPermissions, required);
  }, [
    permissionsLoaded,
    pathname,
    userPermissions,
    isAdministrator,
    isPlatformSuperUser,
    isDesignatedSuperadmin,
  ]);

  // Redirect when not allowed
  useEffect(() => {
    if (allowed === false) {
      router.replace(targetRedirect);
    }
  }, [allowed, targetRedirect, router]);

  const loadingContent = (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="ti-btn ti-btn-primary ti-btn-loading">Checking access...</div>
    </div>
  );

  // When renderChrome is provided, show nav bar even during permission check
  if (renderChrome) {
    if (!permissionsLoaded || allowed === null) {
      return <>{renderChrome(loadingContent)}</>;
    }
    if (allowed === false) {
      return <>{renderChrome(null)}</>;
    }
    return <>{renderChrome(children)}</>;
  }

  // Legacy: no chrome, full replace
  if (!permissionsLoaded || allowed === null) {
    return <>{loadingContent}</>;
  }
  if (allowed === false) {
    return null;
  }
  return <>{children}</>;
}
