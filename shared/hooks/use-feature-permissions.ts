"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";
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
 * Loads user roles and aggregates permissions from user.roleIds.
 */
export function useFeaturePermissions(prefix: string): UseFeaturePermissionsResult {
  const { user } = useAuth();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        if (!user || !user.roleIds || (user.roleIds as string[]).length === 0) {
          setUserPermissions([]);
          setIsLoading(false);
          return;
        }
        const res = await rolesApi.listRoles({ limit: 100 });
        const roles = (res.results ?? []) as Role[];
        const roleMap = new Map<string, Role>();
        roles.forEach((r) => roleMap.set(r.id, r));
        const perms = new Set<string>();
        (user.roleIds as string[]).forEach((id) => {
          const role = roleMap.get(id);
          if (!role) return;
          role.permissions?.forEach((p) => perms.add(p));
        });
        setUserPermissions(Array.from(perms));
      } catch {
        setUserPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadPermissions();
  }, [user]);

  const flags = useMemo(
    () => getFeaturePermissions(userPermissions, prefix),
    [userPermissions, prefix]
  );

  return {
    canView: flags.view,
    canCreate: flags.create,
    canEdit: flags.edit,
    canDelete: flags.delete,
    isLoading,
  };
}
