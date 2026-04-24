"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import { userCanListRoles } from "@/shared/lib/permissions";
import type { Role } from "@/shared/lib/types";
import { isEmployeeUserRoleNameLower } from "@/shared/lib/employee-user-role";

function normalizeRoleIdList(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x === "string" || typeof x === "number") return String(x);
      if (x && typeof x === "object") {
        const o = x as { id?: string; _id?: string };
        return String(o.id ?? o._id ?? "");
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * - `hasEmployeeRole`: user has Employee (or legacy `Candidate` / `user`) role in roleIds, staff-only “employee” nav when not Agent/Administrator.
 * - `hasEmployeeProfile`: use for `GET /auth/me/with-candidate` so profile fields load for hybrid users (e.g. Agent+Employee).
 */
export function useHasEmployeeRole(): {
  hasEmployeeRole: boolean;
  hasEmployeeProfile: boolean;
  isLoading: boolean;
} {
  const { user, roleNames, permissionsLoaded, permissions } = useAuth();
  const [hasEmployeeRole, setHasEmployeeRole] = useState(false);
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const applyFromRoleNames = (names: string[]) => {
      const lower = names.map((n) => n.trim().toLowerCase()).filter(Boolean);
      const hasStaffRole = lower.some((n) => n === "agent" || n === "administrator");
      const hasEmployeeRoleName = lower.some((n) => isEmployeeUserRoleNameLower(n));
      const employeeOnly = !hasStaffRole && hasEmployeeRoleName;
      setHasEmployeeRole(employeeOnly);
      setHasEmployeeProfile(hasEmployeeRoleName);
    };

    const load = async () => {
      if (!user) {
        if (!cancelled) {
          setHasEmployeeRole(false);
          setHasEmployeeProfile(false);
          setIsLoading(false);
        }
        return;
      }

      if (!permissionsLoaded) {
        if (!cancelled) setIsLoading(true);
        return;
      }

      const ids = normalizeRoleIdList(user.roleIds);
      if (ids.length === 0) {
        if (!cancelled) {
          setHasEmployeeRole(false);
          setHasEmployeeProfile(false);
          setIsLoading(false);
        }
        return;
      }

      const namesFromAuth = (roleNames ?? []).map((n) => n.trim()).filter(Boolean);
      if (namesFromAuth.length > 0) {
        if (!cancelled) {
          applyFromRoleNames(namesFromAuth);
          setIsLoading(false);
        }
        return;
      }

      if (!userCanListRoles(permissions)) {
        const r = (user.role ?? "").toString().trim().toLowerCase();
        const hasEmployeeRoleName = isEmployeeUserRoleNameLower(r);
        const hasStaffRole = r === "agent" || r === "administrator";
        if (!cancelled) {
          setHasEmployeeRole(!hasStaffRole && hasEmployeeRoleName);
          setHasEmployeeProfile(hasEmployeeRoleName);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await rolesApi.listRoles({ limit: 100 });
        const roles = (res.results ?? []) as Role[];
        const roleMap = new Map<string, Role>();
        roles.forEach((r) => {
          const id = (r as Role & { _id?: string }).id ?? (r as Role & { _id?: string })._id;
          if (id) roleMap.set(String(id), r);
        });

        const resolvedNames = ids
          .map((id) => roleMap.get(id)?.name?.toLowerCase())
          .filter((x): x is string => Boolean(x));

        if (resolvedNames.length > 0) {
          const hasStaffRole = resolvedNames.some((name) => name === "agent" || name === "administrator");
          const hasEmployeeRoleName = resolvedNames.some((name) => isEmployeeUserRoleNameLower(name));
          const employeeOnly = !hasStaffRole && hasEmployeeRoleName;
          if (!cancelled) {
            setHasEmployeeRole(employeeOnly);
            setHasEmployeeProfile(hasEmployeeRoleName);
          }
        } else if (!cancelled) {
          setHasEmployeeRole(false);
          setHasEmployeeProfile(false);
        }
      } catch {
        if (!cancelled) {
          setHasEmployeeRole(false);
          setHasEmployeeProfile(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, permissionsLoaded, roleNames, permissions]);

  return { hasEmployeeRole, hasEmployeeProfile, isLoading };
}
