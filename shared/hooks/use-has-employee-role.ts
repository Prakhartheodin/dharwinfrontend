"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import { userCanListRoles } from "@/shared/lib/permissions";
import type { Role } from "@/shared/lib/types";
import { isEmployeeUserRoleNameLower } from "@/shared/lib/employee-user-role";
import { hasStaffAccess, isCandidatePersona } from "@/shared/lib/persona";

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
 * - `hasEmployeeRole`: user resolves to employee persona AND holds no staff capability.
 *   Drives staff-only "employee" nav.
 * - `hasEmployeeProfile`: user resolves to employee persona regardless of staff capability
 *   (hybrid Agent+Employee should still load `/auth/me/with-candidate`).
 *
 * Staff is detected via permission probe + `isAdministrator` / `isPlatformSuperUser`,
 * not via role-name string match. Persona prefers a backend `isCandidate` flag
 * when present and otherwise maps `roleNames` through `isEmployeeUserRoleNameLower`.
 */
export function useHasEmployeeRole(): {
  hasEmployeeRole: boolean;
  hasEmployeeProfile: boolean;
  isLoading: boolean;
} {
  const {
    user,
    roleNames,
    permissionsLoaded,
    permissions,
    isAdministrator,
    isPlatformSuperUser,
  } = useAuth();
  const [hasEmployeeRole, setHasEmployeeRole] = useState(false);
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const applyFromRoleNames = (names: string[]) => {
      const isCandidateFlag =
        (user as { isCandidate?: boolean } | null | undefined)?.isCandidate ?? null;
      const personaInput = {
        userRole: user?.role,
        roleNames: names,
        permissions,
        isAdministrator,
        isPlatformSuperUser,
        isCandidateFlag,
      };
      const staff = hasStaffAccess(personaInput);
      const personaIsEmployee =
        isCandidateFlag === true ||
        (isCandidateFlag !== false &&
          (names.some((n) => isEmployeeUserRoleNameLower(n.toLowerCase())) ||
            isCandidatePersona(personaInput)));
      setHasEmployeeRole(!staff && personaIsEmployee);
      setHasEmployeeProfile(personaIsEmployee);
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
        if (!cancelled) {
          applyFromRoleNames([]);
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
          .map((id) => roleMap.get(id)?.name)
          .filter((x): x is string => Boolean(x));

        if (!cancelled) {
          applyFromRoleNames(resolvedNames);
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
  }, [user, permissionsLoaded, roleNames, permissions, isAdministrator, isPlatformSuperUser]);

  return { hasEmployeeRole, hasEmployeeProfile, isLoading };
}
