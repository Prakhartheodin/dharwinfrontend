"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { isPublicLayoutPath } from "@/shared/lib/public-layout-paths";
import {
  getRequiredPermissionForPath,
  hasPermissionForPath,
  canAccessPath,
} from "@/shared/lib/route-permissions";
import { isDesignatedSuperadminPath } from "@/shared/lib/designated-superadmin-paths";
import { usePathname, useRouter } from "next/navigation";

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

function PermissionGuardInner({
  children,
  redirectTo,
  renderChrome,
}: PermissionGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    permissions: userPermissions,
    permissionsLoaded,
    isDesignatedSuperadmin,
  } = useAuth();

  const targetRedirect =
    redirectTo ?? `${ROUTES.defaultAfterLogin}?unauthorized=1`;

  const allowed = useMemo(() => {
    if (!permissionsLoaded) return null;
    if (isPublicLayoutPath(pathname ?? "")) return true;
    const n = (pathname ?? "").replace(/\/$/, "") || "/";
    // platformSuperUser receives the full union of active-role permissions from the
    // server (see getMyPermissionsForFrontend), so a plain prefix check is enough.
    // The Administrator role does NOT auto-bypass here: removing a module permission
    // from Administrator must take effect immediately on this guard, the sidebar,
    // and the API. Strict prefix matching keeps the three layers in sync.
    if (n === "/logs/logs-activity") {
      return (
        isDesignatedSuperadmin ||
        hasPermissionForPath(userPermissions, "logs.activity:")
      );
    }
    if (isDesignatedSuperadminPath(pathname ?? "")) {
      return isDesignatedSuperadmin;
    }
    const required = getRequiredPermissionForPath(pathname ?? "");
    if (required == null) return true;
    return canAccessPath(userPermissions, pathname ?? "");
  }, [
    permissionsLoaded,
    pathname,
    userPermissions,
    isDesignatedSuperadmin,
  ]);

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

  if (renderChrome) {
    if (!permissionsLoaded || allowed === null) {
      return <>{renderChrome(loadingContent)}</>;
    }
    if (allowed === false) {
      return <>{renderChrome(null)}</>;
    }
    return <>{renderChrome(children)}</>;
  }

  if (!permissionsLoaded || allowed === null) {
    return <>{loadingContent}</>;
  }
  if (allowed === false) {
    return null;
  }
  return <>{children}</>;
}

/**
 * Protects routes by permission (see route-permissions.ts).
 */
export function PermissionGuard(props: PermissionGuardProps) {
  return <PermissionGuardInner {...props} />;
}
