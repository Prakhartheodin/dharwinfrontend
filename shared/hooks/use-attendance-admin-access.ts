"use client";

import { useMemo } from "react";
import { useAuth } from "@/shared/contexts/auth-context";

/**
 * Gates Attendance settings pages that previously called listRoles() to map roleIds → names.
 * Uses role names from GET /auth/my-permissions (same session load) to avoid an extra network round-trip per page.
 *
 * @returns null while permissions are loading; then true if user has Administrator or Agent role, else false.
 */
export function useAttendanceAdminAccess(): boolean | null {
  const { user, roleNames, permissionsLoaded } = useAuth();
  return useMemo(() => {
    if (!permissionsLoaded) return null;
    if (!user?.roleIds?.length) return false;
    return roleNames.some((n) => n === "Administrator" || n === "Agent");
  }, [permissionsLoaded, user, roleNames]);
}
