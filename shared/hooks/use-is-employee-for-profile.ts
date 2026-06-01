"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import { userCanListRoles } from "@/shared/lib/permissions";
import type { Role } from "@/shared/lib/types";
import { isEmployeeOnly } from "@/shared/lib/persona";

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
 * True when the user should call `getMyCandidate` (employee-only persona,
 * no staff capability). Routes through `isEmployeeOnly` so the gate stays
 * consistent with `useHasEmployeeRole` and the auth-context post-login redirect.
 */
export function useIsEmployeeForProfile(): { isEmployee: boolean; isLoading: boolean } {
  const {
    user,
    roleNames,
    permissionsLoaded,
    permissions,
    isAdministrator,
    isPlatformSuperUser,
  } = useAuth();
  const [isEmployee, setIsEmployee] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const applyFromRoleNames = (names: string[]) => {
      const isCandidateFlag =
        (user as { isCandidate?: boolean } | null | undefined)?.isCandidate ?? null;
      const onlyEmployee = isEmployeeOnly({
        userRole: user?.role,
        roleNames: names,
        permissions,
        isAdministrator,
        isPlatformSuperUser,
        isCandidateFlag,
      });
      setIsEmployee(onlyEmployee);
    };

    const load = async () => {
      try {
        if (!user) {
          if (!cancelled) {
            setIsEmployee(false);
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
            setIsEmployee(true);
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
        if (!cancelled) setIsEmployee(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, permissionsLoaded, roleNames, permissions, isAdministrator, isPlatformSuperUser]);

  return { isEmployee, isLoading };
}
