"use client";

import { useMemo } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { getFeaturePermissions } from "@/shared/lib/feature-permissions";

export interface UseFeaturePermissionsResult {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** True while roles/permissions are being loaded. */
  isLoading: boolean;
}

/**
 * Returns feature-level permissions (view, create, edit, delete) for the current user
 * for the given permission prefix (e.g. "ats.jobs" or "ats.jobs:").
 * Reads permissions from auth context (resolved via GET /auth/my-permissions).
 */
export function useFeaturePermissions(prefix: string): UseFeaturePermissionsResult {
  const { permissions: userPermissions, permissionsLoaded } = useAuth();

  const flags = useMemo(
    () => getFeaturePermissions(userPermissions, prefix),
    [userPermissions, prefix]
  );

  return {
    canView: flags.view,
    canCreate: flags.create,
    canEdit: flags.edit,
    canDelete: flags.delete,
    isLoading: !permissionsLoaded,
  };
}
