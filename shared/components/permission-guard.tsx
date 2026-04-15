"use client";

import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { isPublicLayoutPath } from "@/shared/lib/public-layout-paths";
import {
  getRequiredPermissionForPathWithSearch,
  hasMyProjectsWorkspaceAccess,
  hasPermissionForPath,
  PROJECT_MY_PROJECTS_PREFIX,
} from "@/shared/lib/route-permissions";
import { isDesignatedSuperadminPath } from "@/shared/lib/designated-superadmin-paths";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
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

  const searchKey = searchParams?.toString() ?? "";

  const allowed = useMemo(() => {
    if (!permissionsLoaded) return null;
    if (isPublicLayoutPath(pathname ?? "")) return true;
    const n = (pathname ?? "").replace(/\/$/, "") || "/";
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
    const required = getRequiredPermissionForPathWithSearch(pathname ?? "", searchParams);
    if (required == null) return true;
    if (required === PROJECT_MY_PROJECTS_PREFIX) {
      return hasMyProjectsWorkspaceAccess(userPermissions);
    }
    return hasPermissionForPath(userPermissions, required);
  }, [
    permissionsLoaded,
    pathname,
    searchKey,
    userPermissions,
    isAdministrator,
    isPlatformSuperUser,
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
 * Protects routes by permission (see route-permissions.ts). Wrapped in Suspense for useSearchParams (e.g. ?mine=1).
 */
export function PermissionGuard(props: PermissionGuardProps) {
  return (
    <Suspense
      fallback={
        props.renderChrome ? (
          <>{props.renderChrome(
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="ti-btn ti-btn-primary ti-btn-loading">Checking access...</div>
            </div>
          )}</>
        ) : (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="ti-btn ti-btn-primary ti-btn-loading">Checking access...</div>
          </div>
        )
      }
    >
      <PermissionGuardInner {...props} />
    </Suspense>
  );
}
